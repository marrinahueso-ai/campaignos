-- Optional Instagram/event link + recipient for Create with AI manual-upload emails.

alter table public.approval_scheduling_items
  add column if not exists manual_upload_link text;

alter table public.approval_scheduling_items
  add column if not exists manual_email_to text;
