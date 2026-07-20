-- Phase C2 / broader membership-scoped RLS
-- Extends 064 helpers (private.is_active_org_member, private.can_access_event)
-- to vendors, inbox, communications, playbooks, approvals, volunteers, meta, etc.
--
-- Applied remotely as split migrations: broader_membership_rls_0 … _8
-- (plus 066_broader_membership_rls_remaining for leftover open tables).
-- This file remains the source of truth for the C2 policy set.
--
-- Intent:
--   * Replace open "Allow public … qual=true" policies with active-membership checks.
--   * Org-keyed tables → private.is_active_org_member(organization_id)
--   * Event-keyed tables → private.can_access_event(event_id)
--   * System communication_playbooks (organization_id IS NULL) remain readable by
--     any authenticated user; mutations only for org-owned rows.
--   * Service role bypasses RLS (cron, provisioning, Resend hooks).

-- ---------------------------------------------------------------------------
-- Helper: drop all policies on a table
-- ---------------------------------------------------------------------------
create or replace function private.drop_all_policies(p_table regclass)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  pol record;
  t_schema text;
  t_name text;
begin
  select n.nspname, c.relname
  into t_schema, t_name
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where c.oid = p_table;

  for pol in
    select policyname
    from pg_policies
    where schemaname = t_schema
      and tablename = t_name
  loop
    execute format(
      'drop policy if exists %I on %I.%I',
      pol.policyname,
      t_schema,
      t_name
    );
  end loop;
end;
$$;

revoke all on function private.drop_all_policies(regclass) from public;

-- ---------------------------------------------------------------------------
-- Org-scoped: vendors + related
-- ---------------------------------------------------------------------------
select private.drop_all_policies('public.vendors');
alter table public.vendors enable row level security;
create policy vendors_select_active_member on public.vendors
  for select to authenticated
  using (private.is_active_org_member(organization_id));
create policy vendors_insert_active_member on public.vendors
  for insert to authenticated
  with check (private.is_active_org_member(organization_id));
create policy vendors_update_active_member on public.vendors
  for update to authenticated
  using (private.is_active_org_member(organization_id))
  with check (private.is_active_org_member(organization_id));
create policy vendors_delete_active_member on public.vendors
  for delete to authenticated
  using (private.is_active_org_member(organization_id));

select private.drop_all_policies('public.vendor_categories');
alter table public.vendor_categories enable row level security;
create policy vendor_categories_select_active_member on public.vendor_categories
  for select to authenticated
  using (private.is_active_org_member(organization_id));
create policy vendor_categories_insert_active_member on public.vendor_categories
  for insert to authenticated
  with check (private.is_active_org_member(organization_id));
create policy vendor_categories_update_active_member on public.vendor_categories
  for update to authenticated
  using (private.is_active_org_member(organization_id))
  with check (private.is_active_org_member(organization_id));
create policy vendor_categories_delete_active_member on public.vendor_categories
  for delete to authenticated
  using (private.is_active_org_member(organization_id));

select private.drop_all_policies('public.vendor_contacts');
alter table public.vendor_contacts enable row level security;
create policy vendor_contacts_select_active_member on public.vendor_contacts
  for select to authenticated
  using (private.is_active_org_member(organization_id));
create policy vendor_contacts_insert_active_member on public.vendor_contacts
  for insert to authenticated
  with check (private.is_active_org_member(organization_id));
create policy vendor_contacts_update_active_member on public.vendor_contacts
  for update to authenticated
  using (private.is_active_org_member(organization_id))
  with check (private.is_active_org_member(organization_id));
create policy vendor_contacts_delete_active_member on public.vendor_contacts
  for delete to authenticated
  using (private.is_active_org_member(organization_id));

select private.drop_all_policies('public.vendor_notes');
alter table public.vendor_notes enable row level security;
create policy vendor_notes_select_active_member on public.vendor_notes
  for select to authenticated
  using (private.is_active_org_member(organization_id));
create policy vendor_notes_insert_active_member on public.vendor_notes
  for insert to authenticated
  with check (private.is_active_org_member(organization_id));
create policy vendor_notes_update_active_member on public.vendor_notes
  for update to authenticated
  using (private.is_active_org_member(organization_id))
  with check (private.is_active_org_member(organization_id));
create policy vendor_notes_delete_active_member on public.vendor_notes
  for delete to authenticated
  using (private.is_active_org_member(organization_id));

