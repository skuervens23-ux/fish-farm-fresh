DO $$
DECLARE _uid uuid;
BEGIN
  SELECT id INTO _uid FROM auth.users WHERE email = 'skuervens23@gmail.com';
  IF _uid IS NOT NULL THEN
    DELETE FROM public.pembayaran WHERE dicatat_oleh = _uid
      OR referensi_id IN (SELECT id FROM public.pembelian WHERE dicatat_oleh = _uid OR petani_id IN (SELECT id FROM public.petani WHERE created_by = _uid));
    DELETE FROM public.pembelian WHERE dicatat_oleh = _uid OR petani_id IN (SELECT id FROM public.petani WHERE created_by = _uid);
    DELETE FROM public.petani WHERE created_by = _uid;
    DELETE FROM public.user_roles WHERE user_id = _uid;
    DELETE FROM public.profiles WHERE id = _uid;
    DELETE FROM auth.users WHERE id = _uid;
  END IF;
END $$;