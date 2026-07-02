-- Canva Connect: org-level OAuth tokens for design import

create table if not exists public.organization_canva_connections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  access_token text not null,
  refresh_token text not null,
  token_expires_at timestamptz not null,
  scopes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id)
);

create index if not exists organization_canva_connections_org_id_idx
  on public.organization_canva_connections (organization_id);

alter table public.organization_canva_connections enable row level security;

drop policy if exists "Allow public read access on organization_canva_connections"
  on public.organization_canva_connections;
drop policy if exists "Allow public insert access on organization_canva_connections"
  on public.organization_canva_connections;
drop policy if exists "Allow public update access on organization_canva_connections"
  on public.organization_canva_connections;
drop policy if exists "Allow public delete access on organization_canva_connections"
  on public.organization_canva_connections;

create policy "Allow public read access on organization_canva_connections"
  on public.organization_canva_connections for select to anon, authenticated using (true);
create policy "Allow public insert access on organization_canva_connections"
  on public.organization_canva_connections for insert to anon, authenticated with check (true);
create policy "Allow public update access on organization_canva_connections"
  on public.organization_canva_connections for update to anon, authenticated
  using (true) with check (true);
create policy "Allow public delete access on organization_canva_connections"
  on public.organization_canva_connections for delete to anon, authenticated using (true);
