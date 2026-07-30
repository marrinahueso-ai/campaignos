-- Enforce the stable source identity used by ICS, subscription, and Google syncs.
-- Existing legacy rows without a source ID are intentionally unaffected.
create unique index if not exists events_school_year_import_external_uidx
  on public.events (school_year_id, import_source, import_external_id)
  where school_year_id is not null
    and import_source is not null
    and import_external_id is not null;
