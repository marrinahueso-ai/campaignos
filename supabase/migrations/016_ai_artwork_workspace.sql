-- Engine 18.5: AI Artwork Workspace — concepts, generation settings

alter table public.event_assets
  add column if not exists generation_settings jsonb;

create table if not exists public.event_artwork_concepts (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  event_asset_id uuid not null references public.event_assets (id) on delete cascade,
  batch_id uuid not null,
  concept_index integer not null check (concept_index between 1 and 4),
  storage_path text not null,
  filename text not null,
  generation_prompt text not null,
  additional_instructions text,
  negative_instructions text,
  image_size_preset text not null,
  style text,
  variation_type text,
  inspiration_asset_id uuid references public.event_assets (id) on delete set null,
  provider text not null default 'openai',
  model text,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'discarded')),
  created_at timestamptz not null default now()
);

create index if not exists event_artwork_concepts_asset_id_idx
  on public.event_artwork_concepts (event_asset_id);

create index if not exists event_artwork_concepts_batch_id_idx
  on public.event_artwork_concepts (batch_id);

alter table public.event_artwork_concepts enable row level security;

drop policy if exists "Allow public read access on event_artwork_concepts"
  on public.event_artwork_concepts;
drop policy if exists "Allow public insert access on event_artwork_concepts"
  on public.event_artwork_concepts;
drop policy if exists "Allow public update access on event_artwork_concepts"
  on public.event_artwork_concepts;
drop policy if exists "Allow public delete access on event_artwork_concepts"
  on public.event_artwork_concepts;

create policy "Allow public read access on event_artwork_concepts"
  on public.event_artwork_concepts for select using (true);
create policy "Allow public insert access on event_artwork_concepts"
  on public.event_artwork_concepts for insert with check (true);
create policy "Allow public update access on event_artwork_concepts"
  on public.event_artwork_concepts for update using (true);
create policy "Allow public delete access on event_artwork_concepts"
  on public.event_artwork_concepts for delete using (true);