select private.drop_all_policies('public.vendor_documents');
alter table public.vendor_documents enable row level security;
create policy vendor_documents_select_active_member on public.vendor_documents
  for select to authenticated
  using (private.is_active_org_member(organization_id));
create policy vendor_documents_insert_active_member on public.vendor_documents
  for insert to authenticated
  with check (private.is_active_org_member(organization_id));
create policy vendor_documents_update_active_member on public.vendor_documents
  for update to authenticated
  using (private.is_active_org_member(organization_id))
  with check (private.is_active_org_member(organization_id));
create policy vendor_documents_delete_active_member on public.vendor_documents
  for delete to authenticated
  using (private.is_active_org_member(organization_id));

select private.drop_all_policies('public.vendor_payments');
alter table public.vendor_payments enable row level security;
create policy vendor_payments_select_active_member on public.vendor_payments
  for select to authenticated
  using (private.is_active_org_member(organization_id));
create policy vendor_payments_insert_active_member on public.vendor_payments
  for insert to authenticated
  with check (private.is_active_org_member(organization_id));
create policy vendor_payments_update_active_member on public.vendor_payments
  for update to authenticated
  using (private.is_active_org_member(organization_id))
  with check (private.is_active_org_member(organization_id));
create policy vendor_payments_delete_active_member on public.vendor_payments
  for delete to authenticated
  using (private.is_active_org_member(organization_id));

select private.drop_all_policies('public.vendor_event_assignments');
alter table public.vendor_event_assignments enable row level security;
create policy vendor_event_assignments_select_active_member on public.vendor_event_assignments
  for select to authenticated
  using (private.is_active_org_member(organization_id));
create policy vendor_event_assignments_insert_active_member on public.vendor_event_assignments
  for insert to authenticated
  with check (private.is_active_org_member(organization_id));
create policy vendor_event_assignments_update_active_member on public.vendor_event_assignments
  for update to authenticated
  using (private.is_active_org_member(organization_id))
  with check (private.is_active_org_member(organization_id));
create policy vendor_event_assignments_delete_active_member on public.vendor_event_assignments
  for delete to authenticated
  using (private.is_active_org_member(organization_id));

select private.drop_all_policies('public.vendor_activity_logs');
alter table public.vendor_activity_logs enable row level security;
create policy vendor_activity_logs_select_active_member on public.vendor_activity_logs
  for select to authenticated
  using (private.is_active_org_member(organization_id));
create policy vendor_activity_logs_insert_active_member on public.vendor_activity_logs
  for insert to authenticated
  with check (private.is_active_org_member(organization_id));

-- ---------------------------------------------------------------------------
-- Org-scoped: inbox
-- ---------------------------------------------------------------------------
select private.drop_all_policies('public.inbox_threads');
alter table public.inbox_threads enable row level security;
create policy inbox_threads_select_active_member on public.inbox_threads
  for select to authenticated
  using (private.is_active_org_member(organization_id));
create policy inbox_threads_insert_active_member on public.inbox_threads
  for insert to authenticated
  with check (private.is_active_org_member(organization_id));
create policy inbox_threads_update_active_member on public.inbox_threads
  for update to authenticated
  using (private.is_active_org_member(organization_id))
  with check (private.is_active_org_member(organization_id));
create policy inbox_threads_delete_active_member on public.inbox_threads
  for delete to authenticated
  using (private.is_active_org_member(organization_id));

select private.drop_all_policies('public.inbox_messages');
alter table public.inbox_messages enable row level security;
create policy inbox_messages_select_active_member on public.inbox_messages
  for select to authenticated
  using (private.is_active_org_member(organization_id));
create policy inbox_messages_insert_active_member on public.inbox_messages
  for insert to authenticated
  with check (private.is_active_org_member(organization_id));
create policy inbox_messages_update_active_member on public.inbox_messages
  for update to authenticated
  using (private.is_active_org_member(organization_id))
  with check (private.is_active_org_member(organization_id));
create policy inbox_messages_delete_active_member on public.inbox_messages
  for delete to authenticated
  using (private.is_active_org_member(organization_id));

select private.drop_all_policies('public.organization_inbox_settings');
alter table public.organization_inbox_settings enable row level security;
create policy organization_inbox_settings_select_active_member on public.organization_inbox_settings
  for select to authenticated
  using (private.is_active_org_member(organization_id));
create policy organization_inbox_settings_insert_active_member on public.organization_inbox_settings
  for insert to authenticated
  with check (private.is_active_org_member(organization_id));
