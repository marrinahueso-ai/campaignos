-- Phase 2: track story post kit email reminders (avoid duplicate sends)

alter table public.event_communication_steps
  add column if not exists story_reminder_sent_at timestamptz;

create index if not exists event_communication_steps_story_reminder_pending_idx
  on public.event_communication_steps (event_id, relative_day)
  where story_reminder_sent_at is null and story_manual_publish = true;
