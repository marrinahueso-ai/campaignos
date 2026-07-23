-- Communications Hub: follow-up star + manual done queue state on threads.

alter table public.inbox_threads
  add column if not exists follow_up boolean not null default false;

alter table public.inbox_threads
  add column if not exists marked_done boolean not null default false;

create index if not exists inbox_threads_org_follow_up_idx
  on public.inbox_threads (organization_id, follow_up)
  where follow_up = true;

create index if not exists inbox_threads_org_marked_done_idx
  on public.inbox_threads (organization_id, marked_done)
  where marked_done = true;
