DROP FUNCTION IF EXISTS public.create_pembelian(uuid, text, numeric, numeric, numeric, numeric, status_bayar, numeric, status_transaksi, text, text);

CREATE OR REPLACE FUNCTION public.create_pembelian(
  _petani_id uuid,
  _jenis_ikan text,
  _box numeric,
  _faktor_box numeric,
  _sisa_kg numeric,
  _harga_per_kg numeric,
  _status_bayar status_bayar,
  _jumlah_dibayar numeric DEFAULT 0,
  _tanggal date DEFAULT CURRENT_DATE,
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

  INSERT INTO public.pembelian (tanggal, petani_id, jenis_ikan, jumlah_kg, box, faktor_box, sisa_kg,
    harga_per_kg, status_bayar, jumlah_dibayar, dicatat_oleh, status_transaksi, catatan, foto_nota_url)
  VALUES (COALESCE(_tanggal, CURRENT_DATE), _petani_id, _jenis_ikan, _berat, _box, _faktor_box, _sisa_kg,
    _harga_per_kg, _status_bayar, _bayar, auth.uid(), _status_transaksi, _catatan, _foto_nota_url)
  RETURNING * INTO _row;

  IF _bayar > 0 THEN
    INSERT INTO public.pembayaran (tipe, referensi_id, jumlah, dicatat_oleh)
    VALUES ('bayar_petani', _row.id, _bayar, auth.uid());
  END IF;

  RETURN _row;
END; $$;

REVOKE ALL ON FUNCTION public.create_pembelian(uuid, text, numeric, numeric, numeric, numeric, status_bayar, numeric, date, status_transaksi, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_pembelian(uuid, text, numeric, numeric, numeric, numeric, status_bayar, numeric, date, status_transaksi, text, text) TO authenticated;

DROP FUNCTION IF EXISTS public.create_penjualan(uuid, text, numeric, numeric, integer, text, text, text, metode_pembayaran, status_bayar, numeric, status_transaksi, text, text, text);

CREATE OR REPLACE FUNCTION public.create_penjualan(
  _pelanggan_id uuid,
  _jenis_ikan text,
  _berat_kg numeric,
  _harga_per_kg numeric,
  _jumlah_ekor integer DEFAULT 0,
  _ukuran text DEFAULT NULL,
  _grade text DEFAULT NULL,
  _kolam text DEFAULT NULL,
  _metode metode_pembayaran DEFAULT 'tunai'::metode_pembayaran,
  _status_bayar status_bayar DEFAULT 'lunas'::status_bayar,
  _jumlah_dibayar numeric DEFAULT 0,
  _tanggal date DEFAULT CURRENT_DATE,
  _status_transaksi status_transaksi DEFAULT 'disetujui'::status_transaksi,
  _catatan text DEFAULT NULL,
  _foto_timbangan_url text DEFAULT NULL,
  _foto_nota_url text DEFAULT NULL
) RETURNS public.penjualan
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
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

  INSERT INTO public.penjualan (tanggal, pelanggan_id, jenis_ikan, berat_kg, harga_per_kg, jumlah_ekor,
    ukuran, grade, kolam, metode, status_bayar, jumlah_dibayar, status_transaksi, catatan,
    foto_timbangan_url, foto_nota_url, dicatat_oleh)
  VALUES (COALESCE(_tanggal, CURRENT_DATE), _pelanggan_id, _jenis_ikan, _berat_kg, _harga_per_kg, _jumlah_ekor,
    _ukuran, _grade, _kolam, _metode, _status_bayar, _bayar, _status_transaksi, _catatan,
    _foto_timbangan_url, _foto_nota_url, auth.uid())
  RETURNING * INTO _row;

  IF _bayar > 0 THEN
    INSERT INTO public.pembayaran (tipe, referensi_id, jumlah, dicatat_oleh)
    VALUES ('terima_pembeli', _row.id, _bayar, auth.uid());
  END IF;

  RETURN _row;
END; $$;

REVOKE ALL ON FUNCTION public.create_penjualan(uuid, text, numeric, numeric, integer, text, text, text, metode_pembayaran, status_bayar, numeric, date, status_transaksi, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_penjualan(uuid, text, numeric, numeric, integer, text, text, text, metode_pembayaran, status_bayar, numeric, date, status_transaksi, text, text, text) TO authenticated;
