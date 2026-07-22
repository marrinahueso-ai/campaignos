-- Sticky date allowlist for SignUpGenius volunteer imports.
-- null = include all assignment dates (backward compatible with existing sources).
-- Values are ISO start dates (YYYY-MM-DD) and/or the undated sentinel "__none__".

alter table public.event_volunteer_sources
  add column if not exists included_assignment_dates text[];

comment on column public.event_volunteer_sources.included_assignment_dates is
  'Sticky allowlist of assignment start dates (YYYY-MM-DD) plus optional __none__ for undated rows. null means all dates.';
