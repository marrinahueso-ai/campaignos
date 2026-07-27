-- Per-membership Account notification toggles (Settings Ease Phase 7).

alter table public.organization_users
  add column if not exists notification_preferences jsonb not null default '{}'::jsonb;

comment on column public.organization_users.notification_preferences is
  'Per-membership quiet email prefs: { approvalNeedsAttention, inboxFollowUps, weeklySummaryEmail }. Empty object means product defaults (on, on, off).';
