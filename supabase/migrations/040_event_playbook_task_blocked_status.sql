-- CampaignOS: add blocked workflow status for event playbook tasks

alter table public.event_playbook_tasks
  drop constraint if exists event_playbook_tasks_status_check;

alter table public.event_playbook_tasks
  add constraint event_playbook_tasks_status_check
  check (status in ('todo', 'in_progress', 'blocked', 'done'));