create policy organization_inbox_settings_update_active_member on public.organization_inbox_settings
  for update to authenticated
  using (private.is_active_org_member(organization_id))
  with check (private.is_active_org_member(organization_id));
create policy organization_inbox_settings_delete_active_member on public.organization_inbox_settings
  for delete to authenticated
  using (private.is_active_org_member(organization_id));

select private.drop_all_policies('public.organization_inbox_ai_sources');
alter table public.organization_inbox_ai_sources enable row level security;
create policy organization_inbox_ai_sources_select_active_member on public.organization_inbox_ai_sources
  for select to authenticated
  using (private.is_active_org_member(organization_id));
create policy organization_inbox_ai_sources_insert_active_member on public.organization_inbox_ai_sources
  for insert to authenticated
  with check (private.is_active_org_member(organization_id));
create policy organization_inbox_ai_sources_update_active_member on public.organization_inbox_ai_sources
  for update to authenticated
  using (private.is_active_org_member(organization_id))
  with check (private.is_active_org_member(organization_id));
create policy organization_inbox_ai_sources_delete_active_member on public.organization_inbox_ai_sources
  for delete to authenticated
  using (private.is_active_org_member(organization_id));

-- ---------------------------------------------------------------------------
-- Org-scoped: integrations / brand / playbook prefs
-- ---------------------------------------------------------------------------
select private.drop_all_policies('public.organization_meta_connections');
alter table public.organization_meta_connections enable row level security;
create policy organization_meta_connections_select_active_member on public.organization_meta_connections
  for select to authenticated
  using (private.is_active_org_member(organization_id));
create policy organization_meta_connections_insert_active_member on public.organization_meta_connections
  for insert to authenticated
  with check (private.is_active_org_member(organization_id));
create policy organization_meta_connections_update_active_member on public.organization_meta_connections
  for update to authenticated
  using (private.is_active_org_member(organization_id))
  with check (private.is_active_org_member(organization_id));
create policy organization_meta_connections_delete_active_member on public.organization_meta_connections
  for delete to authenticated
  using (private.is_active_org_member(organization_id));

select private.drop_all_policies('public.organization_monday_connections');
alter table public.organization_monday_connections enable row level security;
create policy organization_monday_connections_select_active_member on public.organization_monday_connections
  for select to authenticated
  using (private.is_active_org_member(organization_id));
create policy organization_monday_connections_insert_active_member on public.organization_monday_connections
  for insert to authenticated
  with check (private.is_active_org_member(organization_id));
create policy organization_monday_connections_update_active_member on public.organization_monday_connections
  for update to authenticated
  using (private.is_active_org_member(organization_id))
  with check (private.is_active_org_member(organization_id));
create policy organization_monday_connections_delete_active_member on public.organization_monday_connections
  for delete to authenticated
  using (private.is_active_org_member(organization_id));

select private.drop_all_policies('public.organization_monday_board_mappings');
alter table public.organization_monday_board_mappings enable row level security;
create policy organization_monday_board_mappings_select_active_member on public.organization_monday_board_mappings
  for select to authenticated
  using (private.is_active_org_member(organization_id));
create policy organization_monday_board_mappings_insert_active_member on public.organization_monday_board_mappings
  for insert to authenticated
  with check (private.is_active_org_member(organization_id));
create policy organization_monday_board_mappings_update_active_member on public.organization_monday_board_mappings
  for update to authenticated
  using (private.is_active_org_member(organization_id))
  with check (private.is_active_org_member(organization_id));
create policy organization_monday_board_mappings_delete_active_member on public.organization_monday_board_mappings
  for delete to authenticated
  using (private.is_active_org_member(organization_id));

select private.drop_all_policies('public.organization_brand_kit_items');
alter table public.organization_brand_kit_items enable row level security;
create policy organization_brand_kit_items_select_active_member on public.organization_brand_kit_items
  for select to authenticated
  using (private.is_active_org_member(organization_id));
create policy organization_brand_kit_items_insert_active_member on public.organization_brand_kit_items
  for insert to authenticated
  with check (private.is_active_org_member(organization_id));
create policy organization_brand_kit_items_update_active_member on public.organization_brand_kit_items
  for update to authenticated
  using (private.is_active_org_member(organization_id))
  with check (private.is_active_org_member(organization_id));
create policy organization_brand_kit_items_delete_active_member on public.organization_brand_kit_items
  for delete to authenticated
  using (private.is_active_org_member(organization_id));

