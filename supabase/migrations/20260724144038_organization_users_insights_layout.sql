-- Per-user Insights overview KPI card order + colors.

alter table public.organization_users
  add column if not exists insights_layout jsonb not null default '{}'::jsonb;

comment on column public.organization_users.insights_layout is
  'Per-membership Insights KPI cards: { version, order[], colors{} }. Empty object means product default.';
