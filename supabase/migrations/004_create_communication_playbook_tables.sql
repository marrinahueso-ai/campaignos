-- CampaignOS Engine 3: Communication Intelligence (Playbooks)

alter table public.events
  add column if not exists event_type text
    check (event_type is null or event_type in (
      'book_fair',
      'teacher_appreciation',
      'pto_meeting',
      'spirit_night',
      'fundraiser',
      'family_event',
      'volunteer_drive',
      'general_event'
    ));

create table if not exists public.communication_playbooks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations (id) on delete cascade,
  slug text not null,
  name text not null,
  description text,
  event_type text not null
    check (event_type in (
      'book_fair',
      'teacher_appreciation',
      'pto_meeting',
      'spirit_night',
      'fundraiser',
      'family_event',
      'volunteer_drive',
      'general_event'
    )),
  is_system boolean not null default false,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists communication_playbooks_org_slug_idx
  on public.communication_playbooks (organization_id, slug)
  where organization_id is not null;

create unique index if not exists communication_playbooks_system_slug_idx
  on public.communication_playbooks (slug)
  where organization_id is null and is_system = true;

create table if not exists public.communication_playbook_steps (
  id uuid primary key default gen_random_uuid(),
  playbook_id uuid not null references public.communication_playbooks (id) on delete cascade,
  sort_order integer not null default 0,
  relative_day integer not null,
  title text not null,
  channel text not null
    check (channel in (
      'website_announcement',
      'newsletter',
      'facebook',
      'instagram',
      'email',
      'flyer',
      'principal_notes',
      'morning_announcements',
      'volunteer_signup'
    )),
  is_required boolean not null default true,
  default_status text not null default 'upcoming'
    check (default_status in ('upcoming', 'pending', 'in_progress', 'completed', 'skipped')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organization_playbook_defaults (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  event_type text not null
    check (event_type in (
      'book_fair',
      'teacher_appreciation',
      'pto_meeting',
      'spirit_night',
      'fundraiser',
      'family_event',
      'volunteer_drive',
      'general_event'
    )),
  playbook_id uuid not null references public.communication_playbooks (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (organization_id, event_type)
);

create table if not exists public.event_playbook_assignments (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  playbook_id uuid not null references public.communication_playbooks (id) on delete restrict,
  assigned_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id)
);

create table if not exists public.event_communication_steps (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  assignment_id uuid not null references public.event_playbook_assignments (id) on delete cascade,
  playbook_step_id uuid references public.communication_playbook_steps (id) on delete set null,
  sort_order integer not null default 0,
  relative_day integer not null,
  due_date date not null,
  title text not null,
  channel text not null
    check (channel in (
      'website_announcement',
      'newsletter',
      'facebook',
      'instagram',
      'email',
      'flyer',
      'principal_notes',
      'morning_announcements',
      'volunteer_signup'
    )),
  is_required boolean not null default true,
  status text not null default 'upcoming'
    check (status in ('upcoming', 'completed', 'skipped')),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists communication_playbooks_organization_id_idx
  on public.communication_playbooks (organization_id);

create index if not exists communication_playbook_steps_playbook_id_idx
  on public.communication_playbook_steps (playbook_id, sort_order);

create index if not exists organization_playbook_defaults_org_id_idx
  on public.organization_playbook_defaults (organization_id);

create index if not exists event_playbook_assignments_event_id_idx
  on public.event_playbook_assignments (event_id);

create index if not exists event_playbook_assignments_playbook_id_idx
  on public.event_playbook_assignments (playbook_id);

create index if not exists event_communication_steps_event_id_idx
  on public.event_communication_steps (event_id, sort_order);

create index if not exists event_communication_steps_due_date_idx
  on public.event_communication_steps (due_date);

alter table public.communication_playbooks enable row level security;
alter table public.communication_playbook_steps enable row level security;
alter table public.organization_playbook_defaults enable row level security;
alter table public.event_playbook_assignments enable row level security;
alter table public.event_communication_steps enable row level security;

create policy "Allow public read access on communication_playbooks"
  on public.communication_playbooks for select to anon, authenticated using (true);

create policy "Allow public insert access on communication_playbooks"
  on public.communication_playbooks for insert to anon, authenticated with check (true);

create policy "Allow public update access on communication_playbooks"
  on public.communication_playbooks for update to anon, authenticated using (true) with check (true);

create policy "Allow public delete access on communication_playbooks"
  on public.communication_playbooks for delete to anon, authenticated using (true);

create policy "Allow public read access on communication_playbook_steps"
  on public.communication_playbook_steps for select to anon, authenticated using (true);

create policy "Allow public insert access on communication_playbook_steps"
  on public.communication_playbook_steps for insert to anon, authenticated with check (true);

create policy "Allow public update access on communication_playbook_steps"
  on public.communication_playbook_steps for update to anon, authenticated using (true) with check (true);

create policy "Allow public delete access on communication_playbook_steps"
  on public.communication_playbook_steps for delete to anon, authenticated using (true);

create policy "Allow public read access on organization_playbook_defaults"
  on public.organization_playbook_defaults for select to anon, authenticated using (true);

create policy "Allow public insert access on organization_playbook_defaults"
  on public.organization_playbook_defaults for insert to anon, authenticated with check (true);

create policy "Allow public update access on organization_playbook_defaults"
  on public.organization_playbook_defaults for update to anon, authenticated using (true) with check (true);

create policy "Allow public delete access on organization_playbook_defaults"
  on public.organization_playbook_defaults for delete to anon, authenticated using (true);

create policy "Allow public read access on event_playbook_assignments"
  on public.event_playbook_assignments for select to anon, authenticated using (true);

create policy "Allow public insert access on event_playbook_assignments"
  on public.event_playbook_assignments for insert to anon, authenticated with check (true);

create policy "Allow public update access on event_playbook_assignments"
  on public.event_playbook_assignments for update to anon, authenticated using (true) with check (true);

create policy "Allow public delete access on event_playbook_assignments"
  on public.event_playbook_assignments for delete to anon, authenticated using (true);

create policy "Allow public read access on event_communication_steps"
  on public.event_communication_steps for select to anon, authenticated using (true);

create policy "Allow public insert access on event_communication_steps"
  on public.event_communication_steps for insert to anon, authenticated with check (true);

create policy "Allow public update access on event_communication_steps"
  on public.event_communication_steps for update to anon, authenticated using (true) with check (true);

create policy "Allow public delete access on event_communication_steps"
  on public.event_communication_steps for delete to anon, authenticated using (true);

-- System default playbooks
insert into public.communication_playbooks (id, organization_id, slug, name, description, event_type, is_system, is_archived)
values
  ('a1000001-0000-4000-8000-000000000001', null, 'book-fair', 'Book Fair', 'Scholastic book fairs, read-a-thons, and library fundraisers.', 'book_fair', true, false),
  ('a1000001-0000-4000-8000-000000000002', null, 'teacher-appreciation', 'Teacher Appreciation', 'Teacher and staff appreciation days and weeks.', 'teacher_appreciation', true, false),
  ('a1000001-0000-4000-8000-000000000003', null, 'pto-meeting', 'PTO Meeting', 'Monthly meetings, budget votes, and board elections.', 'pto_meeting', true, false),
  ('a1000001-0000-4000-8000-000000000004', null, 'spirit-night', 'Spirit Night', 'Restaurant nights, spirit wear sales, and community dining fundraisers.', 'spirit_night', true, false),
  ('a1000001-0000-4000-8000-000000000005', null, 'fundraiser', 'Fundraiser', 'Fun runs, auctions, product sales, and donation drives.', 'fundraiser', true, false),
  ('a1000001-0000-4000-8000-000000000006', null, 'family-event', 'Family Event', 'Carnivals, festivals, and large community gatherings.', 'family_event', true, false),
  ('a1000001-0000-4000-8000-000000000007', null, 'volunteer-drive', 'Volunteer Drive', 'Volunteer recruitment and signup campaigns.', 'volunteer_drive', true, false),
  ('a1000001-0000-4000-8000-000000000008', null, 'general-event', 'General Event', 'Flexible schedule for events that do not fit a specific type.', 'general_event', true, false)
on conflict do nothing;

-- Book Fair steps
insert into public.communication_playbook_steps (playbook_id, sort_order, relative_day, title, channel, is_required, default_status)
select p.id, s.sort_order, s.relative_day, s.title, s.channel, s.is_required, 'upcoming'
from public.communication_playbooks p
cross join (values
  (0, -30, '30 Days Out', 'newsletter', true),
  (1, -14, '14 Days Out', 'facebook', true),
  (2, -7, '7 Days Out', 'email', true),
  (3, -3, '3 Days Out', 'instagram', true),
  (4, -1, 'Day Before', 'morning_announcements', true),
  (5, 0, 'Day Of', 'facebook', true),
  (6, 1, 'Thank You', 'newsletter', true)
) as s(sort_order, relative_day, title, channel, is_required)
where p.slug = 'book-fair' and p.is_system = true
on conflict do nothing;

-- Teacher Appreciation steps
insert into public.communication_playbook_steps (playbook_id, sort_order, relative_day, title, channel, is_required, default_status)
select p.id, s.sort_order, s.relative_day, s.title, s.channel, s.is_required, 'upcoming'
from public.communication_playbooks p
cross join (values
  (0, -60, '60 Days Out', 'email', true),
  (1, -30, '30 Days Out', 'newsletter', true),
  (2, -14, '14 Days Out', 'facebook', true),
  (3, -7, '7 Days Out', 'website_announcement', true),
  (4, 0, 'Daily During Week', 'morning_announcements', true),
  (5, 1, 'Thank You', 'newsletter', true)
) as s(sort_order, relative_day, title, channel, is_required)
where p.slug = 'teacher-appreciation' and p.is_system = true
on conflict do nothing;

-- PTO Meeting steps
insert into public.communication_playbook_steps (playbook_id, sort_order, relative_day, title, channel, is_required, default_status)
select p.id, s.sort_order, s.relative_day, s.title, s.channel, s.is_required, 'upcoming'
from public.communication_playbooks p
cross join (values
  (0, -7, 'Meeting Notice', 'newsletter', true),
  (1, -1, 'Day Before Reminder', 'facebook', true),
  (2, 0, 'Morning Of', 'morning_announcements', true),
  (3, 1, 'Thank You / Recap', 'newsletter', true)
) as s(sort_order, relative_day, title, channel, is_required)
where p.slug = 'pto-meeting' and p.is_system = true
on conflict do nothing;

-- Spirit Night steps
insert into public.communication_playbook_steps (playbook_id, sort_order, relative_day, title, channel, is_required, default_status)
select p.id, s.sort_order, s.relative_day, s.title, s.channel, s.is_required, 'upcoming'
from public.communication_playbooks p
cross join (values
  (0, -21, '21 Days Out', 'website_announcement', true),
  (1, -14, '14 Days Out', 'facebook', true),
  (2, -7, '7 Days Out', 'instagram', true),
  (3, -1, 'Day Before', 'email', true),
  (4, 0, 'Day Of', 'facebook', true),
  (5, 1, 'Thank You', 'newsletter', true)
) as s(sort_order, relative_day, title, channel, is_required)
where p.slug = 'spirit-night' and p.is_system = true
on conflict do nothing;

-- Fundraiser steps
insert into public.communication_playbook_steps (playbook_id, sort_order, relative_day, title, channel, is_required, default_status)
select p.id, s.sort_order, s.relative_day, s.title, s.channel, s.is_required, 'upcoming'
from public.communication_playbooks p
cross join (values
  (0, -28, 'Launch', 'website_announcement', true),
  (1, -14, 'Mid-Campaign', 'facebook', true),
  (2, -7, 'Final Push', 'email', true),
  (3, -1, 'Last Day', 'instagram', true),
  (4, 3, 'Results / Thank You', 'newsletter', true)
) as s(sort_order, relative_day, title, channel, is_required)
where p.slug = 'fundraiser' and p.is_system = true
on conflict do nothing;

-- Family Event steps
insert into public.communication_playbook_steps (playbook_id, sort_order, relative_day, title, channel, is_required, default_status)
select p.id, s.sort_order, s.relative_day, s.title, s.channel, s.is_required, 'upcoming'
from public.communication_playbooks p
cross join (values
  (0, -30, 'Save the Date', 'newsletter', true),
  (1, -21, 'Volunteer Drive', 'email', true),
  (2, -14, 'Two-Week Reminder', 'facebook', true),
  (3, -7, 'One-Week Push', 'instagram', true),
  (4, -3, 'Final Details', 'morning_announcements', true),
  (5, -1, 'Day Before', 'facebook', true),
  (6, 0, 'Day Of', 'facebook', true),
  (7, 1, 'Thank You', 'newsletter', true)
) as s(sort_order, relative_day, title, channel, is_required)
where p.slug = 'family-event' and p.is_system = true
on conflict do nothing;

-- Volunteer Drive steps
insert into public.communication_playbook_steps (playbook_id, sort_order, relative_day, title, channel, is_required, default_status)
select p.id, s.sort_order, s.relative_day, s.title, s.channel, s.is_required, 'upcoming'
from public.communication_playbooks p
cross join (values
  (0, -21, '21 Days Out', 'email', true),
  (1, -14, '14 Days Out', 'newsletter', true),
  (2, -7, '7 Days Out', 'facebook', true),
  (3, -3, 'Final Call', 'instagram', true),
  (4, 0, 'Day Of', 'morning_announcements', true)
) as s(sort_order, relative_day, title, channel, is_required)
where p.slug = 'volunteer-drive' and p.is_system = true
on conflict do nothing;

-- General Event steps
insert into public.communication_playbook_steps (playbook_id, sort_order, relative_day, title, channel, is_required, default_status)
select p.id, s.sort_order, s.relative_day, s.title, s.channel, s.is_required, 'upcoming'
from public.communication_playbooks p
cross join (values
  (0, -14, '14 Days Out', 'newsletter', true),
  (1, -7, '7 Days Out', 'facebook', true),
  (2, -1, 'Day Before', 'email', true),
  (3, 0, 'Day Of', 'morning_announcements', true),
  (4, 1, 'Thank You', 'newsletter', true)
) as s(sort_order, relative_day, title, channel, is_required)
where p.slug = 'general-event' and p.is_system = true
on conflict do nothing;
