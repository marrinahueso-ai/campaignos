-- Per-organization hide list for system playbooks (org-level remove, not global delete)

create table if not exists public.organization_hidden_playbooks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  playbook_id uuid not null references public.communication_playbooks (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (organization_id, playbook_id)
);

create index if not exists organization_hidden_playbooks_org_id_idx
  on public.organization_hidden_playbooks (organization_id);

alter table public.organization_hidden_playbooks enable row level security;

create policy "Allow public read access on organization_hidden_playbooks"
  on public.organization_hidden_playbooks for select to anon, authenticated using (true);

create policy "Allow public insert access on organization_hidden_playbooks"
  on public.organization_hidden_playbooks for insert to anon, authenticated with check (true);

create policy "Allow public update access on organization_hidden_playbooks"
  on public.organization_hidden_playbooks for update to anon, authenticated using (true) with check (true);

create policy "Allow public delete access on organization_hidden_playbooks"
  on public.organization_hidden_playbooks for delete to anon, authenticated using (true);
