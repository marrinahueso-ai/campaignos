-- Durable "Keep Mine" dismiss for calendar sync updates.
-- When a user rejects an incoming source change, we store a snapshot of that
-- exact incoming title/date/time/location. Subsequent syncs skip re-staging
-- the same change; a newer source snapshot clears/misses and reappears.

alter table public.events
  add column if not exists import_dismissed_snapshot text;

comment on column public.events.import_dismissed_snapshot is
  'Fingerprint of a rejected calendar-source update (title|date|time|location). Same incoming snapshot is not re-staged until the source changes again.';
