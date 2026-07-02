-- CampaignOS: events table
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  date date not null,
  time time,
  location text,
  audience text,
  theme text,
  status text not null default 'draft'
    check (status in ('draft', 'scheduled', 'published', 'archived')),
  created_at timestamptz not null default now()
);

create index if not exists events_date_idx on public.events (date asc);
create index if not exists events_created_at_idx on public.events (created_at desc);

alter table public.events enable row level security;

-- MVP policies: open access until auth is added
create policy "Allow public read access on events"
  on public.events
  for select
  to anon, authenticated
  using (true);

create policy "Allow public insert access on events"
  on public.events
  for insert
  to anon, authenticated
  with check (true);

create policy "Allow public update access on events"
  on public.events
  for update
  to anon, authenticated
  using (true)
  with check (true);

create policy "Allow public delete access on events"
  on public.events
  for delete
  to anon, authenticated
  using (true);
