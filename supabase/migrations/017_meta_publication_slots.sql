-- Meta publish slots: feed + story artwork per milestone → Facebook + Instagram

create table if not exists public.meta_publication_slots (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  relative_day integer not null,
  milestone_title text not null,
  platform text not null
    check (platform in ('facebook', 'instagram')),
  placement text not null
    check (placement in ('feed', 'story')),
  event_asset_id uuid references public.event_assets (id) on delete set null,
  communication_item_id uuid references public.communication_items (id) on delete set null,
  scheduled_for timestamptz,
  status text not null default 'draft'
    check (status in ('draft', 'scheduled', 'approved', 'published', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, relative_day, platform, placement)
);

create index if not exists meta_publication_slots_event_id_idx
  on public.meta_publication_slots (event_id);

create index if not exists meta_publication_slots_event_relative_day_idx
  on public.meta_publication_slots (event_id, relative_day);

alter table public.meta_publication_slots enable row level security;

drop policy if exists "Allow public read access on meta_publication_slots"
  on public.meta_publication_slots;
drop policy if exists "Allow public insert access on meta_publication_slots"
  on public.meta_publication_slots;
drop policy if exists "Allow public update access on meta_publication_slots"
  on public.meta_publication_slots;
drop policy if exists "Allow public delete access on meta_publication_slots"
  on public.meta_publication_slots;

create policy "Allow public read access on meta_publication_slots"
  on public.meta_publication_slots for select using (true);
create policy "Allow public insert access on meta_publication_slots"
  on public.meta_publication_slots for insert with check (true);
create policy "Allow public update access on meta_publication_slots"
  on public.meta_publication_slots for update using (true);
create policy "Allow public delete access on meta_publication_slots"
  on public.meta_publication_slots for delete using (true);
