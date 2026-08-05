-- ============ PEMBELIAN: faktor box + sisa kg ============
ALTER TABLE public.pembelian
  ADD COLUMN IF NOT EXISTS faktor_box numeric NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS sisa_kg numeric NOT NULL DEFAULT 0;

ALTER TABLE public.pembelian DROP COLUMN IF EXISTS total_harga;

DROP TRIGGER IF EXISTS trg_cek_bayar_pembelian ON public.pembelian;

-- Konversi data lama: jumlah_kg dulu = berat per box
UPDATE public.pembelian
SET faktor_box = GREATEST(jumlah_kg, 0.0001),
    jumlah_kg  = jumlah_kg * COALESCE(box, 1),
    sisa_kg    = 0
WHERE faktor_box = 50 AND box IS NOT NULL;

ALTER TABLE public.pembelian
  ADD COLUMN total_harga numeric
  GENERATED ALWAYS AS (round(jumlah_kg * harga_per_kg, 2)) STORED;

CREATE TRIGGER trg_cek_bayar_pembelian AFTER INSERT OR UPDATE ON public.pembelian
FOR EACH ROW EXECUTE FUNCTION public.cek_jumlah_dibayar();

-- ============ create_pembelian versi baru ============
DROP FUNCTION IF EXISTS public.create_pembelian(uuid, text, numeric, numeric, status_bayar, numeric, numeric, status_transaksi, text, text);

CREATE OR REPLACE FUNCTION public.create_pembelian(
  _petani_id uuid,
  _jenis_ikan text,
  _box numeric,
  _faktor_box numeric,
  _sisa_kg numeric,
  _harga_per_kg numeric,
  _status_bayar status_bayar,
  _jumlah_dibayar numeric DEFAULT 0,
  _status_transaksi status_transaksi DEFAULT 'disetujui'::status_transaksi,
  _catatan text DEFAULT NULL,
  _foto_nota_url text DEFAULT NULL
) RETURNS public.pembelian
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE _berat numeric; _total numeric; _bayar numeric; _row public.pembelian;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _box IS NULL OR _box < 0 OR _faktor_box IS NULL OR _faktor_box <= 0
     OR _sisa_kg IS NULL OR _sisa_kg < 0 OR _harga_per_kg IS NULL OR _harga_per_kg <= 0 THEN
    RAISE EXCEPTION 'Box, faktor box, sisa kg, dan harga tidak boleh negatif atau kosong';
  END IF;

  _berat := round((_box * _faktor_box) + _sisa_kg, 3);
  IF _berat <= 0 THEN RAISE EXCEPTION 'Total berat harus lebih dari 0'; END IF;
  _total := round(_berat * _harga_per_kg, 2);

  IF _status_bayar = 'lunas' THEN _bayar := _total;
  ELSIF _status_bayar = 'belum' THEN _bayar := 0;
  ELSE
    IF _jumlah_dibayar <= 0 OR _jumlah_dibayar >= _total THEN
      RAISE EXCEPTION 'Jumlah dibayar harus > 0 dan < total';
    END IF;
    _bayar := _jumlah_dibayar;
  END IF;

  INSERT INTO public.pembelian (petani_id, jenis_ikan, jumlah_kg, box, faktor_box, sisa_kg,
    harga_per_kg, status_bayar, jumlah_dibayar, dicatat_oleh, status_transaksi, catatan, foto_nota_url)
  VALUES (_petani_id, _jenis_ikan, _berat, _box, _faktor_box, _sisa_kg, _harga_per_kg, _status_bayar,
    _bayar, auth.uid(), _status_transaksi, _catatan, _foto_nota_url)
  RETURNING * INTO _row;

  IF _bayar > 0 THEN
    INSERT INTO public.pembayaran (tipe, referensi_id, jumlah, dicatat_oleh)
    VALUES ('bayar_petani', _row.id, _bayar, auth.uid());
  END IF;

  RETURN _row;
END; $$;

