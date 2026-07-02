-- School year scoping, calendar subscribe feeds, and import categorization memory

create table if not exists public.school_years (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  label text not null,
  status text not null default 'planning'
    check (status in ('planning', 'active', 'closed')),
  calendar_subscribe_url text,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, label)
);

create index if not exists school_years_organization_id_idx
  on public.school_years (organization_id, status);

alter table public.organizations
  add column if not exists active_school_year_id uuid
    references public.school_years (id) on delete set null;

alter table public.calendar_imports
  add column if not exists school_year_id uuid
    references public.school_years (id) on delete set null;

alter table public.events
  add column if not exists school_year_id uuid
    references public.school_years (id) on delete set null;

-- Remember how each event title was categorized for the next calendar upload
create table if not exists public.import_event_preferences (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  event_name_key text not null,
  category text,
  event_type text,
  communication_strategy text not null,
  updated_at timestamptz not null default now(),
  unique (organization_id, event_name_key)
);

create index if not exists import_event_preferences_org_idx
  on public.import_event_preferences (organization_id);

alter table public.school_years enable row level security;
alter table public.import_event_preferences enable row level security;

create policy "Allow public read access on school_years"
  on public.school_years for select to anon, authenticated using (true);

create policy "Allow public insert access on school_years"
  on public.school_years for insert to anon, authenticated with check (true);

create policy "Allow public update access on school_years"
  on public.school_years for update to anon, authenticated using (true) with check (true);

create policy "Allow public read access on import_event_preferences"
  on public.import_event_preferences for select to anon, authenticated using (true);

create policy "Allow public insert access on import_event_preferences"
  on public.import_event_preferences for insert to anon, authenticated with check (true);

create policy "Allow public update access on import_event_preferences"
  on public.import_event_preferences for update to anon, authenticated using (true) with check (true);

-- Holiday / no-school system playbook

alter table public.events drop constraint if exists events_event_type_check;
alter table public.events add constraint events_event_type_check
  check (event_type is null or event_type in (
    'book_fair',
    'teacher_appreciation',
    'pto_meeting',
    'spirit_night',
    'fundraiser',
    'family_event',
    'volunteer_drive',
    'general_event',
    'early_release',
    'holiday'
  ));

alter table public.communication_playbooks drop constraint if exists communication_playbooks_event_type_check;
alter table public.communication_playbooks add constraint communication_playbooks_event_type_check
  check (event_type in (
    'book_fair',
    'teacher_appreciation',
    'pto_meeting',
    'spirit_night',
    'fundraiser',
    'family_event',
    'volunteer_drive',
    'general_event',
    'early_release',
    'holiday'
  ));

alter table public.organization_playbook_defaults drop constraint if exists organization_playbook_defaults_event_type_check;
alter table public.organization_playbook_defaults add constraint organization_playbook_defaults_event_type_check
  check (event_type in (
    'book_fair',
    'teacher_appreciation',
    'pto_meeting',
    'spirit_night',
    'fundraiser',
    'family_event',
    'volunteer_drive',
    'general_event',
    'early_release',
    'holiday'
  ));

insert into public.communication_playbooks (id, organization_id, slug, name, description, event_type, is_system, is_archived)
values (
  'a1000001-0000-4000-8000-000000000009',
  null,
  'holiday',
  'Holiday / No School',
  'Breaks, holidays, and no-school days — lightweight reminders.',
  'holiday',
  true,
  false
)
on conflict do nothing;

insert into public.communication_playbook_steps (playbook_id, sort_order, relative_day, title, channel, is_required, default_status)
select p.id, s.sort_order, s.relative_day, s.title, s.channel, s.is_required, 'upcoming'
from public.communication_playbooks p
cross join (values
  (0, -7, 'Week Before Reminder', 'newsletter', true),
  (1, -1, 'Day Before', 'morning_announcements', true),
  (2, 1, 'Return Reminder', 'newsletter', true)
) as s(sort_order, relative_day, title, channel, is_required)
where p.slug = 'holiday' and p.is_system = true
on conflict do nothing;
