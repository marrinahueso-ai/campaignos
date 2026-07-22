-- First-time onboarding progress (value-first flow: event → calendar/brand/invite).
alter table public.organizations
  add column if not exists onboarding_state jsonb not null default '{}'::jsonb;

comment on column public.organizations.onboarding_state is
  'JSON flags for first-time onboarding: first event, skipped calendar/brand/invite, completion.';
