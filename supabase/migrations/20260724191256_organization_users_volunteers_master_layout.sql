-- Per-user Volunteer Master KPI card order + colors.

alter table public.organization_users
  add column if not exists volunteers_master_layout jsonb not null default '{}'::jsonb;

comment on column public.organization_users.volunteers_master_layout is
  'Per-membership Volunteer Master KPI cards: { version, order[], colors{} }. Empty object means product default.';
