CREATE OR REPLACE FUNCTION public.bayar_hutang(_pembelian_id uuid, _jumlah numeric)
RETURNS public.pembelian
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _row public.pembelian;
  _sisa numeric;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF _jumlah IS NULL OR _jumlah <= 0 THEN
    RAISE EXCEPTION 'Jumlah bayar harus lebih dari 0';
  END IF;

  SELECT * INTO _row FROM public.pembelian WHERE id = _pembelian_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pembelian tidak ditemukan';
  END IF;

  _sisa := _row.total_harga - _row.jumlah_dibayar;
  IF _sisa <= 0 THEN
    RAISE EXCEPTION 'Pembelian sudah lunas';
  END IF;
  IF _jumlah > _sisa THEN
    RAISE EXCEPTION 'Jumlah bayar melebihi sisa hutang';
  END IF;

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

REVOKE ALL ON FUNCTION public.bayar_hutang(uuid, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bayar_hutang(uuid, numeric) TO authenticated;