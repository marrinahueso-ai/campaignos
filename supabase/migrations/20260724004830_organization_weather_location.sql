-- City/state used for live dashboard weather (OpenWeatherMap).
-- Separate from district name so "Williamson County Schools" can still resolve to Franklin, TN.

alter table public.organizations
  add column if not exists weather_city text,
  add column if not exists weather_state text;

comment on column public.organizations.weather_city is
  'City for live weather on the Today dashboard';
comment on column public.organizations.weather_state is
  'US state (abbr or name) for live weather on the Today dashboard';
