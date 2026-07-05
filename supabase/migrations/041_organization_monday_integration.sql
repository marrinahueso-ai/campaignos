-- Monday.com integration: org OAuth, board mappings, task item links

create table if not exists public.organization_monday_connections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  access_token text not null,
  account_id text,
  account_slug text,
  scopes text,
  monday_sync_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id)
);

create index if not exists organization_monday_connections_org_id_idx
  on public.organization_monday_connections (organization_id);

alter table public.organization_monday_connections enable row level security;

drop policy if exists "Allow public read access on organization_monday_connections"
  on public.organization_monday_connections;
drop policy if exists "Allow public insert access on organization_monday_connections"
  on public.organization_monday_connections;
drop policy if exists "Allow public update access on organization_monday_connections"
  on public.organization_monday_connections;
drop policy if exists "Allow public delete access on organization_monday_connections"
  on public.organization_monday_connections;

create policy "Allow public read access on organization_monday_connections"
  on public.organization_monday_connections for select to anon, authenticated using (true);
create policy "Allow public insert access on organization_monday_connections"
  on public.organization_monday_connections for insert to anon, authenticated with check (true);
create policy "Allow public update access on organization_monday_connections"
  on public.organization_monday_connections for update to anon, authenticated
  using (true) with check (true);
create policy "Allow public delete access on organization_monday_connections"
  on public.organization_monday_connections for delete to anon, authenticated using (true);

-- One master board mapping per org; committee_groups maps committee id → Monday group id
create table if not exists public.organization_monday_board_mappings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  monday_board_id text not null,
  monday_workspace_id text,
  column_map jsonb not null default '{}'::jsonb,
  committee_groups jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id)
);

create index if not exists organization_monday_board_mappings_org_id_idx
  on public.organization_monday_board_mappings (organization_id);

alter table public.organization_monday_board_mappings enable row level security;

drop policy if exists "Allow public read access on organization_monday_board_mappings"
  on public.organization_monday_board_mappings;
drop policy if exists "Allow public insert access on organization_monday_board_mappings"
  on public.organization_monday_board_mappings;
drop policy if exists "Allow public update access on organization_monday_board_mappings"
  on public.organization_monday_board_mappings;
drop policy if exists "Allow public delete access on organization_monday_board_mappings"
  on public.organization_monday_board_mappings;

create policy "Allow public read access on organization_monday_board_mappings"
  on public.organization_monday_board_mappings for select to anon, authenticated using (true);
create policy "Allow public insert access on organization_monday_board_mappings"
  on public.organization_monday_board_mappings for insert to anon, authenticated with check (true);
create policy "Allow public update access on organization_monday_board_mappings"
  on public.organization_monday_board_mappings for update to anon, authenticated
  using (true) with check (true);
create policy "Allow public delete access on organization_monday_board_mappings"
  on public.organization_monday_board_mappings for delete to anon, authenticated using (true);

create table if not exists public.event_playbook_task_monday_links (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  event_playbook_task_id uuid not null references public.event_playbook_tasks (id) on delete cascade,
  monday_item_id text not null,
  monday_board_id text not null,
  last_synced_at timestamptz,
  sync_version integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_playbook_task_id)
);

create index if not exists event_playbook_task_monday_links_org_id_idx
  on public.event_playbook_task_monday_links (organization_id);

create index if not exists event_playbook_task_monday_links_task_id_idx
  on public.event_playbook_task_monday_links (event_playbook_task_id);

alter table public.event_playbook_task_monday_links enable row level security;

drop policy if exists "Allow public read access on event_playbook_task_monday_links"
  on public.event_playbook_task_monday_links;
drop policy if exists "Allow public insert access on event_playbook_task_monday_links"
  on public.event_playbook_task_monday_links;
drop policy if exists "Allow public update access on event_playbook_task_monday_links"
  on public.event_playbook_task_monday_links;
drop policy if exists "Allow public delete access on event_playbook_task_monday_links"
  on public.event_playbook_task_monday_links;

create policy "Allow public read access on event_playbook_task_monday_links"
  on public.event_playbook_task_monday_links for select to anon, authenticated using (true);
create policy "Allow public insert access on event_playbook_task_monday_links"
  on public.event_playbook_task_monday_links for insert to anon, authenticated with check (true);
create policy "Allow public update access on event_playbook_task_monday_links"
  on public.event_playbook_task_monday_links for update to anon, authenticated
  using (true) with check (true);
create policy "Allow public delete access on event_playbook_task_monday_links"
  on public.event_playbook_task_monday_links for delete to anon, authenticated using (true);
