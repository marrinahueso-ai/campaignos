-- CampaignOS Sprint 3: School Setup foundation

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  district text,
  school_year text,
  mascot text,
  principal text,
  school_website text,
  pto_website text,
  created_at timestamptz not null default now()
);

create table if not exists public.brand_assets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  pto_logo text,
  school_logo text,
  primary_color text,
  secondary_color text,
  font_family text,
  created_at timestamptz not null default now()
);

create table if not exists public.calendar_imports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  filename text not null,
  file_type text not null,
  upload_status text not null default 'uploaded'
    check (upload_status in ('pending', 'uploaded', 'failed')),
  storage_path text not null,
  created_at timestamptz not null default now()
);

create index if not exists brand_assets_organization_id_idx
  on public.brand_assets (organization_id);

create index if not exists calendar_imports_organization_id_idx
  on public.calendar_imports (organization_id);

alter table public.organizations enable row level security;
alter table public.brand_assets enable row level security;
alter table public.calendar_imports enable row level security;

-- MVP policies: open access until auth is added
create policy "Allow public read access on organizations"
  on public.organizations for select to anon, authenticated using (true);

create policy "Allow public insert access on organizations"
  on public.organizations for insert to anon, authenticated with check (true);

create policy "Allow public update access on organizations"
  on public.organizations for update to anon, authenticated using (true) with check (true);

create policy "Allow public read access on brand_assets"
  on public.brand_assets for select to anon, authenticated using (true);

create policy "Allow public insert access on brand_assets"
  on public.brand_assets for insert to anon, authenticated with check (true);

create policy "Allow public update access on brand_assets"
  on public.brand_assets for update to anon, authenticated using (true) with check (true);

create policy "Allow public read access on calendar_imports"
  on public.calendar_imports for select to anon, authenticated using (true);

create policy "Allow public insert access on calendar_imports"
  on public.calendar_imports for insert to anon, authenticated with check (true);

-- Storage buckets for logos and calendar files
insert into storage.buckets (id, name, public)
values ('school-assets', 'school-assets', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('calendar-uploads', 'calendar-uploads', false)
on conflict (id) do nothing;

create policy "Allow public read access on school-assets"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'school-assets');

create policy "Allow public upload to school-assets"
  on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'school-assets');

create policy "Allow public upload to calendar-uploads"
  on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'calendar-uploads');

create policy "Allow public read on calendar-uploads"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'calendar-uploads');
