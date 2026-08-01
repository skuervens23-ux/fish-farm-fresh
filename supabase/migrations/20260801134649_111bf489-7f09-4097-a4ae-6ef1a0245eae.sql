-- 1. Status transaksi (alur draft -> menunggu -> disetujui/ditolak)
DO $$ BEGIN
  CREATE TYPE public.status_transaksi AS ENUM ('draft','menunggu','disetujui','ditolak');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Pembelian: kolom alur kerja
ALTER TABLE public.pembelian
  ADD COLUMN IF NOT EXISTS status_transaksi public.status_transaksi NOT NULL DEFAULT 'menunggu',
  ADD COLUMN IF NOT EXISTS catatan text,
  ADD COLUMN IF NOT EXISTS foto_nota_url text,
  ADD COLUMN IF NOT EXISTS alasan_tolak text,
  ADD COLUMN IF NOT EXISTS ditinjau_oleh uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS ditinjau_pada timestamptz;

UPDATE public.pembelian SET status_transaksi = 'disetujui' WHERE status_transaksi = 'menunggu';

CREATE POLICY "Mandor ubah pembelian sendiri saat draft/ditolak"
ON public.pembelian FOR UPDATE TO authenticated
USING (dicatat_oleh = auth.uid() AND status_transaksi IN ('draft','ditolak'))
WITH CHECK (dicatat_oleh = auth.uid() AND status_transaksi IN ('draft','ditolak','menunggu'));

CREATE POLICY "Owner tinjau pembelian"
ON public.pembelian FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'owner'))
WITH CHECK (public.has_role(auth.uid(), 'owner'));

CREATE POLICY "Mandor hapus draft pembelian sendiri"
ON public.pembelian FOR DELETE TO authenticated
USING (dicatat_oleh = auth.uid() AND status_transaksi = 'draft');

