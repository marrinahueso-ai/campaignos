-- Per-user Today dashboard widget layout (Stripe-style Your overview).

alter table public.organization_users
  add column if not exists dashboard_layout jsonb not null default '{}'::jsonb;

comment on column public.organization_users.dashboard_layout is
  'Per-membership Today overview layout: { version, main[], rail[] }. Empty object means product default.';
