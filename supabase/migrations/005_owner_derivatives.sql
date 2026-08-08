-- =====================================================================
-- 005_owner_derivatives.sql
-- Allow the authenticated OWNER to write derived assets (teaser frames,
-- cover, story renders) into public-media under their own prefix.
-- Originals in tree-media remain private. Edge Functions (service_role)
-- keep full write access and will take over rendering later.
-- Path convention (from 004): {owner_id}/{tree_id}/{file}
-- =====================================================================

create policy "owner writes own public derivatives"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'public-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "owner updates own public derivatives"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'public-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'public-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "owner deletes own public derivatives"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'public-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