select private.drop_all_policies('public.organization_hidden_playbooks');
alter table public.organization_hidden_playbooks enable row level security;
create policy organization_hidden_playbooks_select_active_member on public.organization_hidden_playbooks
  for select to authenticated
  using (private.is_active_org_member(organization_id));
create policy organization_hidden_playbooks_insert_active_member on public.organization_hidden_playbooks
  for insert to authenticated
  with check (private.is_active_org_member(organization_id));
create policy organization_hidden_playbooks_update_active_member on public.organization_hidden_playbooks
  for update to authenticated
  using (private.is_active_org_member(organization_id))
  with check (private.is_active_org_member(organization_id));
create policy organization_hidden_playbooks_delete_active_member on public.organization_hidden_playbooks
  for delete to authenticated
  using (private.is_active_org_member(organization_id));

select private.drop_all_policies('public.organization_playbook_defaults');
alter table public.organization_playbook_defaults enable row level security;
create policy organization_playbook_defaults_select_active_member on public.organization_playbook_defaults
  for select to authenticated
  using (private.is_active_org_member(organization_id));
create policy organization_playbook_defaults_insert_active_member on public.organization_playbook_defaults
  for insert to authenticated
  with check (private.is_active_org_member(organization_id));
create policy organization_playbook_defaults_update_active_member on public.organization_playbook_defaults
  for update to authenticated
  using (private.is_active_org_member(organization_id))
  with check (private.is_active_org_member(organization_id));
create policy organization_playbook_defaults_delete_active_member on public.organization_playbook_defaults
  for delete to authenticated
  using (private.is_active_org_member(organization_id));

-- ---------------------------------------------------------------------------
-- Playbooks: global (org null) readable; org-owned membership-scoped
-- ---------------------------------------------------------------------------
select private.drop_all_policies('public.communication_playbooks');
alter table public.communication_playbooks enable row level security;
create policy communication_playbooks_select_global_or_member on public.communication_playbooks
  for select to authenticated
  using (
    organization_id is null
    or private.is_active_org_member(organization_id)
  );
create policy communication_playbooks_insert_active_member on public.communication_playbooks
  for insert to authenticated
  with check (
    organization_id is not null
    and private.is_active_org_member(organization_id)
  );
create policy communication_playbooks_update_active_member on public.communication_playbooks
  for update to authenticated
  using (
    organization_id is not null
    and private.is_active_org_member(organization_id)
  )
  with check (
    organization_id is not null
    and private.is_active_org_member(organization_id)
  );
create policy communication_playbooks_delete_active_member on public.communication_playbooks
  for delete to authenticated
  using (
    organization_id is not null
    and private.is_active_org_member(organization_id)
  );

select private.drop_all_policies('public.communication_playbook_steps');
alter table public.communication_playbook_steps enable row level security;
create policy communication_playbook_steps_select_global_or_member on public.communication_playbook_steps
  for select to authenticated
  using (
    exists (
      select 1
      from public.communication_playbooks p
      where p.id = playbook_id
        and (
          p.organization_id is null
          or private.is_active_org_member(p.organization_id)
        )
    )
  );
create policy communication_playbook_steps_insert_active_member on public.communication_playbook_steps
  for insert to authenticated
  with check (
    exists (
      select 1
      from public.communication_playbooks p
      where p.id = playbook_id
        and p.organization_id is not null
        and private.is_active_org_member(p.organization_id)
    )
  );
create policy communication_playbook_steps_update_active_member on public.communication_playbook_steps
  for update to authenticated
  using (
    exists (
      select 1
      from public.communication_playbooks p
      where p.id = playbook_id
        and p.organization_id is not null
        and private.is_active_org_member(p.organization_id)
    )
  )
  with check (
    exists (
      select 1
      from public.communication_playbooks p
      where p.id = playbook_id
        and p.organization_id is not null
        and private.is_active_org_member(p.organization_id)
    )
  );
create policy communication_playbook_steps_delete_active_member on public.communication_playbook_steps
  for delete to authenticated
  using (
    exists (
      select 1
      from public.communication_playbooks p
      where p.id = playbook_id
        and p.organization_id is not null
        and private.is_active_org_member(p.organization_id)
    )
  );

-- ---------------------------------------------------------------------------
-- Event-scoped: communications, playbook workspace, approvals, builder, meta
-- ---------------------------------------------------------------------------
select private.drop_all_policies('public.communication_items');
alter table public.communication_items enable row level security;
create policy communication_items_select_event_member on public.communication_items
  for select to authenticated
  using (private.can_access_event(event_id));
