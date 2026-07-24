-- ZIP for live dashboard weather (preferred over city/state for OpenWeatherMap).

alter table public.organizations
  add column if not exists weather_zip text;

comment on column public.organizations.weather_zip is
  'US ZIP code for live weather on the Today dashboard (preferred lookup)';
