-- Day-of volunteer ops markers (Arrived / Received) local to Hey Ralli.
-- Does not write back to SignUpGenius. Scoped by organization_id + event_id;
-- RLS matches other event_volunteer_* tables.

create table if not exists public.event_volunteer_ops (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  event_id uuid not null references public.events (id) on delete cascade,
  subject_type text not null
    check (subject_type in ('participant', 'item')),
  subject_key text not null,
  status text not null
    check (status in ('arrived', 'received')),
  marked_at timestamptz not null default now(),
  marked_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint event_volunteer_ops_subject_unique
    unique (event_id, subject_type, subject_key),
  constraint event_volunteer_ops_status_matches_subject
    check (
      (subject_type = 'participant' and status = 'arrived')
      or (subject_type = 'item' and status = 'received')
    )
);

create index if not exists event_volunteer_ops_event_id_idx
  on public.event_volunteer_ops (event_id);

create index if not exists event_volunteer_ops_organization_id_idx
  on public.event_volunteer_ops (organization_id);

alter table public.event_volunteer_ops enable row level security;

create policy event_volunteer_ops_select_active_member
  on public.event_volunteer_ops
  for select to authenticated
  using (private.is_active_org_member(organization_id));

create policy event_volunteer_ops_insert_active_member
  on public.event_volunteer_ops
  for insert to authenticated
  with check (private.is_active_org_member(organization_id));

create policy event_volunteer_ops_update_active_member
  on public.event_volunteer_ops
  for update to authenticated
  using (private.is_active_org_member(organization_id))
  with check (private.is_active_org_member(organization_id));

create policy event_volunteer_ops_delete_active_member
  on public.event_volunteer_ops
  for delete to authenticated
  using (private.is_active_org_member(organization_id));
