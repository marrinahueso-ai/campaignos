-- Event-level Volunteer Stats (SignUpGenius aggregate snapshots)
-- Scoped by organization_id + event_id. Aggregate counts only — no participant PII.

-- ---------------------------------------------------------------------------
-- Sources (one active connection per event)
-- ---------------------------------------------------------------------------

create table if not exists public.event_volunteer_sources (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  provider text not null default 'signupgenius'
    check (provider in ('signupgenius')),
  source_url text not null,
  source_url_normalized text not null,
  status text not null default 'pending_review'
    check (status in ('pending_review', 'connected', 'disconnected', 'error')),
  connected_by_user_id uuid references auth.users (id) on delete set null,
  connected_at timestamptz,
  disconnected_at timestamptz,
  last_sync_attempt_at timestamptz,
  last_successful_sync_at timestamptz,
  last_failed_sync_at timestamptz,
  sync_status text not null default 'idle'
    check (sync_status in ('idle', 'syncing', 'success', 'error')),
  sync_error text,
  next_scheduled_sync_at timestamptz,
  latest_confirmed_snapshot_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists event_volunteer_sources_one_active_per_event_idx
  on public.event_volunteer_sources (event_id)
  where status in ('pending_review', 'connected', 'error');

create index if not exists event_volunteer_sources_organization_id_idx
  on public.event_volunteer_sources (organization_id);

create index if not exists event_volunteer_sources_event_id_idx
  on public.event_volunteer_sources (event_id);

-- ---------------------------------------------------------------------------
-- Snapshots
-- ---------------------------------------------------------------------------

create table if not exists public.event_volunteer_snapshots (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  source_id uuid not null references public.event_volunteer_sources (id) on delete cascade,
  total_spots integer,
  filled_spots integer,
  open_spots integer,
  full_assignment_count integer not null default 0,
  needs_help_count integer not null default 0,
  nearly_full_count integer not null default 0,
  unknown_assignment_count integer not null default 0,
  assignment_count integer not null default 0,
  source_title text,
  source_description text,
  source_location text,
  signup_deadline timestamptz,
  quantities_complete boolean not null default true,
  confirmed boolean not null default false,
  captured_at timestamptz not null default now(),
  parse_version text not null default '1',
  created_at timestamptz not null default now()
);

create index if not exists event_volunteer_snapshots_source_id_idx
  on public.event_volunteer_snapshots (source_id, captured_at desc);

create index if not exists event_volunteer_snapshots_event_id_idx
  on public.event_volunteer_snapshots (event_id, captured_at desc);

alter table public.event_volunteer_sources
  drop constraint if exists event_volunteer_sources_latest_snapshot_fkey;

alter table public.event_volunteer_sources
  add constraint event_volunteer_sources_latest_snapshot_fkey
  foreign key (latest_confirmed_snapshot_id)
  references public.event_volunteer_snapshots (id)
  on delete set null;

-- ---------------------------------------------------------------------------
-- Assignments (per snapshot)
-- ---------------------------------------------------------------------------

create table if not exists public.event_volunteer_assignments (
  id uuid primary key default gen_random_uuid(),
  snapshot_id uuid not null references public.event_volunteer_snapshots (id) on delete cascade,
  event_id uuid not null references public.events (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  external_key text not null,
  group_name text,
  assignment_name text not null,
  assignment_description text,
  assignment_date date,
  start_time text,
  end_time text,
  location text,
  quantity_requested integer,
  quantity_filled integer,
  quantity_open integer,
  availability_status text not null default 'unknown'
    check (
      availability_status in (
        'high_need',
        'needs_help',
        'nearly_full',
        'full',
        'unknown'
      )
    ),
  source_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists event_volunteer_assignments_snapshot_id_idx
  on public.event_volunteer_assignments (snapshot_id, source_order);

create index if not exists event_volunteer_assignments_event_id_idx
  on public.event_volunteer_assignments (event_id);

-- ---------------------------------------------------------------------------
-- Sync attempt history
-- ---------------------------------------------------------------------------

create table if not exists public.event_volunteer_sync_attempts (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.event_volunteer_sources (id) on delete cascade,
  event_id uuid not null references public.events (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  status text not null check (status in ('success', 'error', 'partial')),
  error_message text,
  snapshot_id uuid references public.event_volunteer_snapshots (id) on delete set null,
  assignment_count integer,
  started_at timestamptz not null default now(),
  finished_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists event_volunteer_sync_attempts_source_id_idx
  on public.event_volunteer_sync_attempts (source_id, started_at desc);

-- ---------------------------------------------------------------------------
-- Activity / audit (connect, replace, disconnect, refresh)
-- ---------------------------------------------------------------------------

create table if not exists public.event_volunteer_activity_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  event_id uuid not null references public.events (id) on delete cascade,
  source_id uuid references public.event_volunteer_sources (id) on delete set null,
  actor_user_id uuid references auth.users (id) on delete set null,
  action text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists event_volunteer_activity_logs_event_id_idx
  on public.event_volunteer_activity_logs (event_id, created_at desc);

-- ---------------------------------------------------------------------------
-- RLS (authenticated open — app-layer org/event auth, matching project pattern)
-- ---------------------------------------------------------------------------

alter table public.event_volunteer_sources enable row level security;
alter table public.event_volunteer_snapshots enable row level security;
alter table public.event_volunteer_assignments enable row level security;
alter table public.event_volunteer_sync_attempts enable row level security;
alter table public.event_volunteer_activity_logs enable row level security;

create policy "event_volunteer_sources_authenticated"
  on public.event_volunteer_sources
  for all to authenticated
  using (true) with check (true);

create policy "event_volunteer_snapshots_authenticated"
  on public.event_volunteer_snapshots
  for all to authenticated
  using (true) with check (true);

create policy "event_volunteer_assignments_authenticated"
  on public.event_volunteer_assignments
  for all to authenticated
  using (true) with check (true);

create policy "event_volunteer_sync_attempts_authenticated"
  on public.event_volunteer_sync_attempts
  for all to authenticated
  using (true) with check (true);

create policy "event_volunteer_activity_logs_authenticated"
  on public.event_volunteer_activity_logs
  for all to authenticated
  using (true) with check (true);
