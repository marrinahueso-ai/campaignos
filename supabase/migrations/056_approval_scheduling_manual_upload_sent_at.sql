-- Track when Create with AI manual-upload emails were sent via Resend.

alter table public.approval_scheduling_items
  add column if not exists manual_upload_email_sent_at timestamptz;
