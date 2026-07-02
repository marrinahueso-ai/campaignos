-- CampaignOS Sprint 5: Event Workspace foundation

alter table public.events
  add column if not exists category text,
  add column if not exists event_owner text,
  add column if not exists budget text,
  add column if not exists volunteer_needs text,
  add column if not exists updated_at timestamptz default now();

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
  status text not null default 'draft'
    check (status in ('draft', 'generated', 'approved', 'published')),
  last_updated timestamptz not null default now(),
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, channel)
);

create table if not exists public.communication_versions (
  id uuid primary key default gen_random_uuid(),
  communication_item_id uuid not null references public.communication_items (id) on delete cascade,
  content text not null,
  version_number integer not null default 1,
  created_by text,
  created_at timestamptz not null default now()
);

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

create index if not exists event_assets_event_id_idx
  on public.event_assets (event_id);

create index if not exists communication_items_event_id_idx
  on public.communication_items (event_id);

create index if not exists communication_versions_item_id_idx
  on public.communication_versions (communication_item_id);

create index if not exists approval_requests_event_id_idx
  on public.approval_requests (event_id);

create index if not exists publication_schedule_event_id_idx
  on public.publication_schedule (event_id);

create index if not exists activity_log_event_id_idx
  on public.activity_log (event_id);

alter table public.event_assets enable row level security;
alter table public.communication_items enable row level security;
alter table public.communication_versions enable row level security;
alter table public.approval_requests enable row level security;
alter table public.publication_schedule enable row level security;
alter table public.activity_log enable row level security;

-- MVP policies: open access until auth is added
create policy "Allow public read access on event_assets"
  on public.event_assets for select to anon, authenticated using (true);

create policy "Allow public insert access on event_assets"
  on public.event_assets for insert to anon, authenticated with check (true);

create policy "Allow public update access on event_assets"
  on public.event_assets for update to anon, authenticated using (true) with check (true);

create policy "Allow public delete access on event_assets"
  on public.event_assets for delete to anon, authenticated using (true);

create policy "Allow public read access on communication_items"
  on public.communication_items for select to anon, authenticated using (true);

create policy "Allow public insert access on communication_items"
  on public.communication_items for insert to anon, authenticated with check (true);

create policy "Allow public update access on communication_items"
  on public.communication_items for update to anon, authenticated using (true) with check (true);

create policy "Allow public delete access on communication_items"
  on public.communication_items for delete to anon, authenticated using (true);

create policy "Allow public read access on communication_versions"
  on public.communication_versions for select to anon, authenticated using (true);

create policy "Allow public insert access on communication_versions"
  on public.communication_versions for insert to anon, authenticated with check (true);

create policy "Allow public read access on approval_requests"
  on public.approval_requests for select to anon, authenticated using (true);

create policy "Allow public insert access on approval_requests"
  on public.approval_requests for insert to anon, authenticated with check (true);

create policy "Allow public update access on approval_requests"
  on public.approval_requests for update to anon, authenticated using (true) with check (true);

create policy "Allow public read access on publication_schedule"
  on public.publication_schedule for select to anon, authenticated using (true);

create policy "Allow public insert access on publication_schedule"
  on public.publication_schedule for insert to anon, authenticated with check (true);

create policy "Allow public update access on publication_schedule"
  on public.publication_schedule for update to anon, authenticated using (true) with check (true);

create policy "Allow public read access on activity_log"
  on public.activity_log for select to anon, authenticated using (true);

create policy "Allow public insert access on activity_log"
  on public.activity_log for insert to anon, authenticated with check (true);
