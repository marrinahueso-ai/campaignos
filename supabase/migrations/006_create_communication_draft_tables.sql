-- CampaignOS repair migration: communication draft tables
--
-- Use when migration 003 (event workspace) was never applied and 005 failed
-- because public.communication_items does not exist.
--
-- Safe to run idempotently: creates missing tables/columns, indexes, and RLS.
-- Requires: public.events (001), public.event_communication_steps (004).

-- ---------------------------------------------------------------------------
-- communication_items
-- ---------------------------------------------------------------------------

create table if not exists public.communication_items (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  channel text not null
    check (channel in (
      'website_announcement',
      'newsletter',
      'facebook',
      'instagram',
      'email',
      'flyer',
      'principal_notes',
      'morning_announcements',
      'volunteer_signup'
    )),
  event_communication_step_id uuid
    references public.event_communication_steps (id) on delete cascade,
  status text not null default 'draft'
    check (status in ('draft', 'generated', 'approved', 'published')),
  last_updated timestamptz not null default now(),
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Engine 4 column if table existed from an partial/old deploy
alter table public.communication_items
  add column if not exists event_communication_step_id uuid
    references public.event_communication_steps (id) on delete cascade;

alter table public.communication_items
  add column if not exists last_updated timestamptz default now();

alter table public.communication_items
  add column if not exists is_published boolean not null default false;

alter table public.communication_items
  add column if not exists created_at timestamptz default now();

alter table public.communication_items
  add column if not exists updated_at timestamptz default now();

-- Replace single (event_id, channel) unique with partial indexes for Engine 4
alter table public.communication_items
  drop constraint if exists communication_items_event_id_channel_key;

drop index if exists public.communication_items_event_id_channel_key;

create unique index if not exists communication_items_event_channel_hub_idx
  on public.communication_items (event_id, channel)
  where event_communication_step_id is null;

create unique index if not exists communication_items_step_id_idx
  on public.communication_items (event_communication_step_id)
  where event_communication_step_id is not null;

create index if not exists communication_items_event_id_idx
  on public.communication_items (event_id);

create index if not exists communication_items_step_lookup_idx
  on public.communication_items (event_id, event_communication_step_id);

-- ---------------------------------------------------------------------------
-- communication_versions
-- ---------------------------------------------------------------------------

create table if not exists public.communication_versions (
  id uuid primary key default gen_random_uuid(),
  communication_item_id uuid not null references public.communication_items (id) on delete cascade,
  content text not null,
  version_number integer not null default 1,
  created_by text,
  created_at timestamptz not null default now()
);

create index if not exists communication_versions_item_id_idx
  on public.communication_versions (communication_item_id);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.communication_items enable row level security;
alter table public.communication_versions enable row level security;

drop policy if exists "Allow public read access on communication_items"
  on public.communication_items;
drop policy if exists "Allow public insert access on communication_items"
  on public.communication_items;
drop policy if exists "Allow public update access on communication_items"
  on public.communication_items;
drop policy if exists "Allow public delete access on communication_items"
  on public.communication_items;

create policy "Allow public read access on communication_items"
  on public.communication_items for select to anon, authenticated using (true);

create policy "Allow public insert access on communication_items"
  on public.communication_items for insert to anon, authenticated with check (true);

create policy "Allow public update access on communication_items"
  on public.communication_items for update to anon, authenticated using (true) with check (true);

create policy "Allow public delete access on communication_items"
  on public.communication_items for delete to anon, authenticated using (true);

drop policy if exists "Allow public read access on communication_versions"
  on public.communication_versions;
drop policy if exists "Allow public insert access on communication_versions"
  on public.communication_versions;

create policy "Allow public read access on communication_versions"
  on public.communication_versions for select to anon, authenticated using (true);

create policy "Allow public insert access on communication_versions"
  on public.communication_versions for insert to anon, authenticated with check (true);
