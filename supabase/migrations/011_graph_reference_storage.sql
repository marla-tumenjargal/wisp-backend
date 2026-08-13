-- Public bucket for graph reference images (inspiration lookalikes)

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'graph-references',
  'graph-references',
  true,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users read graph references" on storage.objects;
create policy "Users read graph references"
  on storage.objects for select
  using (bucket_id = 'graph-references');

drop policy if exists "Users upload own graph references" on storage.objects;
create policy "Users upload own graph references"
  on storage.objects for insert
  with check (
    bucket_id = 'graph-references'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users update own graph references" on storage.objects;
create policy "Users update own graph references"
  on storage.objects for update
  using (
    bucket_id = 'graph-references'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users delete own graph references" on storage.objects;
create policy "Users delete own graph references"
  on storage.objects for delete
  using (
    bucket_id = 'graph-references'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
