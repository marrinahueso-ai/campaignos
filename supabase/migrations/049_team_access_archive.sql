-- Soft-archive support for team-access unified management

alter table public.organization_committees
  add column if not exists archived_at timestamptz;

alter table public.organization_roles
  add column if not exists archived_at timestamptz;

create index if not exists organization_committees_archived_at_idx
  on public.organization_committees (organization_id, archived_at);

create index if not exists organization_roles_archived_at_idx
  on public.organization_roles (organization_id, archived_at);
