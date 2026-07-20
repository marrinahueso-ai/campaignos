-- Phase C: membership-scoped RLS for multi-tenant org isolation.
--
-- Remote project zyllfqieeihshnwpakiv applied this as four history entries
-- (membership_scoped_rls + membership_scoped_rls_policies{,_2,_3}). This file
-- remains the single source of truth for local/CI applies.
--
-- Intent:
--   * Authenticated users may only read/write rows for orgs where they have an
--     active membership (organization_users.status = 'active', user_id = auth.uid()).
--   * Deactivated / invited-only users do not retain org data access via RLS
--     (compatible with getActiveMembership / getOrganizationAccessState).
--   * Service role bypasses RLS (invites provisioning, cron, admin paths).
--   * Public invite token lookup uses a narrow SECURITY DEFINER RPC (not open SELECT).
--   * Avoid recursive RLS on organization_users via private.is_active_org_member.
--
-- Performance: wrap auth.uid() in (select auth.uid()); helper is STABLE SECURITY DEFINER.
-- Index supports the membership helper lookup.

-- ---------------------------------------------------------------------------
-- Helpers (private schema — not exposed via Data API)
-- ---------------------------------------------------------------------------

create schema if not exists private;

revoke all on schema private from public;
grant usage on schema private to postgres, service_role, authenticated, anon;

create or replace function private.is_active_org_member(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_users ou
    where ou.organization_id = p_organization_id
      and ou.user_id = (select auth.uid())
      and ou.status = 'active'
  );
$$;

comment on function private.is_active_org_member(uuid) is
  'RLS helper: true when auth.uid() has an active organization_users row for the org. SECURITY DEFINER avoids recursive RLS on organization_users.';

revoke all on function private.is_active_org_member(uuid) from public;
grant execute on function private.is_active_org_member(uuid) to authenticated, service_role;

create or replace function private.can_access_event(p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.events e
    join public.school_years sy on sy.id = e.school_year_id
    where e.id = p_event_id
      and private.is_active_org_member(sy.organization_id)
  );
$$;

comment on function private.can_access_event(uuid) is
  'RLS helper: event access via school_years.organization_id + active membership.';

revoke all on function private.can_access_event(uuid) from public;
grant execute on function private.can_access_event(uuid) to authenticated, service_role;

-- Must be SECURITY DEFINER: under RLS, non-members cannot see organization_users
-- rows, so a plain NOT EXISTS would incorrectly look like an empty org.
create or replace function private.org_has_any_membership(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_users ou
    where ou.organization_id = p_organization_id
  );
$$;

comment on function private.org_has_any_membership(uuid) is
  'RLS helper: true when the org has any organization_users row (bypasses RLS).';

revoke all on function private.org_has_any_membership(uuid) from public;
grant execute on function private.org_has_any_membership(uuid) to authenticated, service_role;

-- Partial index for active-membership checks
create index if not exists organization_users_active_membership_idx
  on public.organization_users (organization_id, user_id)
  where status = 'active' and user_id is not null;

create index if not exists events_school_year_id_idx
  on public.events (school_year_id)
  where school_year_id is not null;

-- ---------------------------------------------------------------------------
-- Invite token lookup (anon/authenticated) — narrow SECURITY DEFINER RPC
-- App may also use service role; this keeps invite acceptance working without
-- open SELECT on organization_users.
-- ---------------------------------------------------------------------------

