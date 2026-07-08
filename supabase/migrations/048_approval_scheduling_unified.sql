-- Unified Approvals & Scheduling: Campaign Builder queue items + notification log.
-- Classic approval_requests remain the source of truth for event-workspace flows.

create table if not exists public.approval_scheduling_items (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  approval_request_id uuid references public.approval_requests (id) on delete set null,
  communication_item_id uuid references public.communication_items (id) on delete set null,
  source text not null default 'campaign_builder'
    check (source in ('classic', 'campaign_builder')),
  campaign_milestone_id text,
  campaign_name text,
  milestone_name text not null,
  workflow_status text not null default 'in_queue'
    check (workflow_status in (
      'in_queue',
      'assigned_to_me',
      'changes_requested',
      'scheduled',
      'posted',
      'published'
    )),
  assigned_user_id uuid references public.organization_users (id) on delete set null,
  assigned_organization_role_id uuid references public.organization_roles (id) on delete set null,
  requested_by_user_id uuid references public.organization_users (id) on delete set null,
  delivery_method text,
  platforms jsonb not null default '[]'::jsonb,
  schedule_at timestamptz,
  caption_text text,
  story_caption text,
  feed_artwork_url text,
  story_artwork_url text,
  notes text,
  requested_at timestamptz not null default now(),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists approval_scheduling_items_event_id_idx
  on public.approval_scheduling_items (event_id);

create index if not exists approval_scheduling_items_workflow_status_idx
  on public.approval_scheduling_items (workflow_status);

create index if not exists approval_scheduling_items_assigned_user_idx
  on public.approval_scheduling_items (assigned_user_id)
  where assigned_user_id is not null;

create table if not exists public.approval_notification_log (
  id uuid primary key default gen_random_uuid(),
  approval_request_id uuid references public.approval_requests (id) on delete set null,
  scheduling_item_id uuid references public.approval_scheduling_items (id) on delete set null,
  event_id uuid references public.events (id) on delete cascade,
  notification_type text not null
    check (notification_type in (
      'approval_assigned',
      'change_requested',
      'content_approved',
      'scheduled_delivery'
    )),
  recipient_email text,
  status text not null default 'logged'
    check (status in ('logged', 'sent', 'failed', 'skipped')),
  provider_message_id text,
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists approval_notification_log_event_id_idx
  on public.approval_notification_log (event_id);
