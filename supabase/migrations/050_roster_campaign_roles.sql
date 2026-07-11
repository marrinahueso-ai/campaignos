-- Store access level on roster records (roles, members, committees) without requiring org_users.

alter table public.organization_roles
  add column if not exists campaign_role text
    check (
      campaign_role is null
      or campaign_role in (
        'admin',
        'president',
        'vp_communications',
        'committee_chair',
        'contributor',
        'view_only'
      )
    );

alter table public.organization_members
  add column if not exists campaign_role text
    check (
      campaign_role is null
      or campaign_role in (
        'admin',
        'president',
        'vp_communications',
        'committee_chair',
        'contributor',
        'view_only'
      )
    );

alter table public.organization_committees
  add column if not exists campaign_role text
    check (
      campaign_role is null
      or campaign_role in (
        'admin',
        'president',
        'vp_communications',
        'committee_chair',
        'contributor',
        'view_only'
      )
    );