create policy communication_items_insert_event_member on public.communication_items
  for insert to authenticated
  with check (private.can_access_event(event_id));
create policy communication_items_update_event_member on public.communication_items
  for update to authenticated
  using (private.can_access_event(event_id))
  with check (private.can_access_event(event_id));
create policy communication_items_delete_event_member on public.communication_items
  for delete to authenticated
  using (private.can_access_event(event_id));

select private.drop_all_policies('public.communication_versions');
alter table public.communication_versions enable row level security;
create policy communication_versions_select_event_member on public.communication_versions
  for select to authenticated
  using (
    exists (
      select 1 from public.communication_items ci
      where ci.id = communication_item_id
        and private.can_access_event(ci.event_id)
    )
  );
create policy communication_versions_insert_event_member on public.communication_versions
  for insert to authenticated
  with check (
    exists (
      select 1 from public.communication_items ci
      where ci.id = communication_item_id
        and private.can_access_event(ci.event_id)
    )
  );
create policy communication_versions_update_event_member on public.communication_versions
  for update to authenticated
  using (
    exists (
      select 1 from public.communication_items ci
      where ci.id = communication_item_id
        and private.can_access_event(ci.event_id)
    )
  )
  with check (
    exists (
      select 1 from public.communication_items ci
      where ci.id = communication_item_id
        and private.can_access_event(ci.event_id)
    )
  );
create policy communication_versions_delete_event_member on public.communication_versions
  for delete to authenticated
  using (
    exists (
      select 1 from public.communication_items ci
      where ci.id = communication_item_id
        and private.can_access_event(ci.event_id)
    )
  );

select private.drop_all_policies('public.event_communication_steps');
alter table public.event_communication_steps enable row level security;
create policy event_communication_steps_select_event_member on public.event_communication_steps
  for select to authenticated
  using (private.can_access_event(event_id));
create policy event_communication_steps_insert_event_member on public.event_communication_steps
  for insert to authenticated
  with check (private.can_access_event(event_id));
create policy event_communication_steps_update_event_member on public.event_communication_steps
  for update to authenticated
  using (private.can_access_event(event_id))
  with check (private.can_access_event(event_id));
create policy event_communication_steps_delete_event_member on public.event_communication_steps
  for delete to authenticated
  using (private.can_access_event(event_id));

-- Event playbook workspace tables
select private.drop_all_policies('public.event_playbook_tasks');
alter table public.event_playbook_tasks enable row level security;
create policy event_playbook_tasks_select_event_member on public.event_playbook_tasks
  for select to authenticated using (private.can_access_event(event_id));
create policy event_playbook_tasks_insert_event_member on public.event_playbook_tasks
  for insert to authenticated with check (private.can_access_event(event_id));
create policy event_playbook_tasks_update_event_member on public.event_playbook_tasks
  for update to authenticated
  using (private.can_access_event(event_id))
  with check (private.can_access_event(event_id));
create policy event_playbook_tasks_delete_event_member on public.event_playbook_tasks
  for delete to authenticated using (private.can_access_event(event_id));

select private.drop_all_policies('public.event_playbook_notes');
alter table public.event_playbook_notes enable row level security;
create policy event_playbook_notes_select_event_member on public.event_playbook_notes
  for select to authenticated using (private.can_access_event(event_id));
create policy event_playbook_notes_insert_event_member on public.event_playbook_notes
  for insert to authenticated with check (private.can_access_event(event_id));
create policy event_playbook_notes_update_event_member on public.event_playbook_notes
  for update to authenticated
  using (private.can_access_event(event_id))
  with check (private.can_access_event(event_id));
create policy event_playbook_notes_delete_event_member on public.event_playbook_notes
  for delete to authenticated using (private.can_access_event(event_id));

select private.drop_all_policies('public.event_playbook_files');
alter table public.event_playbook_files enable row level security;
create policy event_playbook_files_select_event_member on public.event_playbook_files
  for select to authenticated using (private.can_access_event(event_id));
create policy event_playbook_files_insert_event_member on public.event_playbook_files
  for insert to authenticated with check (private.can_access_event(event_id));
create policy event_playbook_files_update_event_member on public.event_playbook_files
  for update to authenticated
  using (private.can_access_event(event_id))
  with check (private.can_access_event(event_id));
