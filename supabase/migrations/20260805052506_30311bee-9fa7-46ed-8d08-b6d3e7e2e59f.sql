-- 1. MASTER: jenis ikan
CREATE TABLE public.jenis_ikan (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nama text NOT NULL UNIQUE,
  catatan text,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.jenis_ikan TO authenticated;
GRANT ALL ON public.jenis_ikan TO service_role;
ALTER TABLE public.jenis_ikan ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner kelola jenis ikan" ON public.jenis_ikan FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'owner')) WITH CHECK (public.has_role(auth.uid(), 'owner'));
CREATE TRIGGER trg_jenis_ikan_updated BEFORE UPDATE ON public.jenis_ikan
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. Biaya operasional
CREATE TABLE public.biaya_operasional (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tanggal date NOT NULL DEFAULT CURRENT_DATE,
  kategori text NOT NULL DEFAULT 'lainnya',
  jumlah numeric NOT NULL CHECK (jumlah >= 0),
  keterangan text,
  dicatat_oleh uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.biaya_operasional TO authenticated;
GRANT ALL ON public.biaya_operasional TO service_role;
ALTER TABLE public.biaya_operasional ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner kelola biaya" ON public.biaya_operasional FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'owner')) WITH CHECK (public.has_role(auth.uid(), 'owner'));
CREATE TRIGGER trg_biaya_updated BEFORE UPDATE ON public.biaya_operasional
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_biaya_tanggal ON public.biaya_operasional (tanggal);

-- 3. Tanpa alur persetujuan: transaksi langsung final
ALTER TABLE public.pembelian ALTER COLUMN status_transaksi SET DEFAULT 'disetujui';
ALTER TABLE public.penjualan ALTER COLUMN status_transaksi SET DEFAULT 'disetujui';

CREATE OR REPLACE FUNCTION public.create_pembelian(_petani_id uuid, _jenis_ikan text, _jumlah_kg numeric, _harga_per_kg numeric, _status_bayar status_bayar, _jumlah_dibayar numeric, _box numeric DEFAULT 1, _status_transaksi status_transaksi DEFAULT 'disetujui'::status_transaksi, _catatan text DEFAULT NULL::text, _foto_nota_url text DEFAULT NULL::text)
 RETURNS pembelian
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE _total numeric; _bayar numeric; _row public.pembelian;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _jumlah_kg <= 0 OR _harga_per_kg <= 0 OR _box IS NULL OR _box <= 0 THEN
    RAISE EXCEPTION 'Berat, box, dan harga harus lebih dari 0';
  END IF;

  _total := round(_jumlah_kg * _box * _harga_per_kg, 2);

  IF _status_bayar = 'lunas' THEN _bayar := _total;
  ELSIF _status_bayar = 'belum' THEN _bayar := 0;
  ELSE
    IF _jumlah_dibayar <= 0 OR _jumlah_dibayar >= _total THEN
      RAISE EXCEPTION 'Jumlah dibayar harus > 0 dan < total';
    END IF;
    _bayar := _jumlah_dibayar;
  END IF;

  INSERT INTO public.pembelian (petani_id, jenis_ikan, jumlah_kg, box, harga_per_kg, status_bayar,
    jumlah_dibayar, dicatat_oleh, status_transaksi, catatan, foto_nota_url)
  VALUES (_petani_id, _jenis_ikan, _jumlah_kg, _box, _harga_per_kg, _status_bayar, _bayar, auth.uid(),
    _status_transaksi, _catatan, _foto_nota_url)
  RETURNING * INTO _row;

  IF _bayar > 0 THEN
    INSERT INTO public.pembayaran (tipe, referensi_id, jumlah, dicatat_oleh)
    VALUES ('bayar_petani', _row.id, _bayar, auth.uid());
  END IF;

  RETURN _row;
END; $function$;

CREATE OR REPLACE FUNCTION public.create_penjualan(_pelanggan_id uuid, _jenis_ikan text, _berat_kg numeric, _harga_per_kg numeric, _jumlah_ekor integer DEFAULT 0, _ukuran text DEFAULT NULL::text, _grade text DEFAULT NULL::text, _kolam text DEFAULT NULL::text, _metode metode_pembayaran DEFAULT 'tunai'::metode_pembayaran, _status_bayar status_bayar DEFAULT 'lunas'::status_bayar, _jumlah_dibayar numeric DEFAULT 0, _status_transaksi status_transaksi DEFAULT 'disetujui'::status_transaksi, _catatan text DEFAULT NULL::text, _foto_timbangan_url text DEFAULT NULL::text, _foto_nota_url text DEFAULT NULL::text)
 RETURNS penjualan
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE _total numeric; _bayar numeric; _row public.penjualan;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _berat_kg <= 0 OR _harga_per_kg <= 0 THEN RAISE EXCEPTION 'Berat dan harga harus lebih dari 0'; END IF;

  _total := round(_berat_kg * _harga_per_kg, 2);

  IF _status_bayar = 'lunas' THEN _bayar := _total;
  ELSIF _status_bayar = 'belum' THEN _bayar := 0;
  ELSE
    IF _jumlah_dibayar <= 0 OR _jumlah_dibayar >= _total THEN
      RAISE EXCEPTION 'Jumlah dibayar harus > 0 dan < total';
    END IF;
    _bayar := _jumlah_dibayar;
  END IF;

  INSERT INTO public.penjualan (pelanggan_id, jenis_ikan, berat_kg, harga_per_kg, jumlah_ekor,
    ukuran, grade, kolam, metode, status_bayar, jumlah_dibayar, status_transaksi, catatan,
    foto_timbangan_url, foto_nota_url, dicatat_oleh)
  VALUES (_pelanggan_id, _jenis_ikan, _berat_kg, _harga_per_kg, _jumlah_ekor, _ukuran, _grade,
    _kolam, _metode, _status_bayar, _bayar, _status_transaksi, _catatan,
    _foto_timbangan_url, _foto_nota_url, auth.uid())
  RETURNING * INTO _row;

  IF _bayar > 0 THEN
    INSERT INTO public.pembayaran (tipe, referensi_id, jumlah, dicatat_oleh)
    VALUES ('terima_pembeli', _row.id, _bayar, auth.uid());
  END IF;

  RETURN _row;
END; $function$;

-- 4. Ringkasan periode (semua perhitungan di database)
CREATE OR REPLACE FUNCTION public.ringkasan_periode(_dari date DEFAULT (CURRENT_DATE - 29), _sampai date DEFAULT CURRENT_DATE)
RETURNS TABLE(
  omzet_hari_ini numeric, modal_hari_ini numeric, laba_hari_ini numeric,
  total_modal numeric, total_penjualan numeric, total_biaya numeric,
  laba_kotor numeric, laba_bersih numeric, margin numeric,
  saldo_kas numeric, hutang numeric, piutang numeric, jml_belum_lunas integer
)
LANGUAGE sql STABLE SET search_path TO 'public'
AS $function$
  WITH b AS (SELECT * FROM public.pembelian WHERE tanggal BETWEEN _dari AND _sampai),
       j AS (SELECT * FROM public.penjualan WHERE tanggal BETWEEN _dari AND _sampai),
       o AS (SELECT * FROM public.biaya_operasional WHERE tanggal BETWEEN _dari AND _sampai),
       t AS (
         SELECT
           COALESCE((SELECT sum(total_harga) FROM public.penjualan WHERE tanggal = CURRENT_DATE),0) AS omzet_hi,
           COALESCE((SELECT sum(total_harga) FROM public.pembelian WHERE tanggal = CURRENT_DATE),0) AS modal_hi,
           COALESCE((SELECT sum(jumlah) FROM public.biaya_operasional WHERE tanggal = CURRENT_DATE),0) AS biaya_hi,
           COALESCE((SELECT sum(total_harga) FROM b),0) AS modal,
           COALESCE((SELECT sum(total_harga) FROM j),0) AS jual,
           COALESCE((SELECT sum(jumlah) FROM o),0) AS biaya
       )
  SELECT
    t.omzet_hi,
    t.modal_hi,
    t.omzet_hi - t.modal_hi - t.biaya_hi,
    t.modal,
    t.jual,
    t.biaya,
    t.jual - t.modal,
    t.jual - t.modal - t.biaya,
    CASE WHEN t.modal > 0 THEN round(((t.jual - t.modal - t.biaya) / t.modal) * 100, 2) ELSE 0 END,
    COALESCE((SELECT sum(CASE WHEN tipe = 'masuk' THEN jumlah ELSE -jumlah END) FROM public.kas), 0),
    COALESCE((SELECT sum(GREATEST(total_harga - jumlah_dibayar, 0)) FROM public.pembelian), 0),
    COALESCE((SELECT sum(GREATEST(total_harga - jumlah_dibayar, 0)) FROM public.penjualan), 0),
    ((SELECT count(*) FROM public.pembelian WHERE status_bayar <> 'lunas')
     + (SELECT count(*) FROM public.penjualan WHERE status_bayar <> 'lunas'))::int
  FROM t;
$function$;

-- 5. Deret profit per periode (hari / minggu / bulan / tahun)
CREATE OR REPLACE FUNCTION public.profit_series(_dari date DEFAULT (CURRENT_DATE - 29), _sampai date DEFAULT CURRENT_DATE, _grup text DEFAULT 'hari')
RETURNS TABLE(periode date, modal numeric, penjualan numeric, biaya numeric, laba_kotor numeric, laba_bersih numeric, margin numeric)
LANGUAGE sql STABLE SET search_path TO 'public'
AS $function$
  WITH unit AS (
    SELECT CASE lower(_grup) WHEN 'minggu' THEN 'week' WHEN 'bulan' THEN 'month' WHEN 'tahun' THEN 'year' ELSE 'day' END AS u
  ),
  b AS (
    SELECT date_trunc((SELECT u FROM unit), tanggal)::date AS p, sum(total_harga) AS v
    FROM public.pembelian WHERE tanggal BETWEEN _dari AND _sampai GROUP BY 1
  ),
  j AS (
    SELECT date_trunc((SELECT u FROM unit), tanggal)::date AS p, sum(total_harga) AS v
    FROM public.penjualan WHERE tanggal BETWEEN _dari AND _sampai GROUP BY 1
  ),
  o AS (
    SELECT date_trunc((SELECT u FROM unit), tanggal)::date AS p, sum(jumlah) AS v
    FROM public.biaya_operasional WHERE tanggal BETWEEN _dari AND _sampai GROUP BY 1
  ),
  k AS (SELECT p FROM b UNION SELECT p FROM j UNION SELECT p FROM o)
  SELECT k.p,
    COALESCE(b.v,0), COALESCE(j.v,0), COALESCE(o.v,0),
    COALESCE(j.v,0) - COALESCE(b.v,0),
    COALESCE(j.v,0) - COALESCE(b.v,0) - COALESCE(o.v,0),
    CASE WHEN COALESCE(b.v,0) > 0
      THEN round(((COALESCE(j.v,0) - COALESCE(b.v,0) - COALESCE(o.v,0)) / b.v) * 100, 2) ELSE 0 END
  FROM k LEFT JOIN b ON b.p = k.p LEFT JOIN j ON j.p = k.p LEFT JOIN o ON o.p = k.p
  ORDER BY 1;
$function$;

-- 6. Profit per supplier (modal & volume pembelian)
CREATE OR REPLACE FUNCTION public.profit_per_supplier(_dari date DEFAULT (CURRENT_DATE - 29), _sampai date DEFAULT CURRENT_DATE)
RETURNS TABLE(nama text, transaksi integer, total_kg numeric, modal numeric, hutang numeric)
LANGUAGE sql STABLE SET search_path TO 'public'
AS $function$
  SELECT p.nama, count(b.id)::int, COALESCE(sum(b.jumlah_kg * b.box),0), COALESCE(sum(b.total_harga),0),
         COALESCE(sum(GREATEST(b.total_harga - b.jumlah_dibayar,0)),0)
  FROM public.pembelian b JOIN public.petani p ON p.id = b.petani_id
  WHERE b.tanggal BETWEEN _dari AND _sampai
  GROUP BY p.nama ORDER BY 4 DESC;
$function$;

-- 7. Profit per customer (omzet penjualan)
CREATE OR REPLACE FUNCTION public.profit_per_customer(_dari date DEFAULT (CURRENT_DATE - 29), _sampai date DEFAULT CURRENT_DATE)
RETURNS TABLE(nama text, transaksi integer, total_kg numeric, omzet numeric, piutang numeric)
LANGUAGE sql STABLE SET search_path TO 'public'
AS $function$
  SELECT c.nama, count(s.id)::int, COALESCE(sum(s.berat_kg),0), COALESCE(sum(s.total_harga),0),
         COALESCE(sum(GREATEST(s.total_harga - s.jumlah_dibayar,0)),0)
  FROM public.penjualan s JOIN public.pelanggan c ON c.id = s.pelanggan_id
  WHERE s.tanggal BETWEEN _dari AND _sampai
  GROUP BY c.nama ORDER BY 4 DESC;
$function$;

-- 8. Profit per jenis ikan
CREATE OR REPLACE FUNCTION public.profit_per_ikan(_dari date DEFAULT (CURRENT_DATE - 29), _sampai date DEFAULT CURRENT_DATE)
RETURNS TABLE(jenis_ikan text, modal numeric, penjualan numeric, laba_kotor numeric, margin numeric, kg_beli numeric, kg_jual numeric)
LANGUAGE sql STABLE SET search_path TO 'public'
AS $function$
  WITH b AS (
    SELECT lower(jenis_ikan) AS k, min(jenis_ikan) AS nama, sum(total_harga) AS v, sum(jumlah_kg * box) AS kg
    FROM public.pembelian WHERE tanggal BETWEEN _dari AND _sampai GROUP BY 1
  ),
  j AS (
    SELECT lower(jenis_ikan) AS k, min(jenis_ikan) AS nama, sum(total_harga) AS v, sum(berat_kg) AS kg
    FROM public.penjualan WHERE tanggal BETWEEN _dari AND _sampai GROUP BY 1
  ),
  k AS (SELECT k FROM b UNION SELECT k FROM j)
  SELECT COALESCE(j.nama, b.nama), COALESCE(b.v,0), COALESCE(j.v,0),
    COALESCE(j.v,0) - COALESCE(b.v,0),
    CASE WHEN COALESCE(b.v,0) > 0 THEN round(((COALESCE(j.v,0) - b.v) / b.v) * 100, 2) ELSE 0 END,
    COALESCE(b.kg,0), COALESCE(j.kg,0)
  FROM k LEFT JOIN b ON b.k = k.k LEFT JOIN j ON j.k = k.k
  ORDER BY 3 DESC;
$function$;

-- 9. Profit per LOT (LOT = satu tanggal operasional)
CREATE OR REPLACE FUNCTION public.profit_per_lot(_dari date DEFAULT (CURRENT_DATE - 29), _sampai date DEFAULT CURRENT_DATE)
RETURNS TABLE(lot date, kg_beli numeric, kg_jual numeric, modal numeric, penjualan numeric, biaya numeric, laba_bersih numeric, margin numeric)
LANGUAGE sql STABLE SET search_path TO 'public'
AS $function$
  WITH b AS (SELECT tanggal p, sum(total_harga) v, sum(jumlah_kg*box) kg FROM public.pembelian WHERE tanggal BETWEEN _dari AND _sampai GROUP BY 1),
       j AS (SELECT tanggal p, sum(total_harga) v, sum(berat_kg) kg FROM public.penjualan WHERE tanggal BETWEEN _dari AND _sampai GROUP BY 1),
       o AS (SELECT tanggal p, sum(jumlah) v FROM public.biaya_operasional WHERE tanggal BETWEEN _dari AND _sampai GROUP BY 1),
       k AS (SELECT p FROM b UNION SELECT p FROM j UNION SELECT p FROM o)
  SELECT k.p, COALESCE(b.kg,0), COALESCE(j.kg,0), COALESCE(b.v,0), COALESCE(j.v,0), COALESCE(o.v,0),
    COALESCE(j.v,0) - COALESCE(b.v,0) - COALESCE(o.v,0),
    CASE WHEN COALESCE(b.v,0) > 0 THEN round(((COALESCE(j.v,0) - COALESCE(b.v,0) - COALESCE(o.v,0)) / b.v) * 100, 2) ELSE 0 END
  FROM k LEFT JOIN b ON b.p=k.p LEFT JOIN j ON j.p=k.p LEFT JOIN o ON o.p=k.p
  ORDER BY 1 DESC;
$function$;

REVOKE EXECUTE ON FUNCTION public.ringkasan_periode(date,date) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.profit_series(date,date,text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.profit_per_supplier(date,date) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.profit_per_customer(date,date) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.profit_per_ikan(date,date) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.profit_per_lot(date,date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ringkasan_periode(date,date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.profit_series(date,date,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.profit_per_supplier(date,date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.profit_per_customer(date,date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.profit_per_ikan(date,date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.profit_per_lot(date,date) TO authenticated;