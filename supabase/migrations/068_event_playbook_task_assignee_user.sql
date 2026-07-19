-- Link playbook tasks to Auth users for reliable "My Tasks" matching.
-- Keeps assignee_name / assignee_initials as denormalized display fields.

alter table public.event_playbook_tasks
  add column if not exists assignee_user_id uuid references auth.users (id) on delete set null;

create index if not exists event_playbook_tasks_assignee_user_id_idx
  on public.event_playbook_tasks (assignee_user_id)
  where assignee_user_id is not null;

-- Best-effort backfill from assignee_name → active org membership user_id
-- (events → school_years → organizations).
update public.event_playbook_tasks as task
set assignee_user_id = ou.user_id
from public.events e
join public.school_years sy on sy.id = e.school_year_id
join public.organization_users ou
  on ou.organization_id = sy.organization_id
  and ou.status = 'active'
  and ou.user_id is not null
where task.event_id = e.id
  and task.assignee_user_id is null
  and task.assignee_name is not null
  and trim(task.assignee_name) <> ''
  and (
    lower(trim(task.assignee_name)) = lower(trim(coalesce(ou.display_name, '')))
    or lower(trim(task.assignee_name)) = lower(trim(split_part(ou.email, '@', 1)))
    or lower(trim(task.assignee_name)) = lower(trim(ou.email))
  );
