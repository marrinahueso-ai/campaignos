-- Org-scoped folders for the Files library (/files).
-- Files keep their event_id; folder_id is an optional org-level grouping.

-- ---------------------------------------------------------------------------
-- Folders
-- ---------------------------------------------------------------------------
create table if not exists public.organization_file_folders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organization_file_folders_name_not_blank check (char_length(trim(name)) > 0)
);

create index if not exists organization_file_folders_org_sort_idx
  on public.organization_file_folders (organization_id, sort_order, name);

create unique index if not exists organization_file_folders_org_name_lower_idx
  on public.organization_file_folders (organization_id, lower(trim(name)));

comment on table public.organization_file_folders is
  'Org-scoped folders for organizing files on the Files library page.';

alter table public.organization_file_folders enable row level security;

drop policy if exists organization_file_folders_select_active_member
  on public.organization_file_folders;
drop policy if exists organization_file_folders_insert_active_member
  on public.organization_file_folders;
drop policy if exists organization_file_folders_update_active_member
  on public.organization_file_folders;
drop policy if exists organization_file_folders_delete_active_member
  on public.organization_file_folders;

create policy organization_file_folders_select_active_member
  on public.organization_file_folders
  for select to authenticated
  using (private.is_active_org_member(organization_id));

create policy organization_file_folders_insert_active_member
  on public.organization_file_folders
  for insert to authenticated
  with check (private.is_active_org_member(organization_id));

create policy organization_file_folders_update_active_member
  on public.organization_file_folders
  for update to authenticated
  using (private.is_active_org_member(organization_id))
  with check (private.is_active_org_member(organization_id));

create policy organization_file_folders_delete_active_member
  on public.organization_file_folders
  for delete to authenticated
  using (private.is_active_org_member(organization_id));

-- ---------------------------------------------------------------------------
-- File → folder link (nullable; unfiled when null)
-- ---------------------------------------------------------------------------
alter table public.event_playbook_files
  add column if not exists folder_id uuid references public.organization_file_folders (id) on delete set null;

create index if not exists event_playbook_files_folder_id_idx
  on public.event_playbook_files (folder_id)
  where folder_id is not null;
