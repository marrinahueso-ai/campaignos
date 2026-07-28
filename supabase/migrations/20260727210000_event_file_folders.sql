-- Event-scoped folders for campaign files (replaces org-wide organization_file_folders).
-- Files keep event_id; folder_id groups files within that event only.

-- ---------------------------------------------------------------------------
-- New event-scoped folders
-- ---------------------------------------------------------------------------
create table if not exists public.event_file_folders (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_file_folders_name_not_blank check (char_length(trim(name)) > 0)
);

create index if not exists event_file_folders_event_sort_idx
  on public.event_file_folders (event_id, sort_order, name);

create unique index if not exists event_file_folders_event_name_lower_idx
  on public.event_file_folders (event_id, lower(trim(name)));

comment on table public.event_file_folders is
  'Event-scoped folders for organizing files on the Files library and event Files tab.';

alter table public.event_file_folders enable row level security;

drop policy if exists event_file_folders_select_event_member on public.event_file_folders;
drop policy if exists event_file_folders_insert_event_member on public.event_file_folders;
drop policy if exists event_file_folders_update_event_member on public.event_file_folders;
drop policy if exists event_file_folders_delete_event_member on public.event_file_folders;

create policy event_file_folders_select_event_member
  on public.event_file_folders
  for select to authenticated
  using (private.can_access_event(event_id));

create policy event_file_folders_insert_event_member
  on public.event_file_folders
  for insert to authenticated
  with check (private.can_access_event(event_id));

create policy event_file_folders_update_event_member
  on public.event_file_folders
  for update to authenticated
  using (private.can_access_event(event_id))
  with check (private.can_access_event(event_id));

create policy event_file_folders_delete_event_member
  on public.event_file_folders
  for delete to authenticated
  using (private.can_access_event(event_id));

-- ---------------------------------------------------------------------------
-- Migrate org folders → per-event folders (when prior migration was applied)
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'organization_file_folders'
  ) then
    create temp table _event_folder_migration on commit drop as
    select
      f.folder_id as old_folder_id,
      f.event_id,
      gen_random_uuid() as new_folder_id,
      of.organization_id,
      of.name,
      of.sort_order,
      of.created_at,
      of.updated_at
    from public.event_playbook_files f
    join public.organization_file_folders of on of.id = f.folder_id
    where f.folder_id is not null
    group by
      f.folder_id,
      f.event_id,
      of.organization_id,
      of.name,
      of.sort_order,
      of.created_at,
      of.updated_at;

    insert into public.event_file_folders (
      id,
      event_id,
      organization_id,
      name,
      sort_order,
      created_at,
      updated_at
    )
    select
      new_folder_id,
      event_id,
      organization_id,
      name,
      sort_order,
      created_at,
      updated_at
    from _event_folder_migration;

    update public.event_playbook_files f
    set folder_id = m.new_folder_id
    from _event_folder_migration m
    where f.folder_id = m.old_folder_id
      and f.event_id = m.event_id;

    update public.event_playbook_files
    set folder_id = null
    where folder_id is not null
      and folder_id not in (select id from public.event_file_folders);

    alter table public.event_playbook_files
      drop constraint if exists event_playbook_files_folder_id_fkey;

    drop table public.organization_file_folders;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Point file → folder link at event folders
-- ---------------------------------------------------------------------------
alter table public.event_playbook_files
  drop constraint if exists event_playbook_files_folder_id_fkey;

alter table public.event_playbook_files
  add column if not exists folder_id uuid;

alter table public.event_playbook_files
  add constraint event_playbook_files_folder_id_fkey
  foreign key (folder_id)
  references public.event_file_folders (id)
  on delete set null;

create index if not exists event_playbook_files_folder_id_idx
  on public.event_playbook_files (folder_id)
  where folder_id is not null;
