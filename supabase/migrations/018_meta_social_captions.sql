-- Meta social captions per milestone — feed + story copy for Facebook/Instagram publish

create table if not exists public.meta_social_captions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  relative_day integer not null,
  milestone_title text not null,
  placement text not null
    check (placement in ('feed', 'story')),
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, relative_day, placement)
);

create index if not exists meta_social_captions_event_id_idx
  on public.meta_social_captions (event_id);

alter table public.meta_social_captions enable row level security;

drop policy if exists "Allow public read access on meta_social_captions"
  on public.meta_social_captions;
drop policy if exists "Allow public insert access on meta_social_captions"
  on public.meta_social_captions;
drop policy if exists "Allow public update access on meta_social_captions"
  on public.meta_social_captions;
drop policy if exists "Allow public delete access on meta_social_captions"
  on public.meta_social_captions;

create policy "Allow public read access on meta_social_captions"
  on public.meta_social_captions for select using (true);
create policy "Allow public insert access on meta_social_captions"
  on public.meta_social_captions for insert with check (true);
create policy "Allow public update access on meta_social_captions"
  on public.meta_social_captions for update using (true);
create policy "Allow public delete access on meta_social_captions"
  on public.meta_social_captions for delete using (true);
