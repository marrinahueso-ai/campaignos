-- Unified Inbox foundation: threads, messages, and org sync settings (Phase 1 schema for Phases 2–5)

create type public.inbox_channel_type as enum (
  'instagram_dm',
  'facebook_message',
  'instagram_comment',
  'facebook_comment'
);

create type public.inbox_item_status as enum (
  'pending',
  'approved',
  'sent',
  'archived'
);

create type public.inbox_message_direction as enum (
  'inbound',
  'outbound'
);

create table if not exists public.inbox_threads (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  channel_type public.inbox_channel_type not null,
  external_thread_id text not null,
  external_post_id text,
  participant_name text,
  participant_external_id text,
  subject text,
  last_message_snippet text,
  last_message_at timestamptz,
  unread_count integer not null default 0,
  status public.inbox_item_status not null default 'pending',
  synced_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, channel_type, external_thread_id)
);

create index if not exists inbox_threads_org_id_idx
  on public.inbox_threads (organization_id);

create index if not exists inbox_threads_org_channel_idx
  on public.inbox_threads (organization_id, channel_type);

create index if not exists inbox_threads_last_message_at_idx
  on public.inbox_threads (organization_id, last_message_at desc nulls last);

alter table public.inbox_threads enable row level security;

drop policy if exists "Allow public read access on inbox_threads"
  on public.inbox_threads;
drop policy if exists "Allow public insert access on inbox_threads"
  on public.inbox_threads;
drop policy if exists "Allow public update access on inbox_threads"
  on public.inbox_threads;
drop policy if exists "Allow public delete access on inbox_threads"
  on public.inbox_threads;

create policy "Allow public read access on inbox_threads"
  on public.inbox_threads for select to anon, authenticated using (true);
create policy "Allow public insert access on inbox_threads"
  on public.inbox_threads for insert to anon, authenticated with check (true);
create policy "Allow public update access on inbox_threads"
  on public.inbox_threads for update to anon, authenticated
  using (true) with check (true);
create policy "Allow public delete access on inbox_threads"
  on public.inbox_threads for delete to anon, authenticated using (true);

create table if not exists public.inbox_messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  thread_id uuid not null references public.inbox_threads (id) on delete cascade,
  channel_type public.inbox_channel_type not null,
  external_message_id text not null,
  direction public.inbox_message_direction not null,
  body text not null,
  sender_name text,
  sender_external_id text,
  sent_at timestamptz,
  status public.inbox_item_status not null default 'pending',
  ai_draft_body text,
  ai_draft_generated_at timestamptz,
  approved_body text,
  approved_at timestamptz,
  approved_by_user_id uuid references auth.users (id) on delete set null,
  sent_to_platform_at timestamptz,
  external_send_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, channel_type, external_message_id)
);

create index if not exists inbox_messages_org_id_idx
  on public.inbox_messages (organization_id);

create index if not exists inbox_messages_thread_id_idx
  on public.inbox_messages (thread_id);

create index if not exists inbox_messages_status_idx
  on public.inbox_messages (organization_id, status);

alter table public.inbox_messages enable row level security;

drop policy if exists "Allow public read access on inbox_messages"
  on public.inbox_messages;
drop policy if exists "Allow public insert access on inbox_messages"
  on public.inbox_messages;
drop policy if exists "Allow public update access on inbox_messages"
  on public.inbox_messages;
drop policy if exists "Allow public delete access on inbox_messages"
  on public.inbox_messages;

create policy "Allow public read access on inbox_messages"
  on public.inbox_messages for select to anon, authenticated using (true);
create policy "Allow public insert access on inbox_messages"
  on public.inbox_messages for insert to anon, authenticated with check (true);
create policy "Allow public update access on inbox_messages"
  on public.inbox_messages for update to anon, authenticated
  using (true) with check (true);
create policy "Allow public delete access on inbox_messages"
  on public.inbox_messages for delete to anon, authenticated using (true);

-- Org-level inbox sync preferences (Phase 2 webhook/cron will populate threads/messages)
create table if not exists public.organization_inbox_settings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  sync_enabled boolean not null default false,
  last_synced_at timestamptz,
  last_sync_error text,
  messaging_scopes_granted text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id)
);

create index if not exists organization_inbox_settings_org_id_idx
  on public.organization_inbox_settings (organization_id);

alter table public.organization_inbox_settings enable row level security;

drop policy if exists "Allow public read access on organization_inbox_settings"
  on public.organization_inbox_settings;
drop policy if exists "Allow public insert access on organization_inbox_settings"
  on public.organization_inbox_settings;
drop policy if exists "Allow public update access on organization_inbox_settings"
  on public.organization_inbox_settings;
drop policy if exists "Allow public delete access on organization_inbox_settings"
  on public.organization_inbox_settings;

create policy "Allow public read access on organization_inbox_settings"
  on public.organization_inbox_settings for select to anon, authenticated using (true);
create policy "Allow public insert access on organization_inbox_settings"
  on public.organization_inbox_settings for insert to anon, authenticated with check (true);
create policy "Allow public update access on organization_inbox_settings"
  on public.organization_inbox_settings for update to anon, authenticated
  using (true) with check (true);
create policy "Allow public delete access on organization_inbox_settings"
  on public.organization_inbox_settings for delete to anon, authenticated using (true);
