-- KAS: pemasukan & pengeluaran
CREATE TYPE public.tipe_kas AS ENUM ('masuk', 'keluar');

CREATE TABLE public.kas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tanggal date NOT NULL DEFAULT CURRENT_DATE,
  tipe public.tipe_kas NOT NULL,
  kategori text NOT NULL DEFAULT 'lainnya',
  jumlah numeric NOT NULL CHECK (jumlah > 0),
  keterangan text,
  dicatat_oleh uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.kas TO authenticated;
GRANT ALL ON public.kas TO service_role;

ALTER TABLE public.kas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth read kas" ON public.kas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert kas" ON public.kas FOR INSERT TO authenticated WITH CHECK (auth.uid() = dicatat_oleh);
CREATE POLICY "Owner update kas" ON public.kas FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'owner')) WITH CHECK (public.has_role(auth.uid(), 'owner'));
CREATE POLICY "Owner delete kas" ON public.kas FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'owner'));

CREATE TRIGGER trg_kas_updated BEFORE UPDATE ON public.kas
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- PENGATURAN aplikasi
CREATE TABLE public.pengaturan (
  key text PRIMARY KEY,
  value text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pengaturan TO authenticated;
GRANT ALL ON public.pengaturan TO service_role;

ALTER TABLE public.pengaturan ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth read pengaturan" ON public.pengaturan FOR SELECT TO authenticated USING (true);
CREATE POLICY "Owner insert pengaturan" ON public.pengaturan FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'owner'));
CREATE POLICY "Owner update pengaturan" ON public.pengaturan FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'owner')) WITH CHECK (public.has_role(auth.uid(), 'owner'));

CREATE TRIGGER trg_pengaturan_updated BEFORE UPDATE ON public.pengaturan
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.pengaturan (key, value) VALUES
  ('nama_perusahaan', 'Bandar Ikan'),
  ('alamat', ''),
  ('telepon', ''),
  ('faktor_berat', '50')
ON CONFLICT (key) DO NOTHING;

-- HAK AKSES: owner kelola peran pengguna
CREATE POLICY "Owner read all roles" ON public.user_roles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'owner'));
CREATE POLICY "Owner insert roles" ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'owner'));
CREATE POLICY "Owner update roles" ON public.user_roles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'owner')) WITH CHECK (public.has_role(auth.uid(), 'owner'));
CREATE POLICY "Owner delete roles" ON public.user_roles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'owner'));