-- Per-user Approvals & Scheduling summary card order + colors.

alter table public.organization_users
  add column if not exists approvals_layout jsonb not null default '{}'::jsonb;

comment on column public.organization_users.approvals_layout is
  'Per-membership Approvals summary cards: { version, order[], colors{} }. Empty object means product default.';
