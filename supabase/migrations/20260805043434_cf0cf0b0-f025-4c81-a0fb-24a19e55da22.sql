-- 1. Perbaiki data warisan: jumlah_dibayar melebihi total_harga
UPDATE public.pembelian
SET jumlah_dibayar = total_harga
WHERE total_harga IS NOT NULL AND jumlah_dibayar > total_harga;

UPDATE public.penjualan
SET jumlah_dibayar = total_harga
WHERE total_harga IS NOT NULL AND jumlah_dibayar > total_harga;

UPDATE public.pembelian SET jumlah_dibayar = 0 WHERE jumlah_dibayar < 0;
UPDATE public.penjualan SET jumlah_dibayar = 0 WHERE jumlah_dibayar < 0;

-- Selaraskan status_bayar dengan nilai yang sudah dikoreksi
UPDATE public.pembelian
SET status_bayar = CASE
  WHEN jumlah_dibayar <= 0 THEN 'belum'::status_bayar
  WHEN jumlah_dibayar >= total_harga THEN 'lunas'::status_bayar
  ELSE 'sebagian'::status_bayar END
WHERE total_harga IS NOT NULL;

UPDATE public.penjualan
SET status_bayar = CASE
  WHEN jumlah_dibayar <= 0 THEN 'belum'::status_bayar
  WHEN jumlah_dibayar >= total_harga THEN 'lunas'::status_bayar
  ELSE 'sebagian'::status_bayar END
WHERE total_harga IS NOT NULL;

-- 2. Pengaman pembayaran (total_harga kolom generated -> pakai trigger AFTER)
CREATE OR REPLACE FUNCTION public.cek_jumlah_dibayar()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.jumlah_dibayar < 0 THEN
    RAISE EXCEPTION 'Jumlah dibayar tidak boleh negatif';
  END IF;
  IF NEW.total_harga IS NOT NULL AND NEW.jumlah_dibayar > NEW.total_harga + 0.001 THEN
    RAISE EXCEPTION 'Jumlah dibayar (%) melebihi total harga (%)', NEW.jumlah_dibayar, NEW.total_harga;
  END IF;
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.cek_jumlah_dibayar() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_cek_bayar_pembelian ON public.pembelian;
CREATE CONSTRAINT TRIGGER trg_cek_bayar_pembelian
AFTER INSERT OR UPDATE OF jumlah_dibayar, jumlah_kg, box, harga_per_kg ON public.pembelian
FOR EACH ROW EXECUTE FUNCTION public.cek_jumlah_dibayar();

DROP TRIGGER IF EXISTS trg_cek_bayar_penjualan ON public.penjualan;
CREATE CONSTRAINT TRIGGER trg_cek_bayar_penjualan
AFTER INSERT OR UPDATE OF jumlah_dibayar, berat_kg, harga_per_kg ON public.penjualan
FOR EACH ROW EXECUTE FUNCTION public.cek_jumlah_dibayar();

-- 3. Indeks performa
CREATE INDEX IF NOT EXISTS idx_pembelian_tanggal ON public.pembelian (tanggal DESC);
CREATE INDEX IF NOT EXISTS idx_pembelian_created ON public.pembelian (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pembelian_dicatat ON public.pembelian (dicatat_oleh);
CREATE INDEX IF NOT EXISTS idx_pembelian_status ON public.pembelian (status_transaksi, status_bayar);
CREATE INDEX IF NOT EXISTS idx_pembelian_petani ON public.pembelian (petani_id);
CREATE INDEX IF NOT EXISTS idx_penjualan_tanggal ON public.penjualan (tanggal DESC);
CREATE INDEX IF NOT EXISTS idx_penjualan_created ON public.penjualan (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_penjualan_dicatat ON public.penjualan (dicatat_oleh);
CREATE INDEX IF NOT EXISTS idx_penjualan_status ON public.penjualan (status_transaksi, status_bayar);
CREATE INDEX IF NOT EXISTS idx_penjualan_pelanggan ON public.penjualan (pelanggan_id);
CREATE INDEX IF NOT EXISTS idx_kas_tanggal ON public.kas (tanggal DESC);
CREATE INDEX IF NOT EXISTS idx_kas_dicatat ON public.kas (dicatat_oleh);
CREATE INDEX IF NOT EXISTS idx_pembayaran_ref ON public.pembayaran (referensi_id);
CREATE INDEX IF NOT EXISTS idx_pesan_ai_percakapan ON public.pesan_ai (percakapan_id, created_at);

-- 4. Ringkasan dashboard dihitung di database (akurat untuk data besar)
CREATE OR REPLACE FUNCTION public.ringkasan_dashboard()
RETURNS TABLE(
  beli_hari_ini numeric,
  jual_hari_ini numeric,
  laba_hari_ini numeric,
  saldo_kas numeric,
  hutang numeric,
  piutang numeric,
  jml_menunggu integer,
  jml_belum_lunas integer
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH b AS (SELECT * FROM public.pembelian),
       j AS (SELECT * FROM public.penjualan)
  SELECT
    COALESCE((SELECT sum(total_harga) FROM b WHERE tanggal = CURRENT_DATE), 0),
    COALESCE((SELECT sum(total_harga) FROM j WHERE tanggal = CURRENT_DATE), 0),
    COALESCE((SELECT sum(total_harga) FROM j WHERE tanggal = CURRENT_DATE), 0)
      - COALESCE((SELECT sum(total_harga) FROM b WHERE tanggal = CURRENT_DATE), 0),
    COALESCE((SELECT sum(CASE WHEN tipe = 'masuk' THEN jumlah ELSE -jumlah END) FROM public.kas), 0),
    COALESCE((SELECT sum(GREATEST(total_harga - jumlah_dibayar, 0)) FROM b WHERE status_transaksi = 'disetujui'), 0),
    COALESCE((SELECT sum(GREATEST(total_harga - jumlah_dibayar, 0)) FROM j WHERE status_transaksi = 'disetujui'), 0),
    (SELECT count(*) FROM b WHERE status_transaksi = 'menunggu')::int
      + (SELECT count(*) FROM j WHERE status_transaksi = 'menunggu')::int,
    (SELECT count(*) FROM b WHERE status_transaksi = 'disetujui' AND status_bayar <> 'lunas')::int
      + (SELECT count(*) FROM j WHERE status_transaksi = 'disetujui' AND status_bayar <> 'lunas')::int;
$$;

REVOKE ALL ON FUNCTION public.ringkasan_dashboard() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ringkasan_dashboard() TO authenticated;