-- Run this in Supabase if migration 025 failed partway (table + policies already exist).
-- Safe to re-run: policies are dropped and recreated; data insert is skipped if already migrated.

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

alter table public.organization_roles
  add column if not exists contact_name text;

alter table public.organization_committees
  add column if not exists contact_name text;
