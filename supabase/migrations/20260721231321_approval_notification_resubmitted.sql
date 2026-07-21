-- Allow logging Resend notifications when content is resent after changes_requested.

alter table public.approval_notification_log
  drop constraint if exists approval_notification_log_notification_type_check;

alter table public.approval_notification_log
  add constraint approval_notification_log_notification_type_check
  check (notification_type in (
    'approval_assigned',
    'approval_resubmitted',
    'change_requested',
    'content_approved',
    'scheduled_delivery'
  ));
