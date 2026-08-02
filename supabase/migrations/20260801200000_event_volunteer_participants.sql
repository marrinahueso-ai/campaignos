-- Named volunteer roster rows from SignUpGenius public participants.
-- Name only — smaller privacy surface (no contact columns).
-- Scoped by organization_id + event_id; RLS matches other event_volunteer_* tables.

create table if not exists public.event_volunteer_participants (
  id uuid primary key default gen_random_uuid(),
  snapshot_id uuid not null references public.event_volunteer_snapshots (id) on delete cascade,
  event_id uuid not null references public.events (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  assignment_external_key text not null,
  participant_key text not null,
  volunteer_name text not null,
  role_name text not null,
  assignment_date date,
  start_time text,
  end_time text,
  location text,
  status text not null default 'confirmed'
    check (status in ('confirmed', 'unknown')),
  source_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists event_volunteer_participants_snapshot_id_idx
  on public.event_volunteer_participants (snapshot_id, source_order);

create index if not exists event_volunteer_participants_event_id_idx
  on public.event_volunteer_participants (event_id);

create index if not exists event_volunteer_participants_organization_id_idx
  on public.event_volunteer_participants (organization_id);

alter table public.event_volunteer_participants enable row level security;

create policy event_volunteer_participants_select_active_member
  on public.event_volunteer_participants
  for select to authenticated
  using (private.is_active_org_member(organization_id));

create policy event_volunteer_participants_insert_active_member
  on public.event_volunteer_participants
  for insert to authenticated
  with check (private.is_active_org_member(organization_id));

create policy event_volunteer_participants_update_active_member
  on public.event_volunteer_participants
  for update to authenticated
  using (private.is_active_org_member(organization_id))
  with check (private.is_active_org_member(organization_id));

create policy event_volunteer_participants_delete_active_member
  on public.event_volunteer_participants
  for delete to authenticated
  using (private.is_active_org_member(organization_id));
