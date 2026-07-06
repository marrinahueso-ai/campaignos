-- Phase 3–5: tagged content channel types for Unified Inbox repost flow

alter type public.inbox_channel_type add value if not exists 'instagram_tag';
alter type public.inbox_channel_type add value if not exists 'facebook_tag';
