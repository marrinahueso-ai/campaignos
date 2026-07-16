-- Team & Access roster-first: assignments before invite, link login to roster.

-- 1) Roster person: nullable email + optional phone
alter table public.organization_members
  alter column email drop not null;

alter table public.organization_members
  add column if not exists phone text;

create unique index if not exists organization_members_org_email_unique_idx
  on public.organization_members (organization_id, lower(email))
  where email is not null and btrim(email) <> '';

-- 2) Committee assignments (roster person to committee role)
create table if not exists public.organization_committee_assignments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  organization_member_id uuid not null
    references public.organization_members (id) on delete cascade,
  committee_id uuid not null
    references public.organization_committees (id) on delete cascade,
  role text not null
    check (role in ('chair', 'co_chair', 'member', 'supervising_vp')),
  created_at timestamptz not null default now(),
  unique (committee_id, organization_member_id)
);

create index if not exists organization_committee_assignments_org_idx
  on public.organization_committee_assignments (organization_id);

create index if not exists organization_committee_assignments_member_idx
  on public.organization_committee_assignments (organization_member_id);

create index if not exists organization_committee_assignments_committee_idx
  on public.organization_committee_assignments (committee_id);

alter table public.organization_committee_assignments enable row level security;

drop policy if exists "Allow authenticated read organization_committee_assignments"
  on public.organization_committee_assignments;
drop policy if exists "Allow authenticated insert organization_committee_assignments"
  on public.organization_committee_assignments;
drop policy if exists "Allow authenticated update organization_committee_assignments"
  on public.organization_committee_assignments;
drop policy if exists "Allow authenticated delete organization_committee_assignments"
  on public.organization_committee_assignments;

create policy "Allow authenticated read organization_committee_assignments"
  on public.organization_committee_assignments for select to authenticated using (true);

create policy "Allow authenticated insert organization_committee_assignments"
  on public.organization_committee_assignments for insert to authenticated with check (true);

create policy "Allow authenticated update organization_committee_assignments"
  on public.organization_committee_assignments for update to authenticated using (true) with check (true);

create policy "Allow authenticated delete organization_committee_assignments"
  on public.organization_committee_assignments for delete to authenticated using (true);

-- 3) Roster event assignments (before invite)
create table if not exists public.organization_member_event_assignments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  organization_member_id uuid not null
    references public.organization_members (id) on delete cascade,
  event_id uuid not null references public.events (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (organization_member_id, event_id)
);

create index if not exists organization_member_event_assignments_org_idx
  on public.organization_member_event_assignments (organization_id);

create index if not exists organization_member_event_assignments_member_idx
  on public.organization_member_event_assignments (organization_member_id);

create index if not exists organization_member_event_assignments_event_idx
  on public.organization_member_event_assignments (event_id);

alter table public.organization_member_event_assignments enable row level security;

drop policy if exists "Allow authenticated read organization_member_event_assignments"
  on public.organization_member_event_assignments;
drop policy if exists "Allow authenticated insert organization_member_event_assignments"
  on public.organization_member_event_assignments;
drop policy if exists "Allow authenticated update organization_member_event_assignments"
  on public.organization_member_event_assignments;
drop policy if exists "Allow authenticated delete organization_member_event_assignments"
  on public.organization_member_event_assignments;

create policy "Allow authenticated read organization_member_event_assignments"
  on public.organization_member_event_assignments for select to authenticated using (true);

create policy "Allow authenticated insert organization_member_event_assignments"
  on public.organization_member_event_assignments for insert to authenticated with check (true);

create policy "Allow authenticated update organization_member_event_assignments"
  on public.organization_member_event_assignments for update to authenticated using (true) with check (true);

create policy "Allow authenticated delete organization_member_event_assignments"
  on public.organization_member_event_assignments for delete to authenticated using (true);

-- 4) Link login membership to roster person
alter table public.organization_users
  add column if not exists organization_member_id uuid
    references public.organization_members (id) on delete set null;

create unique index if not exists organization_users_organization_member_id_unique_idx
  on public.organization_users (organization_member_id)
  where organization_member_id is not null;

create index if not exists organization_users_organization_member_id_idx
  on public.organization_users (organization_member_id)
  where organization_member_id is not null;

-- 5) Backfill: ensure roster members for role contacts
insert into public.organization_members (organization_id, name, email, organization_role_id, active)
select
  r.organization_id,
  btrim(r.contact_name),
  nullif(lower(btrim(r.contact_email)), ''),
  r.id,
  true
