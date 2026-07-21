-- Meta-native scheduled unpublished posts (Facebook Page feed Graph schedule ids).
-- Used so Calendar DnD can update scheduled_publish_time without re-approval.
-- Instagram has no reliable Graph schedule API; those slots keep CampignOS publish-when-due.

alter table public.meta_publication_slots
  add column if not exists graph_schedule_id text,
  add column if not exists graph_schedule_error text;

comment on column public.meta_publication_slots.graph_schedule_id is
  'Graph id for an unpublished scheduled Page post/photo (scheduled_publish_time). Null = CampignOS cron publishes when due.';

comment on column public.meta_publication_slots.graph_schedule_error is
  'Last soft-failure message when creating/updating a Meta-native schedule (does not clear approval).';
