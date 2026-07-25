-- Add a metadata column to ai_usage_log, mirroring api_usage_log's existing
-- metadata jsonb column exactly (same default, same nullability, same shape
-- check). Used to capture artwork-generation context that has no dedicated
-- column: isRegeneration (generate vs regenerate) and milestone attribution
-- (milestoneLabel / relativeDay) for the Billing & Plan Usage tab breakdowns.
-- Additive + default-valued — safe to apply against existing rows.

alter table public.ai_usage_log
  add column if not exists metadata jsonb not null default '{}'::jsonb;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'ai_usage_log_metadata_object'
      and conrelid = 'public.ai_usage_log'::regclass
  ) then
    alter table public.ai_usage_log
      add constraint ai_usage_log_metadata_object
        check (jsonb_typeof(metadata) = 'object');
  end if;
end $$;

comment on column public.ai_usage_log.metadata is
  'Free-form per-action context, e.g. { isRegeneration, milestoneLabel, relativeDay } for artwork actions. Historical rows default to {}.';
