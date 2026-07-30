-- Durable delivery ledger for one-time transactional notices.
-- Resend idempotency keys expire after 24 hours; this keeps recurring jobs
-- from re-sending an already delivered product notification.
create table if not exists public.transactional_notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  notification_type text not null check (
    notification_type in (
      'approval-reminder',
      'trial-ending',
      'payment-failed',
      'meta-disconnected'
    )
  ),
  entity_key text not null,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  unique (notification_type, entity_key)
);

comment on table public.transactional_notification_deliveries is
  'Service-owned durable idempotency ledger for Resend transactional product notices.';

alter table public.transactional_notification_deliveries enable row level security;
