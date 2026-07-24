-- Per-user Calendar layer colors (Events / Scheduled / Published).

alter table public.organization_users
  add column if not exists calendar_layout jsonb not null default '{}'::jsonb;

comment on column public.organization_users.calendar_layout is
  'Per-membership Calendar Show-layer colors: { version, colors{ events, scheduled, published } }. Empty object means product defaults.';
