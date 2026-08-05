ALTER TABLE public.pembelian DROP COLUMN IF EXISTS total_harga;

ALTER TABLE public.pembelian
  ADD COLUMN IF NOT EXISTS box numeric NOT NULL DEFAULT 1;

ALTER TABLE public.pembelian
  ADD CONSTRAINT pembelian_box_positive CHECK (box > 0);

ALTER TABLE public.pembelian
  ADD COLUMN total_harga numeric
  GENERATED ALWAYS AS (round(jumlah_kg * box * harga_per_kg, 2)) STORED;

DROP FUNCTION IF EXISTS public.create_pembelian(uuid, text, numeric, numeric, status_bayar, numeric);
DROP FUNCTION IF EXISTS public.create_pembelian(uuid, text, numeric, numeric, status_bayar, numeric, status_transaksi, text, text);

CREATE OR REPLACE FUNCTION public.create_pembelian(
  _petani_id uuid,
  _jenis_ikan text,
  _jumlah_kg numeric,
  _harga_per_kg numeric,
  _status_bayar status_bayar,
  _jumlah_dibayar numeric,
  _box numeric DEFAULT 1,
  _status_transaksi status_transaksi DEFAULT 'menunggu'::status_transaksi,
  _catatan text DEFAULT NULL::text,
  _foto_nota_url text DEFAULT NULL::text
) RETURNS pembelian
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

  IF _bayar > 0 AND _status_transaksi <> 'draft' THEN
    INSERT INTO public.pembayaran (tipe, referensi_id, jumlah, dicatat_oleh)
    VALUES ('bayar_petani', _row.id, _bayar, auth.uid());
  END IF;

  RETURN _row;
END; $function$;