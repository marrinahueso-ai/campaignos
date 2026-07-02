-- CampaignOS repair migration: storage buckets
--
-- Use when migrations 002 / 007 were applied without storage bucket inserts
-- (e.g. buckets skipped or storage schema unavailable during initial run).
--
-- Safe to run idempotently.

-- ---------------------------------------------------------------------------
-- Buckets
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('school-assets', 'school-assets', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('calendar-uploads', 'calendar-uploads', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('training-library', 'training-library', false)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- school-assets policies
-- ---------------------------------------------------------------------------

drop policy if exists "Allow public read access on school-assets"
  on storage.objects;

drop policy if exists "Allow public upload to school-assets"
  on storage.objects;

create policy "Allow public read access on school-assets"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'school-assets');

create policy "Allow public upload to school-assets"
  on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'school-assets');

-- ---------------------------------------------------------------------------
-- calendar-uploads policies
-- ---------------------------------------------------------------------------

drop policy if exists "Allow public upload to calendar-uploads"
  on storage.objects;

drop policy if exists "Allow public read on calendar-uploads"
  on storage.objects;

create policy "Allow public upload to calendar-uploads"
  on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'calendar-uploads');

create policy "Allow public read on calendar-uploads"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'calendar-uploads');

-- ---------------------------------------------------------------------------
-- training-library policies
-- ---------------------------------------------------------------------------

drop policy if exists "Allow public read access on training-library"
  on storage.objects;

drop policy if exists "Allow public insert access on training-library"
  on storage.objects;

drop policy if exists "Allow public delete access on training-library"
  on storage.objects;

create policy "Allow public read access on training-library"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'training-library');

create policy "Allow public insert access on training-library"
  on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'training-library');

create policy "Allow public delete access on training-library"
  on storage.objects for delete to anon, authenticated
  using (bucket_id = 'training-library');
