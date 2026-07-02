-- Engine 17: Creative Asset Manager — version history, expanded types, brand kit

alter table public.event_assets
  add column if not exists uploaded_by text,
  add column if not exists current_version integer not null default 1,
  add column if not exists tags text[] not null default '{}',
  add column if not exists is_favorite boolean not null default false,
  add column if not exists canva_url text,
  add column if not exists is_custom boolean not null default false;

alter table public.event_assets
  drop constraint if exists event_assets_asset_type_check;

alter table public.event_assets
  add constraint event_assets_asset_type_check
  check (asset_type in (
    'hero_image',
    'flyer',
    'facebook_graphic',
    'instagram_graphic',
    'instagram_story',
    'newsletter_banner',
    'email_header',
    'pdf',
    'canva_link',
    'logo_used',
    'miscellaneous',
    'square_graphic',
    'logo',
    'document'
  ));

create table if not exists public.event_asset_versions (
  id uuid primary key default gen_random_uuid(),
  event_asset_id uuid not null references public.event_assets (id) on delete cascade,
  version_number integer not null,
  filename text,
  storage_path text,
  uploaded_by text,
  canva_url text,
  created_at timestamptz not null default now(),
  unique (event_asset_id, version_number)
);

create index if not exists event_asset_versions_asset_id_idx
  on public.event_asset_versions (event_asset_id);

create table if not exists public.organization_brand_kit_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  category text not null
    check (category in (
      'school_logo',
      'pto_logo',
      'color',
      'font',
      'canva_template',
      'brand_voice',
      'icon',
      'background',
      'other'
    )),
  label text not null,
  value_text text,
  storage_path text,
  filename text,
  uploaded_by text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists organization_brand_kit_items_org_id_idx
  on public.organization_brand_kit_items (organization_id);