REVOKE ALL ON FUNCTION public.create_pembelian(uuid, text, numeric, numeric, numeric, numeric, status_bayar, numeric, status_transaksi, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_pembelian(uuid, text, numeric, numeric, numeric, numeric, status_bayar, numeric, status_transaksi, text, text) TO authenticated;

-- ============ BIAYA OPERASIONAL: es (balok) ============
ALTER TABLE public.biaya_operasional
  ADD COLUMN IF NOT EXISTS jumlah_balok numeric,
  ADD COLUMN IF NOT EXISTS harga_per_balok numeric;

CREATE OR REPLACE FUNCTION public.hitung_biaya_es()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.jumlah_balok IS NOT NULL AND NEW.harga_per_balok IS NOT NULL THEN
    IF NEW.jumlah_balok < 0 OR NEW.harga_per_balok < 0 THEN
      RAISE EXCEPTION 'Jumlah balok dan harga per balok tidak boleh negatif';
    END IF;
    NEW.jumlah := round(NEW.jumlah_balok * NEW.harga_per_balok, 2);
  END IF;
  IF NEW.jumlah IS NULL OR NEW.jumlah < 0 THEN
    RAISE EXCEPTION 'Jumlah biaya tidak boleh kosong atau negatif';
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_hitung_biaya_es ON public.biaya_operasional;
CREATE TRIGGER trg_hitung_biaya_es BEFORE INSERT OR UPDATE ON public.biaya_operasional
FOR EACH ROW EXECUTE FUNCTION public.hitung_biaya_es();

-- ============ STOK ============
CREATE OR REPLACE FUNCTION public.stok_ikan()
RETURNS TABLE(jenis_ikan text, kg_masuk numeric, kg_keluar numeric, kg_sisa numeric,
              harga_rata numeric, nilai_persediaan numeric)
LANGUAGE sql STABLE SET search_path TO 'public' AS $$
  WITH b AS (
    SELECT lower(p.jenis_ikan) k, min(p.jenis_ikan) nama,
           sum(p.jumlah_kg) kg, sum(p.total_harga) nilai
    FROM public.pembelian p GROUP BY 1
  ),
  j AS (
    SELECT lower(s.jenis_ikan) k, min(s.jenis_ikan) nama, sum(s.berat_kg) kg
    FROM public.penjualan s GROUP BY 1
  ),
  k AS (SELECT k FROM b UNION SELECT k FROM j)
  SELECT COALESCE(b.nama, j.nama),
         COALESCE(b.kg, 0),
         COALESCE(j.kg, 0),
         GREATEST(COALESCE(b.kg,0) - COALESCE(j.kg,0), 0),
         CASE WHEN COALESCE(b.kg,0) > 0 THEN round(b.nilai / b.kg, 2) ELSE 0 END,
         CASE WHEN COALESCE(b.kg,0) > 0
              THEN round(GREATEST(COALESCE(b.kg,0) - COALESCE(j.kg,0), 0) * (b.nilai / b.kg), 2)
              ELSE 0 END
  FROM k
  LEFT JOIN b ON b.k = k.k
  LEFT JOIN j ON j.k = k.k
  ORDER BY 4 DESC;
$$;

REVOKE ALL ON FUNCTION public.stok_ikan() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.stok_ikan() TO authenticated;

CREATE OR REPLACE FUNCTION public.cek_stok_penjualan()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
DECLARE _masuk numeric; _keluar numeric;
BEGIN
  IF NEW.berat_kg IS NULL OR NEW.berat_kg <= 0 THEN
    RAISE EXCEPTION 'Berat terjual harus lebih dari 0';
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

DROP TRIGGER IF EXISTS trg_cek_stok_penjualan ON public.penjualan;
CREATE TRIGGER trg_cek_stok_penjualan BEFORE INSERT OR UPDATE OF berat_kg, jenis_ikan
ON public.penjualan FOR EACH ROW EXECUTE FUNCTION public.cek_stok_penjualan();

-- ============ RINGKASAN HARI INI ============
CREATE OR REPLACE FUNCTION public.ringkasan_hari_ini(_tanggal date DEFAULT CURRENT_DATE)
RETURNS TABLE(total_pembelian numeric, total_penjualan numeric, total_operasional numeric,
              laba_bersih numeric, berat_dibeli numeric, berat_terjual numeric,
              nilai_persediaan numeric, nilai_modal numeric)
LANGUAGE sql STABLE SET search_path TO 'public' AS $$
  WITH b AS (SELECT COALESCE(sum(total_harga),0) v, COALESCE(sum(jumlah_kg),0) kg
             FROM public.pembelian WHERE tanggal = _tanggal),
       j AS (SELECT COALESCE(sum(total_harga),0) v, COALESCE(sum(berat_kg),0) kg
             FROM public.penjualan WHERE tanggal = _tanggal),
       o AS (SELECT COALESCE(sum(jumlah),0) v FROM public.biaya_operasional WHERE tanggal = _tanggal),
       s AS (SELECT COALESCE(sum(nilai_persediaan),0) v FROM public.stok_ikan())
  SELECT b.v, j.v, o.v, j.v - b.v - o.v, b.kg, j.kg, s.v, b.v FROM b, j, o, s;
$$;

REVOKE ALL ON FUNCTION public.ringkasan_hari_ini(date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ringkasan_hari_ini(date) TO authenticated;

-- ============ Analitik: kg pakai jumlah_kg (sudah total berat) ============
CREATE OR REPLACE FUNCTION public.profit_per_ikan(_dari date DEFAULT (CURRENT_DATE - 29), _sampai date DEFAULT CURRENT_DATE)
 RETURNS TABLE(jenis_ikan text, modal numeric, penjualan numeric, laba_kotor numeric, margin numeric, kg_beli numeric, kg_jual numeric)
 LANGUAGE sql STABLE SET search_path TO 'public'
AS $$
  WITH b AS (
    SELECT lower(jenis_ikan) AS k, min(jenis_ikan) AS nama, sum(total_harga) AS v, sum(jumlah_kg) AS kg
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
$$;

CREATE OR REPLACE FUNCTION public.profit_per_supplier(_dari date DEFAULT (CURRENT_DATE - 29), _sampai date DEFAULT CURRENT_DATE)
 RETURNS TABLE(nama text, transaksi integer, total_kg numeric, modal numeric, hutang numeric)
 LANGUAGE sql STABLE SET search_path TO 'public'
AS $$
  SELECT p.nama, count(b.id)::int, COALESCE(sum(b.jumlah_kg),0), COALESCE(sum(b.total_harga),0),
         COALESCE(sum(GREATEST(b.total_harga - b.jumlah_dibayar,0)),0)
  FROM public.pembelian b JOIN public.petani p ON p.id = b.petani_id
  WHERE b.tanggal BETWEEN _dari AND _sampai
  GROUP BY p.nama ORDER BY 4 DESC;
$$;

CREATE OR REPLACE FUNCTION public.profit_per_lot(_dari date DEFAULT (CURRENT_DATE - 29), _sampai date DEFAULT CURRENT_DATE)
 RETURNS TABLE(lot date, kg_beli numeric, kg_jual numeric, modal numeric, penjualan numeric, biaya numeric, laba_bersih numeric, margin numeric)
 LANGUAGE sql STABLE SET search_path TO 'public'
AS $$
  WITH b AS (SELECT tanggal p, sum(total_harga) v, sum(jumlah_kg) kg FROM public.pembelian WHERE tanggal BETWEEN _dari AND _sampai GROUP BY 1),
       j AS (SELECT tanggal p, sum(total_harga) v, sum(berat_kg) kg FROM public.penjualan WHERE tanggal BETWEEN _dari AND _sampai GROUP BY 1),
       o AS (SELECT tanggal p, sum(jumlah) v FROM public.biaya_operasional WHERE tanggal BETWEEN _dari AND _sampai GROUP BY 1),
       k AS (SELECT p FROM b UNION SELECT p FROM j UNION SELECT p FROM o)
  SELECT k.p, COALESCE(b.kg,0), COALESCE(j.kg,0), COALESCE(b.v,0), COALESCE(j.v,0), COALESCE(o.v,0),
    COALESCE(j.v,0) - COALESCE(b.v,0) - COALESCE(o.v,0),
    CASE WHEN COALESCE(b.v,0) > 0 THEN round(((COALESCE(j.v,0) - COALESCE(b.v,0) - COALESCE(o.v,0)) / b.v) * 100, 2) ELSE 0 END
  FROM k LEFT JOIN b ON b.p=k.p LEFT JOIN j ON j.p=k.p LEFT JOIN o ON o.p=k.p
  ORDER BY 1 DESC;
$$;

-- ============ HAK AKSES: hanya owner ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  INSERT INTO public.profiles (id, nama)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nama', split_part(NEW.email, '@', 1)));
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'owner');
  RETURN NEW;
END; $$;

UPDATE public.user_roles SET role = 'owner' WHERE role = 'mandor';
