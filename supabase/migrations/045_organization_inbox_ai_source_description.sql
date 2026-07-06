-- Optional description for custom inbox AI sources (used when page fetch fails)

alter table public.organization_inbox_ai_sources
  add column if not exists description text;
