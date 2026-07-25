-- Org AI credit balances + ledger (credits Phase 1).
-- Burns are written via service_role (createAdminClient).
-- Active org members may read their org balance/ledger.

-- ---------------------------------------------------------------------------
-- Balances (one row per organization; period rolls in place)
-- ---------------------------------------------------------------------------
create table if not exists public.organization_ai_credit_balances (
  organization_id uuid primary key
    references public.organizations (id) on delete cascade,
  period_ym text not null,
  allowance integer not null default 0
    check (allowance >= 0),
  used integer not null default 0
    check (used >= 0),
  reserve_balance integer not null default 0
    check (reserve_balance >= 0),
  unlimited boolean not null default false,
  plan_tier text not null default 'professional',
  updated_at timestamptz not null default now(),
  constraint organization_ai_credit_balances_period_ym_format
    check (period_ym ~ '^\d{4}-\d{2}$')
);

comment on table public.organization_ai_credit_balances is
  'Per-org AI credit period allowance + rolling Reserve. Service-role writes; members read.';

create index if not exists organization_ai_credit_balances_period_ym_idx
  on public.organization_ai_credit_balances (period_ym);

-- ---------------------------------------------------------------------------
-- Ledger
-- ---------------------------------------------------------------------------
create table if not exists public.organization_ai_credit_ledger (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.organizations (id) on delete cascade,
  entry_type text not null
    check (
      entry_type in (
        'period_grant',
        'burn',
        'reserve_grant',
        'bonus_grant',
        'adjustment'
      )
    ),
  amount integer not null,
  bucket text
    check (bucket is null or bucket in ('period', 'reserve')),
  period_ym text,
  ai_usage_log_id uuid
    references public.ai_usage_log (id) on delete set null,
  note text,
  actor_user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint organization_ai_credit_ledger_ai_usage_unique
    unique (ai_usage_log_id)
);

create index if not exists organization_ai_credit_ledger_org_created_idx
  on public.organization_ai_credit_ledger (organization_id, created_at desc);

create index if not exists organization_ai_credit_ledger_period_ym_idx
  on public.organization_ai_credit_ledger (organization_id, period_ym);

comment on table public.organization_ai_credit_ledger is
  'AI credit grants and burns. Idempotent burns via unique ai_usage_log_id.';

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.organization_ai_credit_balances enable row level security;
alter table public.organization_ai_credit_ledger enable row level security;

drop policy if exists organization_ai_credit_balances_select_member
  on public.organization_ai_credit_balances;
create policy organization_ai_credit_balances_select_member
  on public.organization_ai_credit_balances
  for select
  to authenticated
  using (private.is_active_org_member(organization_id));

drop policy if exists organization_ai_credit_ledger_select_member
  on public.organization_ai_credit_ledger;
create policy organization_ai_credit_ledger_select_member
  on public.organization_ai_credit_ledger
  for select
  to authenticated
  using (private.is_active_org_member(organization_id));
