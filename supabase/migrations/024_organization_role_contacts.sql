-- Organization role contact cards: email, phone, kind, and display order.
-- Roles are fully school-defined — no locked system roles going forward.

alter table public.organization_roles
  add column if not exists contact_email text,
  add column if not exists contact_phone text,
  add column if not exists role_kind text
    check (role_kind is null or role_kind in ('president', 'vp', 'other')),
  add column if not exists sort_order int not null default 0;

create index if not exists organization_roles_org_sort_idx
  on public.organization_roles (organization_id, sort_order);
