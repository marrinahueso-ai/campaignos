-- Fix approval_scheduling_items RLS for organization-scoped rows (event_id
-- is null), introduced by 20260810120000_newsletter_approval_send.sql for
-- the newsletter Approvals hub bridge.
--
-- 065_broader_membership_rls.sql gated every policy on
-- private.can_access_event(event_id). That function compares e.id = p_event_id,
-- which is never true when p_event_id is null — so organization-scoped rows
-- (newsletters) were unreadable and unwritable by every authenticated user,
-- including active org members. Add an OR branch that allows access when
-- event_id is null and the caller is an active member of organization_id.

select private.drop_all_policies('public.approval_scheduling_items');
alter table public.approval_scheduling_items enable row level security;

create policy approval_scheduling_items_select_member on public.approval_scheduling_items
  for select to authenticated using (
    private.can_access_event(event_id)
    or (
      event_id is null
      and organization_id is not null
      and private.is_active_org_member(organization_id)
    )
  );

create policy approval_scheduling_items_insert_member on public.approval_scheduling_items
  for insert to authenticated with check (
    private.can_access_event(event_id)
    or (
      event_id is null
      and organization_id is not null
      and private.is_active_org_member(organization_id)
    )
  );

create policy approval_scheduling_items_update_member on public.approval_scheduling_items
  for update to authenticated
  using (
    private.can_access_event(event_id)
    or (
      event_id is null
      and organization_id is not null
      and private.is_active_org_member(organization_id)
    )
  )
  with check (
    private.can_access_event(event_id)
    or (
      event_id is null
      and organization_id is not null
      and private.is_active_org_member(organization_id)
    )
  );

create policy approval_scheduling_items_delete_member on public.approval_scheduling_items
  for delete to authenticated using (
    private.can_access_event(event_id)
    or (
      event_id is null
      and organization_id is not null
      and private.is_active_org_member(organization_id)
    )
  );
