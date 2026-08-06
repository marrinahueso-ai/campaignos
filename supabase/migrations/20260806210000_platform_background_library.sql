-- Platform owner Background Library (iStock-style curated backgrounds).
-- Not organization-scoped. Mutations go through service role after canAccessOwnerOps().

create table if not exists public.background_libraries (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null default '',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.background_sources (
  id uuid primary key default gen_random_uuid(),
  title text not null default '',
  notes text not null default '',
  storage_path text not null,
  public_url text not null,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.background_assets (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references public.background_sources (id) on delete set null,
  status text not null default 'pending_review'
    check (status in ('pending_review', 'published', 'archived')),
  title text not null default '',
  tags text[] not null default '{}',
  colors text[] not null default '{}',
  season text not null default 'anytime',
  school_level text not null default 'any',
  storage_path text not null,
  public_url text not null,
  width integer,
  height integer,
  usage_count integer not null default 0,
  created_by uuid references auth.users (id) on delete set null,
  reviewed_by uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.background_asset_libraries (
  asset_id uuid not null references public.background_assets (id) on delete cascade,
  library_id uuid not null references public.background_libraries (id) on delete cascade,
  primary key (asset_id, library_id)
);

create index if not exists background_assets_status_created_idx
  on public.background_assets (status, created_at desc);

create index if not exists background_assets_source_idx
  on public.background_assets (source_id);

create index if not exists background_asset_libraries_library_idx
  on public.background_asset_libraries (library_id);

insert into public.background_libraries (slug, name, description, sort_order)
values
  ('back-to-school', 'Back to School', 'First-week, supply drives, and welcome energy.', 10),
  ('fall', 'Fall', 'Autumn leaves, harvest, and cozy school nights.', 20),
  ('winter', 'Winter', 'Frost, holidays, and mid-year warmth.', 30),
  ('sports', 'Sports', 'Games, spirit nights, and field-day energy.', 40),
  ('generic', 'Generic', 'Flexible textures and scenes for any campaign.', 50),
  ('graduation', 'Graduation', 'Caps, milestones, and celebration.', 60)
on conflict (slug) do nothing;

alter table public.background_libraries enable row level security;
alter table public.background_sources enable row level security;
alter table public.background_assets enable row level security;
alter table public.background_asset_libraries enable row level security;

-- Schools may browse published library memberships later; drafts stay owner-only (service role).
drop policy if exists background_libraries_select_active on public.background_libraries;
create policy background_libraries_select_active
  on public.background_libraries for select to authenticated
  using (is_active = true);

drop policy if exists background_assets_select_published on public.background_assets;
create policy background_assets_select_published
  on public.background_assets for select to authenticated
  using (status = 'published');

drop policy if exists background_asset_libraries_select_published on public.background_asset_libraries;
create policy background_asset_libraries_select_published
  on public.background_asset_libraries for select to authenticated
  using (
    exists (
      select 1
      from public.background_assets a
      where a.id = asset_id
        and a.status = 'published'
    )
  );

-- No insert/update/delete policies for authenticated — owner ops uses service role.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'platform-backgrounds',
  'platform-backgrounds',
  true,
  15728640,
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

-- Public read for published URLs; writes via service role only.
drop policy if exists platform_backgrounds_public_read on storage.objects;
create policy platform_backgrounds_public_read
  on storage.objects for select to public
  using (bucket_id = 'platform-backgrounds');