from public.organization_roles r
where r.contact_name is not null
  and btrim(r.contact_name) <> ''
  and r.archived_at is null
  and not exists (
    select 1
    from public.organization_members m
    where m.organization_id = r.organization_id
      and (
        (
          r.contact_email is not null
          and btrim(r.contact_email) <> ''
          and lower(m.email) = lower(btrim(r.contact_email))
        )
        or lower(btrim(m.name)) = lower(btrim(r.contact_name))
      )
  );

-- 6a) Temp table for split packed committee names (avoids fragile modifying-CTE chains)
drop table if exists tmp_roster_committee_people;

create temporary table tmp_roster_committee_people (
  organization_id uuid not null,
  committee_id uuid not null,
  person_name text not null,
  name_index integer not null,
  email text,
  phone text,
  role text not null
) on commit drop;

insert into tmp_roster_committee_people (
  organization_id,
  committee_id,
  person_name,
  name_index,
  email,
  phone,
  role
)
select
  c.organization_id,
  c.id as committee_id,
  btrim(parts.person_name) as person_name,
  parts.name_index,
  case when parts.name_index = 0 then c.contact_email else null end as email,
  case when parts.name_index = 0 then c.contact_phone else null end as phone,
  case
    when parts.name_index = 0 then 'chair'
    when parts.name_index = 1 then 'co_chair'
    else 'member'
  end as role
from public.organization_committees c
cross join lateral (
  select
    btrim(part) as person_name,
    (ordinality - 1)::integer as name_index
  from regexp_split_to_table(
    regexp_replace(coalesce(c.contact_name, ''), '[|/]+', ',', 'g'),
    '\s*,\s*'
  ) with ordinality as split(part, ordinality)
) as parts
where c.archived_at is null
  and c.contact_name is not null
  and btrim(c.contact_name) <> ''
  and btrim(parts.person_name) <> '';

-- 6b) Insert missing roster members from packed committee names
insert into public.organization_members (organization_id, name, email, phone, active)
select distinct on (n.organization_id, lower(n.person_name), coalesce(lower(n.email), ''))
  n.organization_id,
  n.person_name,
  nullif(lower(btrim(n.email)), ''),
  nullif(btrim(n.phone), ''),
  true
from tmp_roster_committee_people n
where not exists (
  select 1
  from public.organization_members m
  where m.organization_id = n.organization_id
    and (
      (
        n.email is not null
        and btrim(n.email) <> ''
        and lower(m.email) = lower(btrim(n.email))
      )
      or lower(btrim(m.name)) = lower(n.person_name)
    )
)
order by n.organization_id, lower(n.person_name), coalesce(lower(n.email), '');

-- 6c) Insert committee assignments from packed names
insert into public.organization_committee_assignments (
  organization_id,
  organization_member_id,
  committee_id,
  role
)
select distinct on (n.committee_id, m.id)
  n.organization_id,
  m.id,
  n.committee_id,
  n.role
from tmp_roster_committee_people n
join public.organization_members m
  on m.organization_id = n.organization_id
 and (
   (
     n.email is not null
     and btrim(n.email) <> ''
     and lower(m.email) = lower(btrim(n.email))
   )
   or lower(btrim(m.name)) = lower(n.person_name)
 )
where not exists (
  select 1
  from public.organization_committee_assignments a
  where a.committee_id = n.committee_id
    and a.organization_member_id = m.id
)
order by n.committee_id, m.id, n.name_index
on conflict (committee_id, organization_member_id) do nothing;

-- 7) Link existing organization_users to roster members by email
update public.organization_users ou
set organization_member_id = m.id
from public.organization_members m
where ou.organization_member_id is null
  and ou.organization_id = m.organization_id
  and ou.email is not null
  and m.email is not null
  and lower(btrim(ou.email)) = lower(btrim(m.email))
  and not exists (
    select 1
    from public.organization_users other
    where other.organization_member_id = m.id
  );

-- 8) Copy any existing login event assignments onto linked roster members
insert into public.organization_member_event_assignments (
  organization_id,
  organization_member_id,
  event_id
)
select
  uea.organization_id,
  ou.organization_member_id,
  uea.event_id
from public.organization_user_event_assignments uea
join public.organization_users ou
  on ou.id = uea.organization_user_id
where ou.organization_member_id is not null
on conflict (organization_member_id, event_id) do nothing;
