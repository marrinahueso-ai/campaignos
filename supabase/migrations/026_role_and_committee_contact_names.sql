-- Contact person names for leadership roles and committee chairs.

alter table public.organization_roles
  add column if not exists contact_name text;

alter table public.organization_committees
  add column if not exists contact_name text;
