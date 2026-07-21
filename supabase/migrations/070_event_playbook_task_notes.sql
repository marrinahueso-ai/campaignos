-- Per-task notes for Tasks workspace detail drawer.

alter table public.event_playbook_tasks
  add column if not exists notes text;