-- 3. Pelanggan
CREATE TABLE IF NOT EXISTS public.pelanggan (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nama text NOT NULL,
  telepon text,
  alamat text,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.pelanggan TO authenticated;
GRANT ALL ON public.pelanggan TO service_role;
ALTER TABLE public.pelanggan ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth read pelanggan" ON public.pelanggan FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert pelanggan" ON public.pelanggan FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Owner update pelanggan" ON public.pelanggan FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(),'owner')) WITH CHECK (public.has_role(auth.uid(),'owner'));

-- 4. Penjualan
CREATE TABLE IF NOT EXISTS public.penjualan (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pelanggan_id uuid NOT NULL REFERENCES public.pelanggan(id),
  tanggal date NOT NULL DEFAULT CURRENT_DATE,
  jenis_ikan text NOT NULL,
  ukuran text,
  grade text,
  kolam text,
  jumlah_ekor integer NOT NULL DEFAULT 0,
  berat_kg numeric NOT NULL,
  harga_per_kg numeric NOT NULL,
  total_harga numeric GENERATED ALWAYS AS (round(berat_kg * harga_per_kg, 2)) STORED,
  metode metode_pembayaran NOT NULL DEFAULT 'tunai',
  status_bayar status_bayar NOT NULL DEFAULT 'lunas',
  jumlah_dibayar numeric NOT NULL DEFAULT 0,
  status_transaksi public.status_transaksi NOT NULL DEFAULT 'menunggu',
  catatan text,
  foto_timbangan_url text,
  foto_nota_url text,
  alasan_tolak text,
  ditinjau_oleh uuid REFERENCES auth.users(id),
  ditinjau_pada timestamptz,
  dicatat_oleh uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.penjualan TO authenticated;
GRANT ALL ON public.penjualan TO service_role;
ALTER TABLE public.penjualan ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth read penjualan" ON public.penjualan FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert penjualan" ON public.penjualan FOR INSERT TO authenticated WITH CHECK (auth.uid() = dicatat_oleh);
CREATE POLICY "Mandor ubah penjualan sendiri saat draft/ditolak" ON public.penjualan FOR UPDATE TO authenticated
USING (dicatat_oleh = auth.uid() AND status_transaksi IN ('draft','ditolak'))
WITH CHECK (dicatat_oleh = auth.uid() AND status_transaksi IN ('draft','ditolak','menunggu'));
CREATE POLICY "Owner tinjau penjualan" ON public.penjualan FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(),'owner')) WITH CHECK (public.has_role(auth.uid(),'owner'));
CREATE POLICY "Mandor hapus draft penjualan sendiri" ON public.penjualan FOR DELETE TO authenticated
USING (dicatat_oleh = auth.uid() AND status_transaksi = 'draft');

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_pelanggan_updated ON public.pelanggan;
CREATE TRIGGER trg_pelanggan_updated BEFORE UPDATE ON public.pelanggan
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_penjualan_updated ON public.penjualan;
CREATE TRIGGER trg_penjualan_updated BEFORE UPDATE ON public.penjualan
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5. Pembelian: pembuatan dengan alur kerja
CREATE OR REPLACE FUNCTION public.create_pembelian(
  _petani_id uuid, _jenis_ikan text, _jumlah_kg numeric, _harga_per_kg numeric,
  _status_bayar status_bayar, _jumlah_dibayar numeric,
  _status_transaksi public.status_transaksi DEFAULT 'menunggu',
  _catatan text DEFAULT NULL, _foto_nota_url text DEFAULT NULL
)
RETURNS public.pembelian LANGUAGE plpgsql SET search_path = public AS $$
DECLARE _total numeric; _bayar numeric; _row public.pembelian;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _jumlah_kg <= 0 OR _harga_per_kg <= 0 THEN RAISE EXCEPTION 'Jumlah dan harga harus lebih dari 0'; END IF;

  _total := round(_jumlah_kg * 50 * _harga_per_kg, 2);

  IF _status_bayar = 'lunas' THEN _bayar := _total;
  ELSIF _status_bayar = 'belum' THEN _bayar := 0;
  ELSE
    IF _jumlah_dibayar <= 0 OR _jumlah_dibayar >= _total THEN
      RAISE EXCEPTION 'Jumlah dibayar harus > 0 dan < total';
    END IF;
    _bayar := _jumlah_dibayar;
  END IF;

  INSERT INTO public.pembelian (petani_id, jenis_ikan, jumlah_kg, harga_per_kg, status_bayar,
    jumlah_dibayar, dicatat_oleh, status_transaksi, catatan, foto_nota_url)
  VALUES (_petani_id, _jenis_ikan, _jumlah_kg, _harga_per_kg, _status_bayar, _bayar, auth.uid(),
    _status_transaksi, _catatan, _foto_nota_url)
  RETURNING * INTO _row;

  IF _bayar > 0 AND _status_transaksi <> 'draft' THEN
    INSERT INTO public.pembayaran (tipe, referensi_id, jumlah, dicatat_oleh)
    VALUES ('bayar_petani', _row.id, _bayar, auth.uid());
  END IF;

  RETURN _row;
END; $$;

-- 6. Penjualan: pembuatan atomik
CREATE OR REPLACE FUNCTION public.create_penjualan(
  _pelanggan_id uuid, _jenis_ikan text, _berat_kg numeric, _harga_per_kg numeric,
  _jumlah_ekor integer DEFAULT 0, _ukuran text DEFAULT NULL, _grade text DEFAULT NULL,
  _kolam text DEFAULT NULL, _metode metode_pembayaran DEFAULT 'tunai',
  _status_bayar status_bayar DEFAULT 'lunas', _jumlah_dibayar numeric DEFAULT 0,
  _status_transaksi public.status_transaksi DEFAULT 'menunggu',
  _catatan text DEFAULT NULL, _foto_timbangan_url text DEFAULT NULL, _foto_nota_url text DEFAULT NULL
)
RETURNS public.penjualan LANGUAGE plpgsql SET search_path = public AS $$
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

  IF _bayar > 0 AND _status_transaksi <> 'draft' THEN
    INSERT INTO public.pembayaran (tipe, referensi_id, jumlah, dicatat_oleh)
    VALUES ('terima_pembeli', _row.id, _bayar, auth.uid());
  END IF;

  RETURN _row;
END; $$;