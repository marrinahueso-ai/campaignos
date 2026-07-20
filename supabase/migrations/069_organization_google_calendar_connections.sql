-- Google Calendar OAuth: org-level tokens for Calendar API sync

create table if not exists public.organization_google_calendar_connections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  access_token text not null,
  refresh_token text not null,
  token_expires_at timestamptz not null,
  scopes text,
  google_account_email text,
  google_calendar_id text not null default 'primary',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id)
);

create index if not exists organization_google_calendar_connections_org_id_idx
  on public.organization_google_calendar_connections (organization_id);

alter table public.organization_google_calendar_connections enable row level security;

drop policy if exists "google_cal_connections_select_active_member"
  on public.organization_google_calendar_connections;
drop policy if exists "google_cal_connections_insert_active_member"
  on public.organization_google_calendar_connections;
drop policy if exists "google_cal_connections_update_active_member"
  on public.organization_google_calendar_connections;
drop policy if exists "google_cal_connections_delete_active_member"
  on public.organization_google_calendar_connections;

create policy "google_cal_connections_select_active_member"
  on public.organization_google_calendar_connections
  for select to authenticated
  using (private.is_active_org_member(organization_id));

create policy "google_cal_connections_insert_active_member"
  on public.organization_google_calendar_connections
  for insert to authenticated
  with check (private.is_active_org_member(organization_id));

create policy "google_cal_connections_update_active_member"
  on public.organization_google_calendar_connections
  for update to authenticated
  using (private.is_active_org_member(organization_id))
  with check (private.is_active_org_member(organization_id));

create policy "google_cal_connections_delete_active_member"
  on public.organization_google_calendar_connections
  for delete to authenticated
  using (private.is_active_org_member(organization_id));
