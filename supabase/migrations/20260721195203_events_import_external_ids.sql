-- Stable external identity for calendar import / sync dedupe.
-- Events link to orgs via school_years (school_year_id); unique key is scoped per school year.

alter table public.events
  add column if not exists import_source text,
  add column if not exists import_external_id text;

alter table public.events
  drop constraint if exists events_import_source_check;

alter table public.events
  add constraint events_import_source_check
  check (
    import_source is null
    or import_source in ('ics', 'google', 'subscribe', 'ai_parse', 'manual')
  );

comment on column public.events.import_source is
  'Origin of imported event: ics | google | subscribe | ai_parse | manual.';

comment on column public.events.import_external_id is
  'Stable external id (ICS UID, Google event id, or AI fingerprint). Null = title+date fallback dedupe only.';

create unique index if not exists events_school_year_import_external_uidx
  on public.events (school_year_id, import_source, import_external_id)
  where school_year_id is not null
    and import_source is not null
    and import_external_id is not null;

create index if not exists events_import_external_id_idx
  on public.events (import_source, import_external_id)
  where import_external_id is not null;
