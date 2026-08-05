CREATE TABLE public.percakapan_ai (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  judul text NOT NULL DEFAULT 'Percakapan baru',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.percakapan_ai TO authenticated;
GRANT ALL ON public.percakapan_ai TO service_role;

ALTER TABLE public.percakapan_ai ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Kelola percakapan sendiri" ON public.percakapan_ai
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE TRIGGER set_percakapan_ai_updated_at
  BEFORE UPDATE ON public.percakapan_ai
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.pesan_ai (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  percakapan_id uuid NOT NULL REFERENCES public.percakapan_ai(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  peran text NOT NULL CHECK (peran IN ('user','assistant')),
  isi jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX pesan_ai_percakapan_idx ON public.pesan_ai (percakapan_id, created_at);

GRANT SELECT, INSERT, DELETE ON public.pesan_ai TO authenticated;
GRANT ALL ON public.pesan_ai TO service_role;

ALTER TABLE public.pesan_ai ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Kelola pesan sendiri" ON public.pesan_ai
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());