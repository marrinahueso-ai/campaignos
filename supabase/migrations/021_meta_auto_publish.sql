-- Meta auto-publish: org connection + slot publish tracking

create table if not exists public.organization_meta_connections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  facebook_page_id text not null,
  instagram_account_id text not null,
  page_access_token text not null,
  page_name text,
  token_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id)
);

create index if not exists organization_meta_connections_org_id_idx
  on public.organization_meta_connections (organization_id);

alter table public.organization_meta_connections enable row level security;

drop policy if exists "Allow public read access on organization_meta_connections"
  on public.organization_meta_connections;
drop policy if exists "Allow public insert access on organization_meta_connections"
  on public.organization_meta_connections;
drop policy if exists "Allow public update access on organization_meta_connections"
  on public.organization_meta_connections;
drop policy if exists "Allow public delete access on organization_meta_connections"
  on public.organization_meta_connections;

create policy "Allow public read access on organization_meta_connections"
  on public.organization_meta_connections for select to anon, authenticated using (true);
create policy "Allow public insert access on organization_meta_connections"
  on public.organization_meta_connections for insert to anon, authenticated with check (true);
create policy "Allow public update access on organization_meta_connections"
  on public.organization_meta_connections for update to anon, authenticated
  using (true) with check (true);
create policy "Allow public delete access on organization_meta_connections"
  on public.organization_meta_connections for delete to anon, authenticated using (true);

alter table public.meta_publication_slots
  add column if not exists external_post_id text,
  add column if not exists publish_error text,
  add column if not exists published_at timestamptz;

alter table public.meta_publication_slots
  drop constraint if exists meta_publication_slots_status_check;

alter table public.meta_publication_slots
  add constraint meta_publication_slots_status_check
  check (status in ('draft', 'scheduled', 'approved', 'posting', 'published', 'failed', 'cancelled'));
