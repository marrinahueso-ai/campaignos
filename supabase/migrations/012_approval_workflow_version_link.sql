-- Role-based approval workflow: tie approvals to a specific draft version
-- and extend communication item statuses for the approval lifecycle.

alter table public.approval_requests
  add column if not exists communication_version_id uuid
    references public.communication_versions (id) on delete set null;

create index if not exists approval_requests_version_id_idx
  on public.approval_requests (communication_version_id);

alter table public.communication_items
  drop constraint if exists communication_items_status_check;

alter table public.communication_items
  add constraint communication_items_status_check
  check (status in (
    'draft',
    'generated',
    'pending_approval',
    'approved',
    'changes_requested',
    'published'
  ));
