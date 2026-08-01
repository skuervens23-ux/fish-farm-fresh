CREATE POLICY "Auth lihat nota" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'nota');

CREATE POLICY "Auth unggah nota sendiri" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'nota' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Auth ubah nota sendiri" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'nota' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'nota' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Auth hapus nota sendiri" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'nota' AND (storage.foldername(name))[1] = auth.uid()::text);