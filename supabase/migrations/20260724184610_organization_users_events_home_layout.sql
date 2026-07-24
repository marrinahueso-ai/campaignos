-- Per-user Events Home summary card order + colors.

alter table public.organization_users
  add column if not exists events_home_layout jsonb not null default '{}'::jsonb;

comment on column public.organization_users.events_home_layout is
  'Per-membership Events Home summary cards: { version, order[], colors{} }. Empty object means product default.';
