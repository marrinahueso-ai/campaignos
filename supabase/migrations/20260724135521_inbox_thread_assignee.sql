-- Communications Hub: assign conversation owner to an org team member.

alter table public.inbox_threads
  add column if not exists assigned_user_id uuid references auth.users (id) on delete set null;

alter table public.inbox_threads
  add column if not exists assignee_name text;

alter table public.inbox_threads
  add column if not exists assignee_initials text;

create index if not exists inbox_threads_org_assigned_user_id_idx
  on public.inbox_threads (organization_id, assigned_user_id)
  where assigned_user_id is not null;
