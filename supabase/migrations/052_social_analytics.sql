-- Social analytics: org-scoped Meta insights storage (additive)

create table if not exists public.social_account_insights (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  platform text not null check (platform in ('facebook', 'instagram')),
  metric_date date not null,
  reach bigint not null default 0,
  engagement bigint not null default 0,
  likes bigint not null default 0,
  comments bigint not null default 0,
  shares bigint not null default 0,
  clicks bigint not null default 0,
  raw_metrics jsonb not null default '{}'::jsonb,
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, platform, metric_date)
);

create index if not exists social_account_insights_org_date_idx
  on public.social_account_insights (organization_id, metric_date desc);

alter table public.social_account_insights enable row level security;

create policy "Allow public read access on social_account_insights"
  on public.social_account_insights for select to anon, authenticated using (true);
create policy "Allow public insert access on social_account_insights"
  on public.social_account_insights for insert to anon, authenticated with check (true);
create policy "Allow public update access on social_account_insights"
  on public.social_account_insights for update to anon, authenticated
  using (true) with check (true);
create policy "Allow public delete access on social_account_insights"
  on public.social_account_insights for delete to anon, authenticated using (true);

create table if not exists public.social_post_insights (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  meta_publication_slot_id uuid references public.meta_publication_slots (id) on delete set null,
  external_post_id text not null,
  platform text not null check (platform in ('facebook', 'instagram')),
  placement text check (placement in ('feed', 'story')),
  post_title text,
  published_at timestamptz,
  reach bigint not null default 0,
  engagement bigint not null default 0,
  likes bigint not null default 0,
  comments bigint not null default 0,
  shares bigint not null default 0,
  clicks bigint not null default 0,
  raw_metrics jsonb not null default '{}'::jsonb,
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, external_post_id)
);

create index if not exists social_post_insights_org_reach_idx
  on public.social_post_insights (organization_id, reach desc);

create index if not exists social_post_insights_org_published_idx
  on public.social_post_insights (organization_id, published_at desc nulls last);

alter table public.social_post_insights enable row level security;

create policy "Allow public read access on social_post_insights"
  on public.social_post_insights for select to anon, authenticated using (true);
create policy "Allow public insert access on social_post_insights"
  on public.social_post_insights for insert to anon, authenticated with check (true);
create policy "Allow public update access on social_post_insights"
  on public.social_post_insights for update to anon, authenticated
  using (true) with check (true);
create policy "Allow public delete access on social_post_insights"
  on public.social_post_insights for delete to anon, authenticated using (true);

create table if not exists public.social_activity_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  platform text not null check (platform in ('facebook', 'instagram')),
  event_type text not null,
  title text not null,
  body text,
  external_post_id text,
  external_actor_id text,
  actor_name text,
  occurred_at timestamptz not null,
  source text not null check (source in ('webhook', 'sync', 'inbox')),
  inbox_message_id uuid references public.inbox_messages (id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists social_activity_events_org_occurred_idx
  on public.social_activity_events (organization_id, occurred_at desc);

create unique index if not exists social_activity_events_inbox_message_uidx
  on public.social_activity_events (inbox_message_id)
  where inbox_message_id is not null;

alter table public.social_activity_events enable row level security;

create policy "Allow public read access on social_activity_events"
  on public.social_activity_events for select to anon, authenticated using (true);
create policy "Allow public insert access on social_activity_events"
  on public.social_activity_events for insert to anon, authenticated with check (true);
create policy "Allow public update access on social_activity_events"
  on public.social_activity_events for update to anon, authenticated
  using (true) with check (true);
create policy "Allow public delete access on social_activity_events"
  on public.social_activity_events for delete to anon, authenticated using (true);

create table if not exists public.analytics_sync_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  sync_type text not null check (sync_type in ('account_insights', 'post_insights', 'activity', 'full')),
  status text not null check (status in ('running', 'completed', 'failed')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  posts_synced integer not null default 0,
  days_synced integer not null default 0,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists analytics_sync_runs_org_started_idx
  on public.analytics_sync_runs (organization_id, started_at desc);

alter table public.analytics_sync_runs enable row level security;

create policy "Allow public read access on analytics_sync_runs"
  on public.analytics_sync_runs for select to anon, authenticated using (true);
create policy "Allow public insert access on analytics_sync_runs"
  on public.analytics_sync_runs for insert to anon, authenticated with check (true);
create policy "Allow public update access on analytics_sync_runs"
  on public.analytics_sync_runs for update to anon, authenticated
  using (true) with check (true);
create policy "Allow public delete access on analytics_sync_runs"
  on public.analytics_sync_runs for delete to anon, authenticated using (true);
