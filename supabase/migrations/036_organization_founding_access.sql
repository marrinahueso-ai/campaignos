-- Founding / beta access codes — billing exemption for early PTO partners

alter table public.organizations
  add column if not exists founding_access_code text,
  add column if not exists billing_exempt_at timestamptz;

comment on column public.organizations.founding_access_code is 'Redeemed founding or beta access code, if any';
comment on column public.organizations.billing_exempt_at is 'When set, organization is exempt from billing gates';