create or replace function public.lookup_organization_invite_by_token(p_token text)
returns table (
  id uuid,
  organization_id uuid,
  user_id uuid,
  email text,
  display_name text,
  organization_role_id uuid,
  organization_role_name text,
  organization_member_id uuid,
  committee_id uuid,
  invite_message text,
  campaign_role text,
  access_template_id text,
  status text,
  invite_token text,
  invite_expires_at timestamptz,
  invited_by_user_id uuid,
  invited_at timestamptz,
  joined_at timestamptz,
  created_at timestamptz,
  organization_name text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    ou.id,
    ou.organization_id,
    ou.user_id,
    ou.email,
    ou.display_name,
    ou.organization_role_id,
    oroles.name as organization_role_name,
    ou.organization_member_id,
    ou.committee_id,
    ou.invite_message,
    ou.campaign_role,
    ou.access_template_id,
    ou.status,
    ou.invite_token,
    ou.invite_expires_at,
    ou.invited_by_user_id,
    ou.invited_at,
    ou.joined_at,
    ou.created_at,
    org.name as organization_name
  from public.organization_users ou
  left join public.organization_roles oroles on oroles.id = ou.organization_role_id
  left join public.organizations org on org.id = ou.organization_id
  where ou.invite_token = p_token
    and ou.status = 'invited'
    and p_token is not null
    and length(trim(p_token)) > 0
  limit 1;
$$;

comment on function public.lookup_organization_invite_by_token(text) is
  'Public invite acceptance: returns a single invited membership by token. Does not expose other org rows.';

revoke all on function public.lookup_organization_invite_by_token(text) from public;
grant execute on function public.lookup_organization_invite_by_token(text) to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- organization_users
-- ---------------------------------------------------------------------------

drop policy if exists "Allow public read access on organization_users"
  on public.organization_users;
drop policy if exists "Allow public insert access on organization_users"
  on public.organization_users;
drop policy if exists "Allow public update access on organization_users"
  on public.organization_users;
drop policy if exists "Allow public delete access on organization_users"
  on public.organization_users;

-- Own rows (any status): deactivated routing + profile
create policy "organization_users_select_own"
  on public.organization_users
  for select
  to authenticated
  using (user_id = (select auth.uid()));

-- Active members see teammates (including invited/deactivated) in their org
create policy "organization_users_select_org_active"
  on public.organization_users
  for select
  to authenticated
  using (private.is_active_org_member(organization_id));

-- Founding: first membership for an empty org, or active member managing team
create policy "organization_users_insert_founding_or_member"
  on public.organization_users
  for insert
  to authenticated
  with check (
    private.is_active_org_member(organization_id)
    or (
      user_id = (select auth.uid())
      and status = 'active'
      and not private.org_has_any_membership(organization_id)
    )
  );

-- Active members manage team rows
create policy "organization_users_update_org_active"
  on public.organization_users
  for update
  to authenticated
  using (private.is_active_org_member(organization_id))
  with check (private.is_active_org_member(organization_id));

-- Invitee may claim an invited row that matches their JWT email
create policy "organization_users_update_accept_invite"
  on public.organization_users
  for update
  to authenticated
  using (
    status = 'invited'
    and lower(email) = lower(coalesce((select auth.jwt() ->> 'email'), ''))
  )
  with check (
    user_id = (select auth.uid())
    and status = 'active'
  );

create policy "organization_users_delete_org_active"
  on public.organization_users
  for delete
  to authenticated
  using (private.is_active_org_member(organization_id));

-- ---------------------------------------------------------------------------
-- Generic org-scoped tables (organization_id column)
-- ---------------------------------------------------------------------------

-- organizations
drop policy if exists "Allow public read access on organizations"
  on public.organizations;
drop policy if exists "Allow public insert access on organizations"
  on public.organizations;
drop policy if exists "Allow public update access on organizations"
  on public.organizations;
drop policy if exists "Allow public delete access on organizations"
  on public.organizations;

-- Empty org readable briefly during founding (before first membership insert)
create policy "organizations_select_member_or_empty"
  on public.organizations
  for select
  to authenticated
  using (
    private.is_active_org_member(id)
    or not private.org_has_any_membership(id)
  );

create policy "organizations_insert_authenticated"
  on public.organizations
  for insert
  to authenticated
  with check (true);

create policy "organizations_update_active_member"
  on public.organizations
  for update
  to authenticated
  using (private.is_active_org_member(id))
  with check (private.is_active_org_member(id));

-- school_years
drop policy if exists "Allow public read access on school_years"
  on public.school_years;
drop policy if exists "Allow public insert access on school_years"
  on public.school_years;
drop policy if exists "Allow public update access on school_years"
  on public.school_years;
drop policy if exists "Allow public delete access on school_years"
  on public.school_years;

create policy "school_years_select_active_member"
  on public.school_years for select to authenticated
  using (private.is_active_org_member(organization_id));
create policy "school_years_insert_active_member"
  on public.school_years for insert to authenticated
  with check (private.is_active_org_member(organization_id));
create policy "school_years_update_active_member"
  on public.school_years for update to authenticated
  using (private.is_active_org_member(organization_id))
  with check (private.is_active_org_member(organization_id));
create policy "school_years_delete_active_member"
  on public.school_years for delete to authenticated
  using (private.is_active_org_member(organization_id));

-- organization_roles
drop policy if exists "Allow public read access on organization_roles"
  on public.organization_roles;
drop policy if exists "Allow public insert access on organization_roles"
  on public.organization_roles;
drop policy if exists "Allow public update access on organization_roles"
  on public.organization_roles;
drop policy if exists "Allow public delete access on organization_roles"
  on public.organization_roles;

create policy "organization_roles_select_active_member"
  on public.organization_roles for select to authenticated
  using (private.is_active_org_member(organization_id));
create policy "organization_roles_insert_active_member"
  on public.organization_roles for insert to authenticated
  with check (private.is_active_org_member(organization_id));
create policy "organization_roles_update_active_member"
  on public.organization_roles for update to authenticated
  using (private.is_active_org_member(organization_id))
  with check (private.is_active_org_member(organization_id));
create policy "organization_roles_delete_active_member"
  on public.organization_roles for delete to authenticated
  using (private.is_active_org_member(organization_id));

-- organization_members (roster)
drop policy if exists "Allow public read access on organization_members"
  on public.organization_members;
drop policy if exists "Allow public insert access on organization_members"
  on public.organization_members;
drop policy if exists "Allow public update access on organization_members"
  on public.organization_members;
drop policy if exists "Allow public delete access on organization_members"
  on public.organization_members;

create policy "organization_members_select_active_member"
  on public.organization_members for select to authenticated
  using (private.is_active_org_member(organization_id));
create policy "organization_members_insert_active_member"
  on public.organization_members for insert to authenticated
  with check (private.is_active_org_member(organization_id));
create policy "organization_members_update_active_member"
  on public.organization_members for update to authenticated
  using (private.is_active_org_member(organization_id))
  with check (private.is_active_org_member(organization_id));
create policy "organization_members_delete_active_member"
  on public.organization_members for delete to authenticated
  using (private.is_active_org_member(organization_id));

-- organization_committees
drop policy if exists "Allow public read access on organization_committees"
  on public.organization_committees;
drop policy if exists "Allow public insert access on organization_committees"
  on public.organization_committees;
drop policy if exists "Allow public update access on organization_committees"
  on public.organization_committees;
drop policy if exists "Allow public delete access on organization_committees"
  on public.organization_committees;

create policy "organization_committees_select_active_member"
  on public.organization_committees for select to authenticated
  using (private.is_active_org_member(organization_id));
create policy "organization_committees_insert_active_member"
  on public.organization_committees for insert to authenticated
  with check (private.is_active_org_member(organization_id));
create policy "organization_committees_update_active_member"
  on public.organization_committees for update to authenticated
  using (private.is_active_org_member(organization_id))
  with check (private.is_active_org_member(organization_id));
create policy "organization_committees_delete_active_member"
  on public.organization_committees for delete to authenticated
  using (private.is_active_org_member(organization_id));

-- organization_committee_assignments
drop policy if exists "Allow authenticated read organization_committee_assignments"
  on public.organization_committee_assignments;
drop policy if exists "Allow authenticated insert organization_committee_assignments"
  on public.organization_committee_assignments;
drop policy if exists "Allow authenticated update organization_committee_assignments"
  on public.organization_committee_assignments;
drop policy if exists "Allow authenticated delete organization_committee_assignments"
  on public.organization_committee_assignments;

create policy "organization_committee_assignments_select_active_member"
  on public.organization_committee_assignments for select to authenticated
  using (private.is_active_org_member(organization_id));
create policy "organization_committee_assignments_insert_active_member"
  on public.organization_committee_assignments for insert to authenticated
  with check (private.is_active_org_member(organization_id));
create policy "organization_committee_assignments_update_active_member"
  on public.organization_committee_assignments for update to authenticated
  using (private.is_active_org_member(organization_id))
  with check (private.is_active_org_member(organization_id));
create policy "organization_committee_assignments_delete_active_member"
  on public.organization_committee_assignments for delete to authenticated
  using (private.is_active_org_member(organization_id));

-- organization_access_templates
drop policy if exists "Allow authenticated read organization_access_templates"
  on public.organization_access_templates;
drop policy if exists "Allow authenticated insert organization_access_templates"
  on public.organization_access_templates;
drop policy if exists "Allow authenticated update organization_access_templates"
  on public.organization_access_templates;
drop policy if exists "Allow authenticated delete organization_access_templates"
  on public.organization_access_templates;

create policy "organization_access_templates_select_active_member"
  on public.organization_access_templates for select to authenticated
  using (private.is_active_org_member(organization_id));
create policy "organization_access_templates_insert_active_member"
  on public.organization_access_templates for insert to authenticated
  with check (private.is_active_org_member(organization_id));
create policy "organization_access_templates_update_active_member"
  on public.organization_access_templates for update to authenticated
  using (private.is_active_org_member(organization_id))
  with check (private.is_active_org_member(organization_id));
create policy "organization_access_templates_delete_active_member"
  on public.organization_access_templates for delete to authenticated
  using (private.is_active_org_member(organization_id));

-- organization_user_event_assignments
drop policy if exists "Allow authenticated read organization_user_event_assignments"
  on public.organization_user_event_assignments;
drop policy if exists "Allow authenticated insert organization_user_event_assignments"
  on public.organization_user_event_assignments;
drop policy if exists "Allow authenticated update organization_user_event_assignments"
  on public.organization_user_event_assignments;
drop policy if exists "Allow authenticated delete organization_user_event_assignments"
  on public.organization_user_event_assignments;

create policy "organization_user_event_assignments_select_active_member"
  on public.organization_user_event_assignments for select to authenticated
  using (private.is_active_org_member(organization_id));
create policy "organization_user_event_assignments_insert_active_member"
  on public.organization_user_event_assignments for insert to authenticated
  with check (private.is_active_org_member(organization_id));
create policy "organization_user_event_assignments_update_active_member"
  on public.organization_user_event_assignments for update to authenticated
  using (private.is_active_org_member(organization_id))
  with check (private.is_active_org_member(organization_id));
create policy "organization_user_event_assignments_delete_active_member"
  on public.organization_user_event_assignments for delete to authenticated
  using (private.is_active_org_member(organization_id));

-- organization_member_event_assignments
drop policy if exists "Allow authenticated read organization_member_event_assignments"
  on public.organization_member_event_assignments;
drop policy if exists "Allow authenticated insert organization_member_event_assignment"
  on public.organization_member_event_assignments;
drop policy if exists "Allow authenticated insert organization_member_event_assignments"
  on public.organization_member_event_assignments;
drop policy if exists "Allow authenticated update organization_member_event_assignment"
  on public.organization_member_event_assignments;
drop policy if exists "Allow authenticated update organization_member_event_assignments"
  on public.organization_member_event_assignments;
drop policy if exists "Allow authenticated delete organization_member_event_assignment"
  on public.organization_member_event_assignments;
drop policy if exists "Allow authenticated delete organization_member_event_assignments"
  on public.organization_member_event_assignments;

create policy "organization_member_event_assignments_select_active_member"
  on public.organization_member_event_assignments for select to authenticated
  using (private.is_active_org_member(organization_id));
create policy "organization_member_event_assignments_insert_active_member"
  on public.organization_member_event_assignments for insert to authenticated
  with check (private.is_active_org_member(organization_id));
create policy "organization_member_event_assignments_update_active_member"
  on public.organization_member_event_assignments for update to authenticated
  using (private.is_active_org_member(organization_id))
  with check (private.is_active_org_member(organization_id));
create policy "organization_member_event_assignments_delete_active_member"
  on public.organization_member_event_assignments for delete to authenticated
  using (private.is_active_org_member(organization_id));

-- responsibility_matrix
drop policy if exists "Allow public read access on responsibility_matrix"
  on public.responsibility_matrix;
drop policy if exists "Allow public insert access on responsibility_matrix"
  on public.responsibility_matrix;
drop policy if exists "Allow public update access on responsibility_matrix"
  on public.responsibility_matrix;
drop policy if exists "Allow public delete access on responsibility_matrix"
  on public.responsibility_matrix;

create policy "responsibility_matrix_select_active_member"
  on public.responsibility_matrix for select to authenticated
  using (private.is_active_org_member(organization_id));
create policy "responsibility_matrix_insert_active_member"
  on public.responsibility_matrix for insert to authenticated
  with check (private.is_active_org_member(organization_id));
create policy "responsibility_matrix_update_active_member"
  on public.responsibility_matrix for update to authenticated
  using (private.is_active_org_member(organization_id))
  with check (private.is_active_org_member(organization_id));
create policy "responsibility_matrix_delete_active_member"
  on public.responsibility_matrix for delete to authenticated
  using (private.is_active_org_member(organization_id));

-- committee_defaults
drop policy if exists "Allow public read access on committee_defaults"
  on public.committee_defaults;
drop policy if exists "Allow public insert access on committee_defaults"
  on public.committee_defaults;
drop policy if exists "Allow public update access on committee_defaults"
  on public.committee_defaults;
drop policy if exists "Allow public delete access on committee_defaults"
  on public.committee_defaults;

create policy "committee_defaults_select_active_member"
  on public.committee_defaults for select to authenticated
  using (private.is_active_org_member(organization_id));
create policy "committee_defaults_insert_active_member"
  on public.committee_defaults for insert to authenticated
  with check (private.is_active_org_member(organization_id));
create policy "committee_defaults_update_active_member"
  on public.committee_defaults for update to authenticated
  using (private.is_active_org_member(organization_id))
  with check (private.is_active_org_member(organization_id));
create policy "committee_defaults_delete_active_member"
  on public.committee_defaults for delete to authenticated
  using (private.is_active_org_member(organization_id));

-- brand_assets (school setup / org branding)
drop policy if exists "Allow public read access on brand_assets"
  on public.brand_assets;
drop policy if exists "Allow public insert access on brand_assets"
  on public.brand_assets;
drop policy if exists "Allow public update access on brand_assets"
  on public.brand_assets;
drop policy if exists "Allow public delete access on brand_assets"
  on public.brand_assets;

create policy "brand_assets_select_active_member"
  on public.brand_assets for select to authenticated
  using (private.is_active_org_member(organization_id));
create policy "brand_assets_insert_active_member"
  on public.brand_assets for insert to authenticated
  with check (private.is_active_org_member(organization_id));
create policy "brand_assets_update_active_member"
  on public.brand_assets for update to authenticated
  using (private.is_active_org_member(organization_id))
  with check (private.is_active_org_member(organization_id));
create policy "brand_assets_delete_active_member"
  on public.brand_assets for delete to authenticated
  using (private.is_active_org_member(organization_id));

-- developer_tool_audit_log
drop policy if exists "Allow authenticated read developer_tool_audit_log"
  on public.developer_tool_audit_log;
drop policy if exists "Allow authenticated insert developer_tool_audit_log"
  on public.developer_tool_audit_log;

create policy "developer_tool_audit_log_select_active_member"
  on public.developer_tool_audit_log for select to authenticated
  using (private.is_active_org_member(organization_id));
create policy "developer_tool_audit_log_insert_active_member"
  on public.developer_tool_audit_log for insert to authenticated
  with check (private.is_active_org_member(organization_id));

-- ---------------------------------------------------------------------------
-- events (scoped via school_years.organization_id)
-- ---------------------------------------------------------------------------

drop policy if exists "Allow public read access on events" on public.events;
drop policy if exists "Allow public insert access on events" on public.events;
drop policy if exists "Allow public update access on events" on public.events;
drop policy if exists "Allow public delete access on events" on public.events;

create policy "events_select_active_member"
  on public.events
  for select
  to authenticated
  using (
    school_year_id is not null
    and exists (
      select 1
      from public.school_years sy
      where sy.id = events.school_year_id
        and private.is_active_org_member(sy.organization_id)
    )
  );

create policy "events_insert_active_member"
  on public.events
  for insert
  to authenticated
  with check (
    school_year_id is not null
    and exists (
      select 1
      from public.school_years sy
      where sy.id = events.school_year_id
        and private.is_active_org_member(sy.organization_id)
    )
  );

create policy "events_update_active_member"
  on public.events
  for update
  to authenticated
  using (
    school_year_id is not null
    and exists (
      select 1
      from public.school_years sy
      where sy.id = events.school_year_id
        and private.is_active_org_member(sy.organization_id)
    )
  )
  with check (
    school_year_id is not null
    and exists (
      select 1
      from public.school_years sy
      where sy.id = events.school_year_id
        and private.is_active_org_member(sy.organization_id)
    )
  );

create policy "events_delete_active_member"
  on public.events
  for delete
  to authenticated
  using (
    school_year_id is not null
    and exists (
      select 1
      from public.school_years sy
      where sy.id = events.school_year_id
        and private.is_active_org_member(sy.organization_id)
    )
  );
