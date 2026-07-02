-- Organization users: link Supabase Auth accounts to PTO roles.

create table if not exists public.organization_users (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  email text not null,
  organization_role_id uuid references public.organization_roles (id) on delete set null,
  campaign_role text not null default 'contributor'
    check (
      campaign_role in (
        'admin',
        'president',
        'vp_communications',
        'committee_chair',
        'contributor',
        'view_only'
      )
    ),
  status text not null default 'invited'
    check (status in ('active', 'invited', 'deactivated')),
  invite_token text unique,
  invited_by_user_id uuid references auth.users (id) on delete set null,
  invited_at timestamptz,
  joined_at timestamptz,
  created_at timestamptz not null default now(),
  unique (organization_id, email)
);

create index if not exists organization_users_organization_id_idx
  on public.organization_users (organization_id);

create index if not exists organization_users_user_id_idx
  on public.organization_users (user_id)
  where user_id is not null;

create index if not exists organization_users_invite_token_idx
  on public.organization_users (invite_token)
  where invite_token is not null;

create index if not exists organization_users_email_lower_idx
  on public.organization_users (lower(email));

alter table public.organization_users enable row level security;

drop policy if exists "Allow public read access on organization_users"
  on public.organization_users;
drop policy if exists "Allow public insert access on organization_users"
  on public.organization_users;
drop policy if exists "Allow public update access on organization_users"
  on public.organization_users;
drop policy if exists "Allow public delete access on organization_users"
  on public.organization_users;

create policy "Allow public read access on organization_users"
  on public.organization_users for select to anon, authenticated using (true);

create policy "Allow public insert access on organization_users"
  on public.organization_users for insert to anon, authenticated with check (true);

create policy "Allow public update access on organization_users"
  on public.organization_users for update to anon, authenticated using (true) with check (true);

create policy "Allow public delete access on organization_users"
  on public.organization_users for delete to anon, authenticated using (true);
