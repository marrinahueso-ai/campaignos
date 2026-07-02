-- Step 4: route approval requests to matrix assignees

alter table public.approval_requests
  add column if not exists assigned_organization_role_id uuid
    references public.organization_roles (id) on delete set null,
  add column if not exists assigned_user_id uuid
    references public.organization_users (id) on delete set null,
  add column if not exists requested_by_user_id uuid
    references public.organization_users (id) on delete set null;

create index if not exists approval_requests_assigned_user_id_idx
  on public.approval_requests (assigned_user_id)
  where status = 'pending';

create index if not exists approval_requests_assigned_role_id_idx
  on public.approval_requests (assigned_organization_role_id)
  where status = 'pending';
