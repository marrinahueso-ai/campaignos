-- Organization URLs for inbox AI source checking + custom sources table

alter table public.organizations
  add column if not exists events_url text,
  add column if not exists calendar_url text,
  add column if not exists resources_url text,
  add column if not exists faq_url text;

create type public.inbox_ai_source_type as enum (
  'events',
  'calendar',
  'resources',
  'faq',
  'custom'
);

create table if not exists public.organization_inbox_ai_sources (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  label text not null,
  url text not null,
  source_type public.inbox_ai_source_type not null default 'custom',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists organization_inbox_ai_sources_org_id_idx
  on public.organization_inbox_ai_sources (organization_id);

create index if not exists organization_inbox_ai_sources_org_sort_idx
  on public.organization_inbox_ai_sources (organization_id, sort_order);

alter table public.organization_inbox_ai_sources enable row level security;

drop policy if exists "Allow public read access on organization_inbox_ai_sources"
  on public.organization_inbox_ai_sources;
drop policy if exists "Allow public insert access on organization_inbox_ai_sources"
  on public.organization_inbox_ai_sources;
drop policy if exists "Allow public update access on organization_inbox_ai_sources"
  on public.organization_inbox_ai_sources;
drop policy if exists "Allow public delete access on organization_inbox_ai_sources"
  on public.organization_inbox_ai_sources;

create policy "Allow public read access on organization_inbox_ai_sources"
  on public.organization_inbox_ai_sources for select to anon, authenticated using (true);
create policy "Allow public insert access on organization_inbox_ai_sources"
  on public.organization_inbox_ai_sources for insert to anon, authenticated with check (true);
create policy "Allow public update access on organization_inbox_ai_sources"
  on public.organization_inbox_ai_sources for update to anon, authenticated
  using (true) with check (true);
create policy "Allow public delete access on organization_inbox_ai_sources"
  on public.organization_inbox_ai_sources for delete to anon, authenticated using (true);

alter table public.inbox_messages
  add column if not exists ai_source_used jsonb;
