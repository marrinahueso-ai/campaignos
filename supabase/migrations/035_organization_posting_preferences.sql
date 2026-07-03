-- Org timezone + manual preferred posting windows for calendar heatmap (Phase 0)
alter table public.organizations
  add column if not exists timezone text not null default 'America/Chicago',
  add column if not exists preferred_posting_hours jsonb;

comment on column public.organizations.timezone is 'IANA timezone for scheduling and posting-time heatmap';
comment on column public.organizations.preferred_posting_hours is 'Manual best-time windows: [{ daysOfWeek, startHour, endHour }]';
