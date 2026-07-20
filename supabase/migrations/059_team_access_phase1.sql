-- Team & Access Phase 1: invite metadata, developer/tester roles, event assignments, committee assigned event.

-- Expand campaign_role checks to include developer + tester.
alter table public.organization_users
  drop constraint if exists organization_users_campaign_role_check;

alter table public.organization_users
  add constraint organization_users_campaign_role_check
  check (
    campaign_role in (
      'admin',
      'president',
      'vp_communications',
      'committee_chair',
      'contributor',
      'view_only',
      'developer',
      'tester'
    )
  );

alter table public.organization_roles
  drop constraint if exists organization_roles_campaign_role_check;

alter table public.organization_roles
  add constraint organization_roles_campaign_role_check
  check (
    campaign_role is null
    or campaign_role in (
      'admin',
      'president',
      'vp_communications',
      'committee_chair',
      'contributor',
      'view_only',
      'developer',
      'tester'
    )
  );

alter table public.organization_members
  drop constraint if exists organization_members_campaign_role_check;

alter table public.organization_members
  add constraint organization_members_campaign_role_check
  check (
    campaign_role is null
    or campaign_role in (
      'admin',
      'president',
      'vp_communications',
      'committee_chair',
      'contributor',
      'view_only',
      'developer',
      'tester'
    )
  );

alter table public.organization_committees
  drop constraint if exists organization_committees_campaign_role_check;

alter table public.organization_committees
  add constraint organization_committees_campaign_role_check
  check (
    campaign_role is null
    or campaign_role in (
      'admin',
      'president',
      'vp_communications',
      'committee_chair',
      'contributor',
      'view_only',
      'developer',
      'tester'
    )
  );

-- Invite / member metadata on organization_users
alter table public.organization_users
  add column if not exists display_name text,
  add column if not exists committee_id uuid
    references public.organization_committees (id) on delete set null,
  add column if not exists invite_message text;

create index if not exists organization_users_committee_id_idx
  on public.organization_users (committee_id)
  where committee_id is not null;

-- Multi-event assignments for auth members (editable later)
create table if not exists public.organization_user_event_assignments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  organization_user_id uuid not null
    references public.organization_users (id) on delete cascade,
  event_id uuid not null references public.events (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (organization_user_id, event_id)
);

create index if not exists organization_user_event_assignments_org_idx
  on public.organization_user_event_assignments (organization_id);

create index if not exists organization_user_event_assignments_user_idx
  on public.organization_user_event_assignments (organization_user_id);

create index if not exists organization_user_event_assignments_event_idx
  on public.organization_user_event_assignments (event_id);

alter table public.organization_user_event_assignments enable row level security;

drop policy if exists "Allow authenticated read organization_user_event_assignments"
  on public.organization_user_event_assignments;
drop policy if exists "Allow authenticated insert organization_user_event_assignments"
  on public.organization_user_event_assignments;
drop policy if exists "Allow authenticated update organization_user_event_assignments"
  on public.organization_user_event_assignments;
drop policy if exists "Allow authenticated delete organization_user_event_assignments"
  on public.organization_user_event_assignments;

create policy "Allow authenticated read organization_user_event_assignments"
  on public.organization_user_event_assignments for select to authenticated using (true);

create policy "Allow authenticated insert organization_user_event_assignments"
  on public.organization_user_event_assignments for insert to authenticated with check (true);

create policy "Allow authenticated update organization_user_event_assignments"
  on public.organization_user_event_assignments for update to authenticated using (true) with check (true);

create policy "Allow authenticated delete organization_user_event_assignments"
  on public.organization_user_event_assignments for delete to authenticated using (true);

-- Committee assigned event (single event for Phase 1)
alter table public.organization_committees
  add column if not exists assigned_event_id uuid
    references public.events (id) on delete set null;

create index if not exists organization_committees_assigned_event_id_idx
  on public.organization_committees (assigned_event_id)
  where assigned_event_id is not null;
