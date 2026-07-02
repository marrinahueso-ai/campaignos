-- Custom committees nested under leadership roles.

create table if not exists public.organization_committees (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  parent_role_id uuid references public.organization_roles (id) on delete cascade,
  contact_email text,
  contact_phone text,
  communication_strategy text not null default 'full_campaign'
    check (
      communication_strategy in (
        'full_campaign',
        'reminder_only',
        'calendar_only',
        'custom'
      )
    ),
  playbook_slug text,
  event_match_key text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists organization_committees_organization_id_idx
  on public.organization_committees (organization_id);

create index if not exists organization_committees_parent_role_id_idx
  on public.organization_committees (parent_role_id);

create index if not exists organization_committees_event_match_key_idx
  on public.organization_committees (organization_id, event_match_key)
  where event_match_key is not null;

alter table public.organization_committees enable row level security;

drop policy if exists "Allow public read access on organization_committees"
  on public.organization_committees;
drop policy if exists "Allow public insert access on organization_committees"
  on public.organization_committees;
drop policy if exists "Allow public update access on organization_committees"
  on public.organization_committees;
drop policy if exists "Allow public delete access on organization_committees"
  on public.organization_committees;

create policy "Allow public read access on organization_committees"
  on public.organization_committees for select to anon, authenticated using (true);

create policy "Allow public insert access on organization_committees"
  on public.organization_committees for insert to anon, authenticated with check (true);

create policy "Allow public update access on organization_committees"
  on public.organization_committees for update to anon, authenticated using (true) with check (true);

create policy "Allow public delete access on organization_committees"
  on public.organization_committees for delete to anon, authenticated using (true);

-- Migrate legacy committee_defaults into organization_committees.
insert into public.organization_committees (
  organization_id,
  name,
  parent_role_id,
  communication_strategy,
  playbook_slug,
  event_match_key,
  sort_order
)
select
  cd.organization_id,
  case cd.committee_name
    when 'book_fair' then 'Book Fair'
    when 'teacher_appreciation' then 'Teacher Appreciation'
    when 'spirit_wear' then 'Spirit Wear'
    when 'hospitality' then 'Hospitality'
    when 'fundraising' then 'Fundraising'
    when 'general_pto_meeting' then 'General PTO Meeting'
    when 'family_event' then 'Family Event'
    when 'volunteer_recruitment' then 'Volunteer Recruitment'
    else cd.committee_name
  end,
  cd.default_role_id,
  cd.communication_strategy,
  cd.playbook_slug,
  cd.committee_name,
  0
from public.committee_defaults cd
where not exists (
  select 1
  from public.organization_committees oc
  where oc.organization_id = cd.organization_id
    and oc.event_match_key = cd.committee_name
);
