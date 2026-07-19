
-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('mandor', 'owner');
CREATE TYPE public.status_bayar AS ENUM ('lunas', 'belum', 'sebagian');
CREATE TYPE public.status_pengiriman AS ENUM ('dikirim', 'ditampung_kolam');
CREATE TYPE public.tipe_pembayaran AS ENUM ('bayar_petani', 'terima_pembeli');
CREATE TYPE public.metode_pembayaran AS ENUM ('tunai');

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nama TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ============ USER ROLES ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

-- ============ AUTO-CREATE PROFILE + DEFAULT ROLE ON SIGNUP ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, nama)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nama', split_part(NEW.email, '@', 1)));
  -- Default role: mandor. Owner harus di-assign manual oleh admin.
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'mandor');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ PETANI ============
CREATE TABLE public.petani (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama TEXT NOT NULL,
  telepon TEXT,
  alamat TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);
GRANT SELECT, INSERT, UPDATE ON public.petani TO authenticated;
GRANT ALL ON public.petani TO service_role;
ALTER TABLE public.petani ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read petani" ON public.petani FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert petani" ON public.petani FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Owner update petani" ON public.petani FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'owner'))
  WITH CHECK (public.has_role(auth.uid(), 'owner'));

-- ============ PEMBELIAN ============
CREATE TABLE public.pembelian (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  petani_id UUID NOT NULL REFERENCES public.petani(id),
  tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
  jenis_ikan TEXT NOT NULL,
  jumlah_kg NUMERIC(10,2) NOT NULL CHECK (jumlah_kg > 0),
  harga_per_kg NUMERIC(12,2) NOT NULL CHECK (harga_per_kg > 0),
  total_harga NUMERIC(14,2) NOT NULL GENERATED ALWAYS AS (ROUND(jumlah_kg * harga_per_kg, 2)) STORED,
  jumlah_mati NUMERIC(10,2) NOT NULL DEFAULT 0,
  status_bayar public.status_bayar NOT NULL,
  jumlah_dibayar NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (jumlah_dibayar >= 0),
  status_pengiriman public.status_pengiriman NOT NULL DEFAULT 'dikirim',
  dicatat_oleh UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_pembelian_tanggal ON public.pembelian(tanggal DESC);
CREATE INDEX idx_pembelian_petani ON public.pembelian(petani_id);
GRANT SELECT, INSERT ON public.pembelian TO authenticated;
GRANT ALL ON public.pembelian TO service_role;
ALTER TABLE public.pembelian ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read pembelian" ON public.pembelian FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert pembelian" ON public.pembelian FOR INSERT TO authenticated WITH CHECK (auth.uid() = dicatat_oleh);
-- Sengaja tidak ada DELETE / UPDATE policy: pembelian tidak bisa dihapus/diedit langsung.

-- ============ PEMBAYARAN ============
CREATE TABLE public.pembayaran (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipe public.tipe_pembayaran NOT NULL,
  referensi_id UUID NOT NULL,
  metode public.metode_pembayaran NOT NULL DEFAULT 'tunai',
  jumlah NUMERIC(14,2) NOT NULL CHECK (jumlah >= 0),
  dicatat_oleh UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_pembayaran_ref ON public.pembayaran(referensi_id);
GRANT SELECT, INSERT ON public.pembayaran TO authenticated;
GRANT ALL ON public.pembayaran TO service_role;
ALTER TABLE public.pembayaran ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read pembayaran" ON public.pembayaran FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert pembayaran" ON public.pembayaran FOR INSERT TO authenticated WITH CHECK (auth.uid() = dicatat_oleh);

-- ============ ATOMIC CREATE PEMBELIAN ============
CREATE OR REPLACE FUNCTION public.create_pembelian(
  _petani_id UUID,
  _jenis_ikan TEXT,
  _jumlah_kg NUMERIC,
  _harga_per_kg NUMERIC,
  _status_bayar public.status_bayar,
  _jumlah_dibayar NUMERIC
)
RETURNS public.pembelian
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id UUID := auth.uid();
  _total NUMERIC(14,2);
  _paid NUMERIC(14,2);
  _row public.pembelian;
  _petani_active BOOLEAN;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Tidak diizinkan: belum login';
  END IF;

  SELECT is_active INTO _petani_active FROM public.petani WHERE id = _petani_id;
  IF _petani_active IS NULL THEN
    RAISE EXCEPTION 'Petani tidak ditemukan';
  END IF;
  IF NOT _petani_active THEN
    RAISE EXCEPTION 'Petani sudah tidak aktif';
  END IF;

  IF _jumlah_kg <= 0 THEN RAISE EXCEPTION 'jumlah_kg harus lebih dari 0'; END IF;
  IF _harga_per_kg <= 0 THEN RAISE EXCEPTION 'harga_per_kg harus lebih dari 0'; END IF;
  IF length(trim(_jenis_ikan)) < 2 THEN RAISE EXCEPTION 'jenis_ikan minimal 2 karakter'; END IF;

  _total := ROUND(_jumlah_kg * _harga_per_kg, 2);

  IF _status_bayar = 'lunas' THEN
    _paid := _total;
  ELSIF _status_bayar = 'belum' THEN
    _paid := 0;
  ELSE
    _paid := ROUND(COALESCE(_jumlah_dibayar, 0), 2);
    IF _paid <= 0 OR _paid >= _total THEN
      RAISE EXCEPTION 'jumlah_dibayar untuk pembayaran sebagian harus > 0 dan < total (%.2f)', _total;
    END IF;
  END IF;

  INSERT INTO public.pembelian (
    petani_id, jenis_ikan, jumlah_kg, harga_per_kg,
    status_bayar, jumlah_dibayar, dicatat_oleh
  ) VALUES (
    _petani_id, trim(_jenis_ikan), _jumlah_kg, _harga_per_kg,
    _status_bayar, _paid, _user_id
  )
  RETURNING * INTO _row;

  IF _paid > 0 THEN
    INSERT INTO public.pembayaran (tipe, referensi_id, metode, jumlah, dicatat_oleh)
    VALUES ('bayar_petani', _row.id, 'tunai', _paid, _user_id);
  END IF;

  RETURN _row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_pembelian(UUID, TEXT, NUMERIC, NUMERIC, public.status_bayar, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO authenticated;
