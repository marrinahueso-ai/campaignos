-- Phase 1: manual Instagram story posting (download + copy kit, skip story auto-publish)

alter table public.event_communication_steps
  add column if not exists story_manual_publish boolean not null default false;
