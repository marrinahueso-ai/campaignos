-- Run this entire file in Supabase SQL Editor if meta_social_captions does not exist yet.
-- Safe to re-run (idempotent).

-- 1) Create table
create table if not exists public.meta_social_captions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  relative_day integer not null,
  milestone_title text not null,
  placement text not null
    check (placement in ('feed', 'story')),
  content text not null,
  status text not null default 'draft'
    check (status in ('draft', 'approved')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, relative_day, placement)
);

create index if not exists meta_social_captions_event_id_idx
  on public.meta_social_captions (event_id);

-- 2) Add status if table existed from an older migration without it
alter table public.meta_social_captions
  add column if not exists status text not null default 'draft';

-- 3) RLS (upsert requires with check on update)
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
  on public.meta_social_captions for select to anon, authenticated using (true);

create policy "Allow public insert access on meta_social_captions"
  on public.meta_social_captions for insert to anon, authenticated with check (true);

create policy "Allow public update access on meta_social_captions"
  on public.meta_social_captions for update to anon, authenticated
  using (true) with check (true);

create policy "Allow public delete access on meta_social_captions"
  on public.meta_social_captions for delete to anon, authenticated using (true);
