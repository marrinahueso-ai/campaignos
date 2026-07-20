-- Allow org-created access templates (custom_*) while keeping system role ids.
-- Custom templates store a base_role used for auth; optional access_template_id
-- on memberships preserves the custom label when assigned.

alter table public.organization_access_templates
  drop constraint if exists organization_access_templates_template_id_check;

alter table public.organization_access_templates
  add constraint organization_access_templates_template_id_check
  check (
    template_id in (
      'admin',
      'president',
      'vp_communications',
      'committee_chair',
      'contributor',
      'view_only',
      'developer',
      'tester'
    )
    or template_id ~ '^custom_[a-z0-9_]+$'
  );

alter table public.organization_access_templates
  add column if not exists base_role text;

update public.organization_access_templates
set base_role = template_id
where base_role is null
  and template_id in (
    'admin',
    'president',
    'vp_communications',
    'committee_chair',
    'contributor',
    'view_only',
    'developer',
    'tester'
  );

update public.organization_access_templates
set base_role = 'contributor'
where base_role is null;

alter table public.organization_access_templates
  alter column base_role set default 'contributor';

alter table public.organization_access_templates
  alter column base_role set not null;

alter table public.organization_access_templates
  drop constraint if exists organization_access_templates_base_role_check;

alter table public.organization_access_templates
  add constraint organization_access_templates_base_role_check
  check (
    base_role in (
      'admin',
      'president',
      'vp_communications',
      'committee_chair',
      'contributor',
      'view_only',
      'developer',
      'tester'
    )
  );

alter table public.organization_users
  add column if not exists access_template_id text;
