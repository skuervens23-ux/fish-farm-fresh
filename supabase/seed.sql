-- ---------------------------------------------------------------------------
-- Pond Purchase Hub — seed data opsional (master data saja, tanpa transaksi)
--
-- Jalankan setelah seluruh migration di supabase/migrations diterapkan:
--   supabase db reset            # otomatis menjalankan file ini
--   psql "$DATABASE_URL" -f supabase/seed.sql
--
-- File ini TIDAK berisi akun, password, atau data rahasia apa pun.
-- ---------------------------------------------------------------------------

insert into public.jenis_ikan (nama, catatan, is_active)
values
  ('Nila', 'Ikan air tawar, ukuran konsumsi', true),
  ('Lele', 'Ikan air tawar', true),
  ('Gurame', 'Ikan air tawar premium', true),
  ('Patin', 'Ikan air tawar', true),
  ('Bawal', 'Ikan air tawar', true)
on conflict do nothing;
