-- Per-user Vendor Directory summary card order + colors (Edit mode DnD / palette).
alter table public.organization_users
  add column if not exists vendors_directory_layout jsonb not null default '{}'::jsonb;

comment on column public.organization_users.vendors_directory_layout is
  'Per-user Vendor Directory summary KPI card order and colors (versioned jsonb).';