create policy event_playbook_files_delete_event_member on public.event_playbook_files
  for delete to authenticated using (private.can_access_event(event_id));

select private.drop_all_policies('public.event_playbook_task_groups');
alter table public.event_playbook_task_groups enable row level security;
create policy event_playbook_task_groups_select_event_member on public.event_playbook_task_groups
  for select to authenticated using (private.can_access_event(event_id));
create policy event_playbook_task_groups_insert_event_member on public.event_playbook_task_groups
  for insert to authenticated with check (private.can_access_event(event_id));
create policy event_playbook_task_groups_update_event_member on public.event_playbook_task_groups
  for update to authenticated
  using (private.can_access_event(event_id))
  with check (private.can_access_event(event_id));
create policy event_playbook_task_groups_delete_event_member on public.event_playbook_task_groups
  for delete to authenticated using (private.can_access_event(event_id));

select private.drop_all_policies('public.event_playbook_assignments');
alter table public.event_playbook_assignments enable row level security;
create policy event_playbook_assignments_select_event_member on public.event_playbook_assignments
  for select to authenticated using (private.can_access_event(event_id));
create policy event_playbook_assignments_insert_event_member on public.event_playbook_assignments
  for insert to authenticated with check (private.can_access_event(event_id));
create policy event_playbook_assignments_update_event_member on public.event_playbook_assignments
  for update to authenticated
  using (private.can_access_event(event_id))
  with check (private.can_access_event(event_id));
create policy event_playbook_assignments_delete_event_member on public.event_playbook_assignments
  for delete to authenticated using (private.can_access_event(event_id));

select private.drop_all_policies('public.event_playbook_activity');
alter table public.event_playbook_activity enable row level security;
create policy event_playbook_activity_select_event_member on public.event_playbook_activity
  for select to authenticated using (private.can_access_event(event_id));
create policy event_playbook_activity_insert_event_member on public.event_playbook_activity
  for insert to authenticated with check (private.can_access_event(event_id));
create policy event_playbook_activity_update_event_member on public.event_playbook_activity
  for update to authenticated
  using (private.can_access_event(event_id))
  with check (private.can_access_event(event_id));
create policy event_playbook_activity_delete_event_member on public.event_playbook_activity
  for delete to authenticated using (private.can_access_event(event_id));

select private.drop_all_policies('public.event_playbook_task_monday_links');
alter table public.event_playbook_task_monday_links enable row level security;
create policy event_playbook_task_monday_links_select_active_member on public.event_playbook_task_monday_links
  for select to authenticated
  using (private.is_active_org_member(organization_id));
create policy event_playbook_task_monday_links_insert_active_member on public.event_playbook_task_monday_links
  for insert to authenticated
  with check (private.is_active_org_member(organization_id));
create policy event_playbook_task_monday_links_update_active_member on public.event_playbook_task_monday_links
  for update to authenticated
  using (private.is_active_org_member(organization_id))
  with check (private.is_active_org_member(organization_id));
create policy event_playbook_task_monday_links_delete_active_member on public.event_playbook_task_monday_links
  for delete to authenticated
  using (private.is_active_org_member(organization_id));

-- Approvals + scheduling + builder sessions
select private.drop_all_policies('public.approval_requests');
alter table public.approval_requests enable row level security;
create policy approval_requests_select_event_member on public.approval_requests
  for select to authenticated using (private.can_access_event(event_id));
create policy approval_requests_insert_event_member on public.approval_requests
  for insert to authenticated with check (private.can_access_event(event_id));
create policy approval_requests_update_event_member on public.approval_requests
  for update to authenticated
  using (private.can_access_event(event_id))
  with check (private.can_access_event(event_id));
create policy approval_requests_delete_event_member on public.approval_requests
  for delete to authenticated using (private.can_access_event(event_id));

select private.drop_all_policies('public.approval_scheduling_items');
alter table public.approval_scheduling_items enable row level security;
create policy approval_scheduling_items_select_event_member on public.approval_scheduling_items
  for select to authenticated using (private.can_access_event(event_id));
create policy approval_scheduling_items_insert_event_member on public.approval_scheduling_items
  for insert to authenticated with check (private.can_access_event(event_id));
create policy approval_scheduling_items_update_event_member on public.approval_scheduling_items
  for update to authenticated
  using (private.can_access_event(event_id))
  with check (private.can_access_event(event_id));
