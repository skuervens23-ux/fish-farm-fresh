CREATE OR REPLACE FUNCTION public.stok_gabungan()
RETURNS TABLE(kg_sisa numeric, nilai_modal numeric, harga_beli_rata numeric, jumlah_lot integer, jenis_ikan text)
LANGUAGE sql STABLE SET search_path TO 'public'
AS $$
  WITH l AS (SELECT * FROM public.pembelian_tersedia(true))
  SELECT COALESCE(sum(kg_sisa),0),
         COALESCE(sum(kg_sisa * harga_per_kg),0),
         CASE WHEN COALESCE(sum(kg_sisa),0) > 0
              THEN round(sum(kg_sisa * harga_per_kg) / sum(kg_sisa), 2) ELSE 0 END,
         count(*)::int,
         COALESCE(string_agg(DISTINCT jenis_ikan, ', '), '')
  FROM l;
$$;
REVOKE ALL ON FUNCTION public.stok_gabungan() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.stok_gabungan() TO authenticated;

CREATE OR REPLACE FUNCTION public.create_penjualan_gabungan(
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
) RETURNS TABLE(jumlah_baris integer, total_penjualan numeric, total_modal numeric, laba numeric)
LANGUAGE plpgsql SET search_path TO 'public'
AS $$
DECLARE
  _tersedia numeric; _sisa numeric; _ambil numeric; _rec record;
  _total numeric; _bayar numeric; _rasio numeric; _bagian numeric;
  _modal numeric := 0; _baris integer := 0; _row public.penjualan;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _berat_kg IS NULL OR _berat_kg <= 0 THEN RAISE EXCEPTION 'Berat jual harus lebih dari 0'; END IF;
  IF _harga_per_kg IS NULL OR _harga_per_kg <= 0 THEN RAISE EXCEPTION 'Harga jual per kg harus lebih dari 0'; END IF;

  SELECT COALESCE(sum(l.kg_sisa),0) INTO _tersedia FROM public.pembelian_tersedia(true) l;
  IF _berat_kg > _tersedia + 0.001 THEN
    RAISE EXCEPTION 'Stok tersedia hanya % Kg', round(_tersedia, 2);
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

  _rasio := _bayar / _total;
  _sisa := _berat_kg;

  FOR _rec IN
    SELECT l.id, l.jenis_ikan, l.kg_sisa, l.harga_per_kg
    FROM public.pembelian_tersedia(true) l
    ORDER BY l.tanggal ASC
  LOOP
    EXIT WHEN _sisa <= 0.001;
    _ambil := LEAST(_sisa, _rec.kg_sisa);
    IF _ambil <= 0.001 THEN CONTINUE; END IF;
    _bagian := round(_ambil * _harga_per_kg, 2);

    INSERT INTO public.penjualan (tanggal, pelanggan_id, pembelian_id, jenis_ikan, berat_kg, harga_per_kg,
      jumlah_ekor, ukuran, grade, kolam, metode, status_bayar, jumlah_dibayar, status_transaksi,
      catatan, foto_timbangan_url, foto_nota_url, dicatat_oleh)
    VALUES (COALESCE(_tanggal, CURRENT_DATE), _pelanggan_id, _rec.id, _rec.jenis_ikan, _ambil, _harga_per_kg,
      CASE WHEN _baris = 0 THEN COALESCE(_jumlah_ekor,0) ELSE 0 END, _ukuran, _grade, _kolam, 'tunai',
      _status_bayar, LEAST(round(_bagian * _rasio, 2), _bagian), 'disetujui',
      _catatan, _foto_timbangan_url, _foto_nota_url, auth.uid())
    RETURNING * INTO _row;

    IF _row.jumlah_dibayar > 0 THEN
      INSERT INTO public.pembayaran (tipe, referensi_id, jumlah, dicatat_oleh)
      VALUES ('terima_pembeli', _row.id, _row.jumlah_dibayar, auth.uid());
    END IF;

    _modal := _modal + round(_ambil * _rec.harga_per_kg, 2);
    _baris := _baris + 1;
    _sisa := _sisa - _ambil;
  END LOOP;

  RETURN QUERY SELECT _baris, _total, _modal, _total - _modal;
END; $$;

REVOKE ALL ON FUNCTION public.create_penjualan_gabungan(uuid,numeric,numeric,date,status_bayar,numeric,integer,text,text,text,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_penjualan_gabungan(uuid,numeric,numeric,date,status_bayar,numeric,integer,text,text,text,text,text,text) TO authenticated;