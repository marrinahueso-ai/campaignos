-- Phase 1: per-milestone Meta publish surface preference (feed / story / both)

alter table public.event_communication_steps
  add column if not exists meta_publish_surfaces text not null default 'both'
    check (meta_publish_surfaces in ('both', 'feed_only', 'story_only'));
