-- Engine 7.1 — Organization Workspace Foundation
-- Roles, members, responsibility matrix, and committee defaults per organization.

create table if not exists public.organization_roles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  system_role boolean not null default false,
  description text,
  created_at timestamptz not null default now(),
  unique (organization_id, name)
);

create table if not exists public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  email text not null,
  organization_role_id uuid references public.organization_roles (id) on delete set null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.responsibility_matrix (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  responsibility_type text not null,
  default_role_id uuid references public.organization_roles (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (organization_id, responsibility_type)
);

create table if not exists public.committee_defaults (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  committee_name text not null,
  default_role_id uuid references public.organization_roles (id) on delete set null,
  communication_strategy text not null default 'full_campaign'
    check (
      communication_strategy in (
        'full_campaign',
        'reminder_only',
        'calendar_only',
        'custom'
      )
    ),
  playbook_slug text,
  created_at timestamptz not null default now(),
  unique (organization_id, committee_name)
);

create index if not exists organization_roles_organization_id_idx
  on public.organization_roles (organization_id);

create index if not exists organization_members_organization_id_idx
  on public.organization_members (organization_id);

create index if not exists organization_members_role_id_idx
  on public.organization_members (organization_role_id);

create index if not exists responsibility_matrix_organization_id_idx
  on public.responsibility_matrix (organization_id);

create index if not exists committee_defaults_organization_id_idx
  on public.committee_defaults (organization_id);

alter table public.organization_roles enable row level security;
alter table public.organization_members enable row level security;
alter table public.responsibility_matrix enable row level security;
alter table public.committee_defaults enable row level security;

-- MVP policies: open access until auth is added
create policy "Allow public read access on organization_roles"
  on public.organization_roles for select to anon, authenticated using (true);

create policy "Allow public insert access on organization_roles"
  on public.organization_roles for insert to anon, authenticated with check (true);

create policy "Allow public update access on organization_roles"
  on public.organization_roles for update to anon, authenticated using (true) with check (true);

create policy "Allow public delete access on organization_roles"
  on public.organization_roles for delete to anon, authenticated using (true);

create policy "Allow public read access on organization_members"
  on public.organization_members for select to anon, authenticated using (true);

create policy "Allow public insert access on organization_members"
  on public.organization_members for insert to anon, authenticated with check (true);

create policy "Allow public update access on organization_members"
  on public.organization_members for update to anon, authenticated using (true) with check (true);

create policy "Allow public delete access on organization_members"
  on public.organization_members for delete to anon, authenticated using (true);

create policy "Allow public read access on responsibility_matrix"
  on public.responsibility_matrix for select to anon, authenticated using (true);

create policy "Allow public insert access on responsibility_matrix"
  on public.responsibility_matrix for insert to anon, authenticated with check (true);

create policy "Allow public update access on responsibility_matrix"
  on public.responsibility_matrix for update to anon, authenticated using (true) with check (true);

create policy "Allow public delete access on responsibility_matrix"
  on public.responsibility_matrix for delete to anon, authenticated using (true);

create policy "Allow public read access on committee_defaults"
  on public.committee_defaults for select to anon, authenticated using (true);

create policy "Allow public insert access on committee_defaults"
  on public.committee_defaults for insert to anon, authenticated with check (true);

create policy "Allow public update access on committee_defaults"
  on public.committee_defaults for update to anon, authenticated using (true) with check (true);

create policy "Allow public delete access on committee_defaults"
  on public.committee_defaults for delete to anon, authenticated using (true);
