-- Organization billing + Stripe (credits Phase 5).
-- plan_tier / trial / subscription fields live on organizations;
-- organization_ai_credit_balances.plan_tier stays in sync via app code.

alter table public.organizations
  add column if not exists plan_tier text not null default 'professional',
  add column if not exists subscription_status text not null default 'none',
  add column if not exists trial_ends_at timestamptz,
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists stripe_price_id text;

comment on column public.organizations.plan_tier is
  'starter | professional | premium | trial | founding (founding usually via billing_exempt_at)';
comment on column public.organizations.subscription_status is
  'none | trialing | active | past_due | canceled | incomplete';
comment on column public.organizations.trial_ends_at is
  'UTC end of 14-day trial when plan_tier=trial';
comment on column public.organizations.stripe_customer_id is
  'Stripe Customer id (cus_…)';
comment on column public.organizations.stripe_subscription_id is
  'Stripe Subscription id (sub_…) for the plan';
comment on column public.organizations.stripe_price_id is
  'Stripe Price id currently subscribed';

create index if not exists organizations_stripe_customer_id_idx
  on public.organizations (stripe_customer_id)
  where stripe_customer_id is not null;

alter table public.organizations
  drop constraint if exists organizations_plan_tier_check;
alter table public.organizations
  add constraint organizations_plan_tier_check
  check (
    plan_tier in (
      'starter',
      'professional',
      'premium',
      'trial',
      'founding'
    )
  );

alter table public.organizations
  drop constraint if exists organizations_subscription_status_check;
alter table public.organizations
  add constraint organizations_subscription_status_check
  check (
    subscription_status in (
      'none',
      'trialing',
      'active',
      'past_due',
      'canceled',
      'incomplete'
    )
  );
