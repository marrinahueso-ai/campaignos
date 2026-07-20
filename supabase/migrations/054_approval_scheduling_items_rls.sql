-- Migration 048 created approval_scheduling_items / approval_notification_log
-- without RLS policies. Production has RLS enabled (default), so authenticated
-- inserts from Create with AI → Send for approval failed silently and the
-- Approvals queue stayed empty.

alter table public.approval_scheduling_items enable row level security;
alter table public.approval_notification_log enable row level security;

drop policy if exists "approval_scheduling_items_select"
  on public.approval_scheduling_items;
drop policy if exists "approval_scheduling_items_insert"
  on public.approval_scheduling_items;
drop policy if exists "approval_scheduling_items_update"
  on public.approval_scheduling_items;
drop policy if exists "approval_scheduling_items_delete"
  on public.approval_scheduling_items;

create policy "approval_scheduling_items_select"
  on public.approval_scheduling_items for select
  to anon, authenticated
  using (true);

create policy "approval_scheduling_items_insert"
  on public.approval_scheduling_items for insert
  to anon, authenticated
  with check (true);

create policy "approval_scheduling_items_update"
  on public.approval_scheduling_items for update
  to anon, authenticated
  using (true)
  with check (true);

create policy "approval_scheduling_items_delete"
  on public.approval_scheduling_items for delete
  to anon, authenticated
  using (true);

drop policy if exists "approval_notification_log_select"
  on public.approval_notification_log;
drop policy if exists "approval_notification_log_insert"
  on public.approval_notification_log;
drop policy if exists "approval_notification_log_update"
  on public.approval_notification_log;

create policy "approval_notification_log_select"
  on public.approval_notification_log for select
  to anon, authenticated
  using (true);

create policy "approval_notification_log_insert"
  on public.approval_notification_log for insert
  to anon, authenticated
  with check (true);

create policy "approval_notification_log_update"
  on public.approval_notification_log for update
  to anon, authenticated
  using (true)
  with check (true);
