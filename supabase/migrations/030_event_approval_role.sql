-- Per-event approval routing override (falls back to org responsibility matrix)
alter table public.events
  add column if not exists approval_organization_role_id uuid
    references public.organization_roles (id) on delete set null;

create index if not exists events_approval_organization_role_id_idx
  on public.events (approval_organization_role_id)
  where approval_organization_role_id is not null;
