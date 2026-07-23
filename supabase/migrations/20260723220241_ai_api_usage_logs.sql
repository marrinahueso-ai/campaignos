-- Owner AI & APIs warehouse (Phase 1).
-- Platform-owner analytics only: JWT roles have no policies (deny by default).
-- Writers/readers use createAdminClient() (service_role bypasses RLS).

-- ---------------------------------------------------------------------------
-- AI usage
-- ---------------------------------------------------------------------------
create table if not exists public.ai_usage_log (
  id uuid primary key default gen_random_uuid(),
  request_id text not null,
  created_at timestamptz not null default now(),
  organization_id uuid references public.organizations (id) on delete set null,
  user_id uuid references auth.users (id) on delete set null,
  event_id uuid references public.events (id) on delete set null,
  feature text not null,
  action_type text not null,
  provider text not null default 'openai',
  model text not null,
  environment text not null
    check (environment in ('production', 'development')),
  prompt_tokens integer,
  completion_tokens integer,
  total_tokens integer,
  image_units numeric(12, 4),
  estimated_cost_usd numeric(14, 6),
  latency_ms integer,
  success boolean not null,
  error_code text,
  error_message text,
  channel text,
  constraint ai_usage_log_request_id_unique unique (request_id),
  constraint ai_usage_log_prompt_tokens_nonneg
    check (prompt_tokens is null or prompt_tokens >= 0),
  constraint ai_usage_log_completion_tokens_nonneg
    check (completion_tokens is null or completion_tokens >= 0),
  constraint ai_usage_log_total_tokens_nonneg
    check (total_tokens is null or total_tokens >= 0),
  constraint ai_usage_log_image_units_nonneg
    check (image_units is null or image_units >= 0),
  constraint ai_usage_log_estimated_cost_nonneg
    check (estimated_cost_usd is null or estimated_cost_usd >= 0),
  constraint ai_usage_log_latency_ms_nonneg
    check (latency_ms is null or latency_ms >= 0)
);

create index if not exists ai_usage_log_created_at_idx
  on public.ai_usage_log (created_at desc);

create index if not exists ai_usage_log_org_created_idx
  on public.ai_usage_log (organization_id, created_at desc);

create index if not exists ai_usage_log_feature_created_idx
  on public.ai_usage_log (feature, created_at desc);

create index if not exists ai_usage_log_success_created_idx
  on public.ai_usage_log (success, created_at desc);

create index if not exists ai_usage_log_provider_created_idx
  on public.ai_usage_log (provider, created_at desc);

comment on table public.ai_usage_log is
  'Durable AI request usage for Owner AI & APIs. Service-role only; no member RLS policies.';

-- ---------------------------------------------------------------------------
-- Connected API usage
-- ---------------------------------------------------------------------------
create table if not exists public.api_usage_log (
  id uuid primary key default gen_random_uuid(),
  request_id text not null,
  created_at timestamptz not null default now(),
  organization_id uuid references public.organizations (id) on delete set null,
  user_id uuid references auth.users (id) on delete set null,
  event_id uuid references public.events (id) on delete set null,
  provider text not null,
  operation text not null,
  environment text not null
    check (environment in ('production', 'development')),
  http_status integer,
  success boolean not null,
  latency_ms integer,
  estimated_cost_usd numeric(14, 6),
  error_code text,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  constraint api_usage_log_request_id_unique unique (request_id),
  constraint api_usage_log_estimated_cost_nonneg
    check (estimated_cost_usd is null or estimated_cost_usd >= 0),
  constraint api_usage_log_latency_ms_nonneg
    check (latency_ms is null or latency_ms >= 0),
  constraint api_usage_log_metadata_object
    check (jsonb_typeof(metadata) = 'object')
);

create index if not exists api_usage_log_created_at_idx
  on public.api_usage_log (created_at desc);

create index if not exists api_usage_log_org_created_idx
  on public.api_usage_log (organization_id, created_at desc);

create index if not exists api_usage_log_provider_created_idx
  on public.api_usage_log (provider, created_at desc);

create index if not exists api_usage_log_success_created_idx
  on public.api_usage_log (success, created_at desc);

comment on table public.api_usage_log is
  'Durable connected-API request usage for Owner AI & APIs. Service-role only; no member RLS policies.';

-- ---------------------------------------------------------------------------
-- RLS: deny JWT by default (no policies). service_role bypasses RLS.
-- ---------------------------------------------------------------------------
alter table public.ai_usage_log enable row level security;
alter table public.api_usage_log enable row level security;

revoke all on table public.ai_usage_log from anon, authenticated;
revoke all on table public.api_usage_log from anon, authenticated;

grant all on table public.ai_usage_log to service_role;
grant all on table public.api_usage_log to service_role;
