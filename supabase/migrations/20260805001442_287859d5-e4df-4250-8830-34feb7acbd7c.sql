-- 1. Scope transaction reads to the recorder or owner
DROP POLICY IF EXISTS "Auth read pembelian" ON public.pembelian;
CREATE POLICY "Read own or owner pembelian" ON public.pembelian
FOR SELECT TO authenticated
USING (dicatat_oleh = auth.uid() OR public.has_role(auth.uid(), 'owner'));

DROP POLICY IF EXISTS "Auth read penjualan" ON public.penjualan;
CREATE POLICY "Read own or owner penjualan" ON public.penjualan
FOR SELECT TO authenticated
USING (dicatat_oleh = auth.uid() OR public.has_role(auth.uid(), 'owner'));

DROP POLICY IF EXISTS "Auth read kas" ON public.kas;
CREATE POLICY "Read own or owner kas" ON public.kas
FOR SELECT TO authenticated
USING (dicatat_oleh = auth.uid() OR public.has_role(auth.uid(), 'owner'));

DROP POLICY IF EXISTS "Auth read pembayaran" ON public.pembayaran;
CREATE POLICY "Read own or owner pembayaran" ON public.pembayaran
FOR SELECT TO authenticated
USING (dicatat_oleh = auth.uid() OR public.has_role(auth.uid(), 'owner'));

-- 2. Profiles: own row or owner only
DROP POLICY IF EXISTS "Authenticated read profiles" ON public.profiles;
CREATE POLICY "Read own profile or owner" ON public.profiles
FOR SELECT TO authenticated
USING (id = auth.uid() OR public.has_role(auth.uid(), 'owner'));

-- 3. Hide partner contact columns from regular authenticated reads
REVOKE SELECT ON public.petani FROM authenticated;
GRANT SELECT (id, nama, is_active, created_by, created_at) ON public.petani TO authenticated;
REVOKE ALL ON public.petani FROM anon;

REVOKE SELECT ON public.pelanggan FROM authenticated;
GRANT SELECT (id, nama, is_active, created_by, created_at, updated_at) ON public.pelanggan TO authenticated;
REVOKE ALL ON public.pelanggan FROM anon;

CREATE OR REPLACE FUNCTION public.kontak_petani()
RETURNS TABLE (id uuid, telepon text, alamat text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.telepon, p.alamat
  FROM public.petani p
  WHERE public.has_role(auth.uid(), 'owner');
$$;

CREATE OR REPLACE FUNCTION public.kontak_pelanggan()
RETURNS TABLE (id uuid, telepon text, alamat text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.telepon, p.alamat
  FROM public.pelanggan p
  WHERE public.has_role(auth.uid(), 'owner');
$$;

-- 4. Function execute privileges
REVOKE ALL ON FUNCTION public.kontak_petani() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.kontak_pelanggan() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.kontak_petani() TO authenticated;
GRANT EXECUTE ON FUNCTION public.kontak_pelanggan() TO authenticated;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

REVOKE ALL ON FUNCTION public.bayar_hutang(uuid, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bayar_hutang(uuid, numeric) TO authenticated;

REVOKE ALL ON FUNCTION public.create_pembelian(uuid, text, numeric, numeric, public.status_bayar, numeric, numeric, public.status_transaksi, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_pembelian(uuid, text, numeric, numeric, public.status_bayar, numeric, numeric, public.status_transaksi, text, text) TO authenticated;

REVOKE ALL ON FUNCTION public.create_penjualan(uuid, text, numeric, numeric, integer, text, text, text, public.metode_pembayaran, public.status_bayar, numeric, public.status_transaksi, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_penjualan(uuid, text, numeric, numeric, integer, text, text, text, public.metode_pembayaran, public.status_bayar, numeric, public.status_transaksi, text, text, text) TO authenticated;