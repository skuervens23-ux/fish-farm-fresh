ALTER TABLE public.pembelian DROP COLUMN total_harga;
ALTER TABLE public.pembelian ADD COLUMN total_harga numeric NOT NULL GENERATED ALWAYS AS (round(jumlah_kg * 50 * harga_per_kg, 2)) STORED;

CREATE OR REPLACE FUNCTION public.create_pembelian(_petani_id uuid, _jenis_ikan text, _jumlah_kg numeric, _harga_per_kg numeric, _status_bayar status_bayar, _jumlah_dibayar numeric)
 RETURNS pembelian
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  _total numeric;
  _bayar numeric;
  _row public.pembelian;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF _jumlah_kg <= 0 OR _harga_per_kg <= 0 THEN
    RAISE EXCEPTION 'Jumlah dan harga harus lebih dari 0';
  END IF;

  _total := round(_jumlah_kg * 50 * _harga_per_kg, 2);

  IF _status_bayar = 'lunas' THEN
    _bayar := _total;
  ELSIF _status_bayar = 'belum' THEN
    _bayar := 0;
  ELSE
    IF _jumlah_dibayar <= 0 OR _jumlah_dibayar >= _total THEN
      RAISE EXCEPTION 'Jumlah dibayar harus > 0 dan < total';
    END IF;
    _bayar := _jumlah_dibayar;
  END IF;

  INSERT INTO public.pembelian (petani_id, jenis_ikan, jumlah_kg, harga_per_kg, status_bayar, jumlah_dibayar, dicatat_oleh)
  VALUES (_petani_id, _jenis_ikan, _jumlah_kg, _harga_per_kg, _status_bayar, _bayar, auth.uid())
  RETURNING * INTO _row;

  IF _bayar > 0 THEN
    INSERT INTO public.pembayaran (tipe, referensi_id, jumlah, dicatat_oleh)
    VALUES ('bayar_petani', _row.id, _bayar, auth.uid());
  END IF;

  RETURN _row;
END;
$function$;