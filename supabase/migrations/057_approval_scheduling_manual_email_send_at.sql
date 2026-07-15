-- Separate story-kit email send time from Meta feed publish time (hybrid CB2).

alter table public.approval_scheduling_items
  add column if not exists manual_email_send_at timestamptz;