create policy approval_scheduling_items_delete_event_member on public.approval_scheduling_items
  for delete to authenticated using (private.can_access_event(event_id));

select private.drop_all_policies('public.approval_notification_log');
alter table public.approval_notification_log enable row level security;
create policy approval_notification_log_select_event_member on public.approval_notification_log
  for select to authenticated using (private.can_access_event(event_id));
create policy approval_notification_log_insert_event_member on public.approval_notification_log
  for insert to authenticated with check (private.can_access_event(event_id));

select private.drop_all_policies('public.campaign_builder_sessions');
alter table public.campaign_builder_sessions enable row level security;
create policy campaign_builder_sessions_select_event_member on public.campaign_builder_sessions
  for select to authenticated using (private.can_access_event(event_id));
create policy campaign_builder_sessions_insert_event_member on public.campaign_builder_sessions
  for insert to authenticated with check (private.can_access_event(event_id));
create policy campaign_builder_sessions_update_event_member on public.campaign_builder_sessions
  for update to authenticated
  using (private.can_access_event(event_id))
  with check (private.can_access_event(event_id));
create policy campaign_builder_sessions_delete_event_member on public.campaign_builder_sessions
  for delete to authenticated using (private.can_access_event(event_id));

select private.drop_all_policies('public.meta_publication_slots');
alter table public.meta_publication_slots enable row level security;
create policy meta_publication_slots_select_event_member on public.meta_publication_slots
  for select to authenticated using (private.can_access_event(event_id));
create policy meta_publication_slots_insert_event_member on public.meta_publication_slots
  for insert to authenticated with check (private.can_access_event(event_id));
create policy meta_publication_slots_update_event_member on public.meta_publication_slots
  for update to authenticated
  using (private.can_access_event(event_id))
  with check (private.can_access_event(event_id));
create policy meta_publication_slots_delete_event_member on public.meta_publication_slots
  for delete to authenticated using (private.can_access_event(event_id));

select private.drop_all_policies('public.meta_social_captions');
alter table public.meta_social_captions enable row level security;
create policy meta_social_captions_select_event_member on public.meta_social_captions
  for select to authenticated using (private.can_access_event(event_id));
create policy meta_social_captions_insert_event_member on public.meta_social_captions
  for insert to authenticated with check (private.can_access_event(event_id));
create policy meta_social_captions_update_event_member on public.meta_social_captions
  for update to authenticated
  using (private.can_access_event(event_id))
  with check (private.can_access_event(event_id));
create policy meta_social_captions_delete_event_member on public.meta_social_captions
  for delete to authenticated using (private.can_access_event(event_id));

-- Volunteers (org + event)
select private.drop_all_policies('public.event_volunteer_sources');
alter table public.event_volunteer_sources enable row level security;
create policy event_volunteer_sources_select_active_member on public.event_volunteer_sources
  for select to authenticated
  using (private.is_active_org_member(organization_id));
create policy event_volunteer_sources_insert_active_member on public.event_volunteer_sources
  for insert to authenticated
  with check (private.is_active_org_member(organization_id));
create policy event_volunteer_sources_update_active_member on public.event_volunteer_sources
  for update to authenticated
  using (private.is_active_org_member(organization_id))
  with check (private.is_active_org_member(organization_id));
create policy event_volunteer_sources_delete_active_member on public.event_volunteer_sources
  for delete to authenticated
  using (private.is_active_org_member(organization_id));

select private.drop_all_policies('public.event_volunteer_assignments');
alter table public.event_volunteer_assignments enable row level security;
create policy event_volunteer_assignments_select_active_member on public.event_volunteer_assignments
  for select to authenticated
  using (private.is_active_org_member(organization_id));
create policy event_volunteer_assignments_insert_active_member on public.event_volunteer_assignments
  for insert to authenticated
  with check (private.is_active_org_member(organization_id));
create policy event_volunteer_assignments_update_active_member on public.event_volunteer_assignments
  for update to authenticated
  using (private.is_active_org_member(organization_id))
  with check (private.is_active_org_member(organization_id));
create policy event_volunteer_assignments_delete_active_member on public.event_volunteer_assignments
  for delete to authenticated
  using (private.is_active_org_member(organization_id));

select private.drop_all_policies('public.event_volunteer_snapshots');
alter table public.event_volunteer_snapshots enable row level security;
create policy event_volunteer_snapshots_select_active_member on public.event_volunteer_snapshots
  for select to authenticated
  using (private.is_active_org_member(organization_id));
