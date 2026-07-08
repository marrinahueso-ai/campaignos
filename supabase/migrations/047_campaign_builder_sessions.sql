-- Campaign Builder V2 sessions (backward compatible — new table only)
create table if not exists public.campaign_builder_sessions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  current_step text not null default 'inspiration',
  session_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint campaign_builder_sessions_event_id_unique unique (event_id)
);

create index if not exists campaign_builder_sessions_event_id_idx
  on public.campaign_builder_sessions(event_id);

comment on table public.campaign_builder_sessions is
  'AI Campaign Builder (Creative Studio V2) session state — separate from legacy Creative Studio workflow.';

alter table public.campaign_builder_sessions enable row level security;

create policy "campaign_builder_sessions_select"
  on public.campaign_builder_sessions for select
  using (true);

create policy "campaign_builder_sessions_insert"
  on public.campaign_builder_sessions for insert
  with check (true);

create policy "campaign_builder_sessions_update"
  on public.campaign_builder_sessions for update
  using (true);

create policy "campaign_builder_sessions_delete"
  on public.campaign_builder_sessions for delete
  using (true);
