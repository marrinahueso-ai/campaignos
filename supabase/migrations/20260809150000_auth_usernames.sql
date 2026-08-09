-- Username login layer: global usernames mapped to Supabase Auth users.
-- Auth still uses password + internal synthetic email (@users.heyralli.invalid).
-- Contact email on organization_users becomes optional for username-provisioned seats.

create table if not exists public.auth_usernames (
  user_id uuid primary key references auth.users (id) on delete cascade,
  username text not null,
  username_normalized text generated always as (lower(username)) stored,
  auth_email text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint auth_usernames_username_format
    check (username ~ '^[a-z0-9][a-z0-9._-]{1,30}[a-z0-9]$'),
  constraint auth_usernames_auth_email_synthetic
    check (auth_email like '%@users.heyralli.invalid')
);

create unique index if not exists auth_usernames_username_normalized_uidx
  on public.auth_usernames (username_normalized);

create unique index if not exists auth_usernames_auth_email_uidx
  on public.auth_usernames (lower(auth_email));

alter table public.organization_users
  alter column email drop not null;

comment on table public.auth_usernames is
  'Global login usernames for password Auth users that may not have a real email.';

comment on column public.auth_usernames.auth_email is
  'Internal non-deliverable Auth email (*.users.heyralli.invalid). Never show to end users as contact email.';

alter table public.auth_usernames enable row level security;

-- Members can read their own username mapping (for account UI). Lookups for login
-- use the service role / server actions, not client queries.
create policy auth_usernames_select_own
  on public.auth_usernames
  for select
  to authenticated
  using (user_id = auth.uid());

-- No insert/update/delete for authenticated clients — provisioning is service-role only.
