-- Per-user Files page event carousel order + colors.

alter table public.organization_users
  add column if not exists files_layout jsonb not null default '{}'::jsonb;

comment on column public.organization_users.files_layout is
  'Per-membership Files event carousel: { version, order[], colors{} }. Empty object means product default.';
