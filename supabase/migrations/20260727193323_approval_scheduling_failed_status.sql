-- First-class Failed publish outcome on Approvals scheduling items.
alter table public.approval_scheduling_items
  drop constraint if exists approval_scheduling_items_workflow_status_check;

alter table public.approval_scheduling_items
  add constraint approval_scheduling_items_workflow_status_check
  check (workflow_status in (
    'in_queue',
    'assigned_to_me',
    'changes_requested',
    'scheduled',
    'posted',
    'published',
    'failed'
  ));
