ALTER TABLE public.penjualan ADD COLUMN IF NOT EXISTS pembelian_id uuid REFERENCES public.pembelian(id);
CREATE INDEX IF NOT EXISTS idx_penjualan_pembelian_id ON public.penjualan(pembelian_id);

CREATE OR REPLACE FUNCTION public.pembelian_tersedia(_hanya_sisa boolean DEFAULT true)
RETURNS TABLE(
  id uuid, tanggal date, jenis_ikan text, petani_id uuid, nama_petani text,
  box numeric, faktor_box numeric, sisa_kg numeric, jumlah_kg numeric,
  harga_per_kg numeric, total_harga numeric,
  kg_terjual numeric, kg_sisa numeric, status_jual text
)
LANGUAGE sql STABLE SET search_path TO 'public'
AS $$
  WITH t AS (
    SELECT s.pembelian_id AS pid, COALESCE(sum(s.berat_kg),0) AS kg
    FROM public.penjualan s WHERE s.pembelian_id IS NOT NULL GROUP BY 1
  )
  SELECT b.id, b.tanggal, b.jenis_ikan, b.petani_id, p.nama,
         b.box, b.faktor_box, b.sisa_kg, b.jumlah_kg,
         b.harga_per_kg, b.total_harga,
         COALESCE(t.kg,0),
         GREATEST(b.jumlah_kg - COALESCE(t.kg,0), 0),
         CASE WHEN COALESCE(t.kg,0) <= 0 THEN 'belum'
              WHEN b.jumlah_kg - COALESCE(t.kg,0) > 0.001 THEN 'sebagian'
              ELSE 'terjual' END
  FROM public.pembelian b
  LEFT JOIN public.petani p ON p.id = b.petani_id
  LEFT JOIN t ON t.pid = b.id
  WHERE b.status_transaksi = 'disetujui'
    AND (NOT _hanya_sisa OR b.jumlah_kg - COALESCE(t.kg,0) > 0.001)
  ORDER BY b.tanggal DESC, b.created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.pembelian_tersedia(boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.pembelian_tersedia(boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.cek_stok_penjualan()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $$
DECLARE _masuk numeric; _keluar numeric; _lot numeric; _terjual numeric;
BEGIN
  IF NEW.berat_kg IS NULL OR NEW.berat_kg <= 0 THEN
    RAISE EXCEPTION 'Berat terjual harus lebih dari 0';
  END IF;

  IF NEW.pembelian_id IS NOT NULL THEN
    SELECT jumlah_kg INTO _lot FROM public.pembelian WHERE id = NEW.pembelian_id;
    IF _lot IS NULL THEN RAISE EXCEPTION 'Transaksi pembelian tidak ditemukan'; END IF;
    SELECT COALESCE(sum(berat_kg),0) INTO _terjual FROM public.penjualan
      WHERE pembelian_id = NEW.pembelian_id AND id <> NEW.id;
    IF NEW.berat_kg > (_lot - _terjual) + 0.001 THEN
      RAISE EXCEPTION 'Sisa lot pembelian hanya % Kg', round(_lot - _terjual, 2);
    END IF;
    RETURN NEW;
  END IF;

  SELECT COALESCE(sum(jumlah_kg),0) INTO _masuk FROM public.pembelian
   WHERE lower(jenis_ikan) = lower(NEW.jenis_ikan);
  SELECT COALESCE(sum(berat_kg),0) INTO _keluar FROM public.penjualan
   WHERE lower(jenis_ikan) = lower(NEW.jenis_ikan) AND id <> NEW.id;
  IF NEW.berat_kg > (_masuk - _keluar) + 0.001 THEN
    RAISE EXCEPTION 'Stok % tidak cukup. Sisa stok % Kg', NEW.jenis_ikan, round(_masuk - _keluar, 2);
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.create_penjualan_dari_pembelian(
  _pembelian_id uuid,
  _pelanggan_id uuid,
  _berat_kg numeric,
  _harga_per_kg numeric,
  _tanggal date DEFAULT CURRENT_DATE,
  _status_bayar status_bayar DEFAULT 'lunas'::status_bayar,
  _jumlah_dibayar numeric DEFAULT 0,
  _jumlah_ekor integer DEFAULT 0,
  _ukuran text DEFAULT NULL,
  _grade text DEFAULT NULL,
  _kolam text DEFAULT NULL,
  _catatan text DEFAULT NULL,
  _foto_timbangan_url text DEFAULT NULL,
  _foto_nota_url text DEFAULT NULL
) RETURNS public.penjualan
LANGUAGE plpgsql SET search_path TO 'public'
AS $$
DECLARE _b public.pembelian; _terjual numeric; _sisa numeric; _total numeric; _bayar numeric; _row public.penjualan;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO _b FROM public.pembelian WHERE id = _pembelian_id;
  IF _b.id IS NULL THEN RAISE EXCEPTION 'Transaksi pembelian tidak ditemukan'; END IF;
  IF _berat_kg IS NULL OR _berat_kg <= 0 THEN RAISE EXCEPTION 'Berat jual harus lebih dari 0'; END IF;
  IF _harga_per_kg IS NULL OR _harga_per_kg <= 0 THEN RAISE EXCEPTION 'Harga jual per kg harus lebih dari 0'; END IF;

  SELECT COALESCE(sum(berat_kg),0) INTO _terjual FROM public.penjualan WHERE pembelian_id = _pembelian_id;
  _sisa := _b.jumlah_kg - _terjual;
  IF _berat_kg > _sisa + 0.001 THEN
    RAISE EXCEPTION 'Sisa lot pembelian hanya % Kg', round(_sisa, 2);
  END IF;

  _total := round(_berat_kg * _harga_per_kg, 2);
  IF _status_bayar = 'lunas' THEN _bayar := _total;
  ELSIF _status_bayar = 'belum' THEN _bayar := 0;
  ELSE
    IF _jumlah_dibayar <= 0 OR _jumlah_dibayar >= _total THEN
      RAISE EXCEPTION 'Jumlah dibayar harus > 0 dan < total';
    END IF;
    _bayar := _jumlah_dibayar;
  END IF;

  INSERT INTO public.penjualan (tanggal, pelanggan_id, pembelian_id, jenis_ikan, berat_kg, harga_per_kg,
    jumlah_ekor, ukuran, grade, kolam, metode, status_bayar, jumlah_dibayar, status_transaksi,
    catatan, foto_timbangan_url, foto_nota_url, dicatat_oleh)
  VALUES (COALESCE(_tanggal, CURRENT_DATE), _pelanggan_id, _pembelian_id, _b.jenis_ikan, _berat_kg, _harga_per_kg,
    _jumlah_ekor, _ukuran, _grade, _kolam, 'tunai', _status_bayar, _bayar, 'disetujui',
    _catatan, _foto_timbangan_url, _foto_nota_url, auth.uid())
  RETURNING * INTO _row;

  IF _bayar > 0 THEN
    INSERT INTO public.pembayaran (tipe, referensi_id, jumlah, dicatat_oleh)
    VALUES ('terima_pembeli', _row.id, _bayar, auth.uid());
  END IF;

  RETURN _row;
END; $$;

REVOKE ALL ON FUNCTION public.create_penjualan_dari_pembelian(uuid,uuid,numeric,numeric,date,status_bayar,numeric,integer,text,text,text,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_penjualan_dari_pembelian(uuid,uuid,numeric,numeric,date,status_bayar,numeric,integer,text,text,text,text,text,text) TO authenticated;