-- Mailing / physical address for organization profile (Settings → Organization).
-- Distinct from weather_city / weather_state / weather_zip (dashboard weather lookup).

alter table public.organizations
  add column if not exists address_line1 text,
  add column if not exists address_line2 text,
  add column if not exists city text,
  add column if not exists state text,
  add column if not exists postal_code text,
  add column if not exists country text;

comment on column public.organizations.address_line1 is
  'Street address line 1 for the organization profile';
comment on column public.organizations.address_line2 is
  'Street address line 2 (suite, building) for the organization profile';
comment on column public.organizations.city is
  'City for the organization mailing / physical address';
comment on column public.organizations.state is
  'State / province / region for the organization mailing / physical address';
comment on column public.organizations.postal_code is
  'Postal / ZIP code for the organization mailing / physical address';
comment on column public.organizations.country is
  'Country for the organization mailing / physical address';
