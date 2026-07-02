-- CampaignOS repair migration: event workspace artwork & approval foundation
--
-- Use when migration 003 was partially applied and 006 created communication
-- draft tables only. Safe to run idempotently.
--
-- Creates: event_assets, approval_requests, publication_schedule, activity_log
-- Does NOT modify: communication_items, communication_versions (006 shape)
--
-- Requires: public.events (001), communication_items (006)

-- ---------------------------------------------------------------------------
-- events columns (from 003 — harmless if present)
-- ---------------------------------------------------------------------------

alter table public.events
  add column if not exists category text,
  add column if not exists event_owner text,
  add column if not exists budget text,
  add column if not exists volunteer_needs text,
  add column if not exists updated_at timestamptz default now();

-- ---------------------------------------------------------------------------
-- event_assets
-- ---------------------------------------------------------------------------

create table if not exists public.event_assets (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  asset_type text not null
    check (asset_type in (
      'hero_image',
      'square_graphic',
      'instagram_story',
      'flyer',
      'logo',
      'document'
    )),
  filename text,
  storage_path text,
  status text not null default 'pending'
    check (status in ('pending', 'uploaded', 'placeholder')),
  ai_generated boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists event_assets_event_id_idx
  on public.event_assets (event_id);

alter table public.event_assets enable row level security;

drop policy if exists "Allow public read access on event_assets"
  on public.event_assets;
drop policy if exists "Allow public insert access on event_assets"
  on public.event_assets;
drop policy if exists "Allow public update access on event_assets"
  on public.event_assets;
drop policy if exists "Allow public delete access on event_assets"
  on public.event_assets;

create policy "Allow public read access on event_assets"
  on public.event_assets for select to anon, authenticated using (true);
create policy "Allow public insert access on event_assets"
  on public.event_assets for insert to anon, authenticated with check (true);
create policy "Allow public update access on event_assets"
  on public.event_assets for update to anon, authenticated using (true) with check (true);
create policy "Allow public delete access on event_assets"
  on public.event_assets for delete to anon, authenticated using (true);

-- ---------------------------------------------------------------------------
-- approval_requests
-- ---------------------------------------------------------------------------

create table if not exists public.approval_requests (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  communication_item_id uuid references public.communication_items (id) on delete set null,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  requested_at timestamptz not null default now(),
  resolved_at timestamptz,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists approval_requests_event_id_idx
  on public.approval_requests (event_id);

alter table public.approval_requests enable row level security;

drop policy if exists "Allow public read access on approval_requests"
  on public.approval_requests;
drop policy if exists "Allow public insert access on approval_requests"
  on public.approval_requests;
drop policy if exists "Allow public update access on approval_requests"
  on public.approval_requests;

create policy "Allow public read access on approval_requests"
  on public.approval_requests for select to anon, authenticated using (true);
create policy "Allow public insert access on approval_requests"
  on public.approval_requests for insert to anon, authenticated with check (true);
create policy "Allow public update access on approval_requests"
  on public.approval_requests for update to anon, authenticated using (true) with check (true);

-- ---------------------------------------------------------------------------
-- publication_schedule (003 parity)
-- ---------------------------------------------------------------------------

create table if not exists public.publication_schedule (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  communication_item_id uuid references public.communication_items (id) on delete set null,
  scheduled_for timestamptz not null,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'published', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists publication_schedule_event_id_idx
  on public.publication_schedule (event_id);

alter table public.publication_schedule enable row level security;

drop policy if exists "Allow public read access on publication_schedule"
  on public.publication_schedule;
drop policy if exists "Allow public insert access on publication_schedule"
  on public.publication_schedule;
drop policy if exists "Allow public update access on publication_schedule"
  on public.publication_schedule;

create policy "Allow public read access on publication_schedule"
  on public.publication_schedule for select to anon, authenticated using (true);
create policy "Allow public insert access on publication_schedule"
  on public.publication_schedule for insert to anon, authenticated with check (true);
create policy "Allow public update access on publication_schedule"
  on public.publication_schedule for update to anon, authenticated using (true) with check (true);

-- ---------------------------------------------------------------------------
-- activity_log (003 parity)
-- ---------------------------------------------------------------------------

create table if not exists public.activity_log (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  activity_type text not null
    check (activity_type in (
      'calendar_imported',
      'workspace_created',
      'communications_generated',
      'board_approval',
      'published',
      'event_completed'
    )),
  title text not null,
  description text,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists activity_log_event_id_idx
  on public.activity_log (event_id);

alter table public.activity_log enable row level security;

drop policy if exists "Allow public read access on activity_log"
  on public.activity_log;
drop policy if exists "Allow public insert access on activity_log"
  on public.activity_log;

create policy "Allow public read access on activity_log"
  on public.activity_log for select to anon, authenticated using (true);
create policy "Allow public insert access on activity_log"
  on public.activity_log for insert to anon, authenticated with check (true);

-- ---------------------------------------------------------------------------
-- storage: event-assets bucket (public read for MVP artwork URLs)
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('event-assets', 'event-assets', true)
on conflict (id) do nothing;

drop policy if exists "Allow public read access on event-assets"
  on storage.objects;
drop policy if exists "Allow public upload to event-assets"
  on storage.objects;
drop policy if exists "Allow public update on event-assets"
  on storage.objects;

create policy "Allow public read access on event-assets"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'event-assets');

create policy "Allow public upload to event-assets"
  on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'event-assets');

create policy "Allow public update on event-assets"
  on storage.objects for update to anon, authenticated
  using (bucket_id = 'event-assets')
  with check (bucket_id = 'event-assets');

-- ---------------------------------------------------------------------------
-- OPTIONAL backfill (run manually after migration, or uncomment after review)
-- Seeds placeholder asset rows for campaign events missing assets.
-- ---------------------------------------------------------------------------

-- insert into public.event_assets (event_id, asset_type, status, ai_generated)
-- select e.id, t.asset_type, 'placeholder', false
-- from public.events e
-- cross join (
--   values
--     ('hero_image'),
--     ('square_graphic'),
--     ('instagram_story'),
--     ('flyer'),
--     ('logo'),
--     ('document')
-- ) as t(asset_type)
-- where e.communication_strategy = 'full_campaign'
--   and not exists (
--     select 1 from public.event_assets ea
--     where ea.event_id = e.id and ea.asset_type = t.asset_type
--   );
