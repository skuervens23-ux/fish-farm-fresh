-- 1) Area privat (tidak diekspos ke Data API)
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

-- 2) Pindahkan fungsi SECURITY DEFINER ke schema private
CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION private.kontak_petani()
RETURNS TABLE(id uuid, telepon text, alamat text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.telepon, p.alamat FROM public.petani p
  WHERE private.has_role(auth.uid(), 'owner');
$$;

CREATE OR REPLACE FUNCTION private.kontak_pelanggan()
RETURNS TABLE(id uuid, telepon text, alamat text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.telepon, p.alamat FROM public.pelanggan p
  WHERE private.has_role(auth.uid(), 'owner');
$$;

CREATE OR REPLACE FUNCTION private.bayar_hutang(_pembelian_id uuid, _jumlah numeric)
RETURNS public.pembelian LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _row public.pembelian;
  _sisa numeric;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _jumlah IS NULL OR _jumlah <= 0 THEN RAISE EXCEPTION 'Jumlah bayar harus lebih dari 0'; END IF;

  SELECT * INTO _row FROM public.pembelian WHERE id = _pembelian_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pembelian tidak ditemukan'; END IF;

  -- hanya pencatat transaksi atau owner yang boleh melunasi
  IF NOT (_row.dicatat_oleh = auth.uid() OR private.has_role(auth.uid(), 'owner')) THEN
    RAISE EXCEPTION 'Tidak punya izin melunasi transaksi ini';
  END IF;

  _sisa := _row.total_harga - _row.jumlah_dibayar;
  IF _sisa <= 0 THEN RAISE EXCEPTION 'Pembelian sudah lunas'; END IF;
  IF _jumlah > _sisa THEN RAISE EXCEPTION 'Jumlah bayar melebihi sisa hutang'; END IF;

  UPDATE public.pembelian
  SET jumlah_dibayar = jumlah_dibayar + _jumlah,
      status_bayar = CASE WHEN jumlah_dibayar + _jumlah >= total_harga THEN 'lunas'::status_bayar ELSE 'sebagian'::status_bayar END
  WHERE id = _pembelian_id
  RETURNING * INTO _row;

  INSERT INTO public.pembayaran (tipe, referensi_id, jumlah, dicatat_oleh)
  VALUES ('bayar_petani', _pembelian_id, _jumlah, auth.uid());

  RETURN _row;
END;
$$;

REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.kontak_petani() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.kontak_pelanggan() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.bayar_hutang(uuid, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.kontak_petani() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.kontak_pelanggan() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.bayar_hutang(uuid, numeric) TO authenticated, service_role;

-- 3) Fungsi publik kini SECURITY INVOKER (pembungkus tipis), RLS tetap aman
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT private.has_role(_user_id, _role);
$$;

CREATE OR REPLACE FUNCTION public.kontak_petani()
RETURNS TABLE(id uuid, telepon text, alamat text)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT * FROM private.kontak_petani();
$$;

CREATE OR REPLACE FUNCTION public.kontak_pelanggan()
RETURNS TABLE(id uuid, telepon text, alamat text)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT * FROM private.kontak_pelanggan();
$$;

CREATE OR REPLACE FUNCTION public.bayar_hutang(_pembelian_id uuid, _jumlah numeric)
RETURNS public.pembelian LANGUAGE sql SECURITY INVOKER SET search_path = public AS $$
  SELECT * FROM private.bayar_hutang(_pembelian_id, _jumlah);
$$;

REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.kontak_petani() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.kontak_pelanggan() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.bayar_hutang(uuid, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.kontak_petani() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.kontak_pelanggan() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.bayar_hutang(uuid, numeric) TO authenticated, service_role;

-- 4) Foto nota: hanya pengunggah atau owner yang boleh melihat
DROP POLICY IF EXISTS "Auth lihat nota" ON storage.objects;
CREATE POLICY "Lihat nota sendiri atau owner" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'nota'
  AND (
    (storage.foldername(name))[1] = (auth.uid())::text
    OR public.has_role(auth.uid(), 'owner')
  )
);

-- 5) Owner boleh menghapus pengaturan
CREATE POLICY "Owner delete pengaturan" ON public.pengaturan
FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'owner'));
GRANT DELETE ON public.pengaturan TO authenticated;