create policy event_volunteer_snapshots_insert_active_member on public.event_volunteer_snapshots
  for insert to authenticated
  with check (private.is_active_org_member(organization_id));
create policy event_volunteer_snapshots_update_active_member on public.event_volunteer_snapshots
  for update to authenticated
  using (private.is_active_org_member(organization_id))
  with check (private.is_active_org_member(organization_id));
create policy event_volunteer_snapshots_delete_active_member on public.event_volunteer_snapshots
  for delete to authenticated
  using (private.is_active_org_member(organization_id));

select private.drop_all_policies('public.event_volunteer_sync_attempts');
alter table public.event_volunteer_sync_attempts enable row level security;
create policy event_volunteer_sync_attempts_select_active_member on public.event_volunteer_sync_attempts
  for select to authenticated
  using (private.is_active_org_member(organization_id));
create policy event_volunteer_sync_attempts_insert_active_member on public.event_volunteer_sync_attempts
  for insert to authenticated
  with check (private.is_active_org_member(organization_id));
create policy event_volunteer_sync_attempts_update_active_member on public.event_volunteer_sync_attempts
  for update to authenticated
  using (private.is_active_org_member(organization_id))
  with check (private.is_active_org_member(organization_id));
create policy event_volunteer_sync_attempts_delete_active_member on public.event_volunteer_sync_attempts
  for delete to authenticated
  using (private.is_active_org_member(organization_id));

select private.drop_all_policies('public.event_volunteer_activity_logs');
alter table public.event_volunteer_activity_logs enable row level security;
create policy event_volunteer_activity_logs_select_active_member on public.event_volunteer_activity_logs
  for select to authenticated
  using (private.is_active_org_member(organization_id));
create policy event_volunteer_activity_logs_insert_active_member on public.event_volunteer_activity_logs
  for insert to authenticated
  with check (private.is_active_org_member(organization_id));

-- Creative assets (artwork) — still open after 064
select private.drop_all_policies('public.event_assets');
alter table public.event_assets enable row level security;
create policy event_assets_select_event_member on public.event_assets
  for select to authenticated using (private.can_access_event(event_id));
create policy event_assets_insert_event_member on public.event_assets
  for insert to authenticated with check (private.can_access_event(event_id));
create policy event_assets_update_event_member on public.event_assets
  for update to authenticated
  using (private.can_access_event(event_id))
  with check (private.can_access_event(event_id));
create policy event_assets_delete_event_member on public.event_assets
  for delete to authenticated using (private.can_access_event(event_id));

select private.drop_all_policies('public.event_asset_versions');
alter table public.event_asset_versions enable row level security;
create policy event_asset_versions_select_event_member on public.event_asset_versions
  for select to authenticated
  using (
    exists (
      select 1 from public.event_assets a
      where a.id = event_asset_id
        and private.can_access_event(a.event_id)
    )
  );
create policy event_asset_versions_insert_event_member on public.event_asset_versions
  for insert to authenticated
  with check (
    exists (
      select 1 from public.event_assets a
      where a.id = event_asset_id
        and private.can_access_event(a.event_id)
    )
  );
create policy event_asset_versions_update_event_member on public.event_asset_versions
  for update to authenticated
  using (
    exists (
      select 1 from public.event_assets a
      where a.id = event_asset_id
        and private.can_access_event(a.event_id)
    )
  )
  with check (
    exists (
      select 1 from public.event_assets a
      where a.id = event_asset_id
        and private.can_access_event(a.event_id)
    )
  );
create policy event_asset_versions_delete_event_member on public.event_asset_versions
  for delete to authenticated
  using (
    exists (
      select 1 from public.event_assets a
      where a.id = event_asset_id
        and private.can_access_event(a.event_id)
    )
  );

select private.drop_all_policies('public.event_artwork_concepts');
alter table public.event_artwork_concepts enable row level security;
create policy event_artwork_concepts_select_event_member on public.event_artwork_concepts
  for select to authenticated using (private.can_access_event(event_id));
create policy event_artwork_concepts_insert_event_member on public.event_artwork_concepts
  for insert to authenticated with check (private.can_access_event(event_id));
create policy event_artwork_concepts_update_event_member on public.event_artwork_concepts
  for update to authenticated
  using (private.can_access_event(event_id))
  with check (private.can_access_event(event_id));
create policy event_artwork_concepts_delete_event_member on public.event_artwork_concepts
  for delete to authenticated using (private.can_access_event(event_id));
