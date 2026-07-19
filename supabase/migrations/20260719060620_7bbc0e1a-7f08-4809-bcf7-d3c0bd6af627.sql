
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_role(UUID, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.create_pembelian(UUID, TEXT, NUMERIC, NUMERIC, public.status_bayar, NUMERIC) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_pembelian(UUID, TEXT, NUMERIC, NUMERIC, public.status_bayar, NUMERIC) TO authenticated;
