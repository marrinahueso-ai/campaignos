-- CampaignOS: Enhanced campaign files (event_playbook_files) + storage bucket

alter table public.event_playbook_files
  add column if not exists file_type text,
  add column if not exists category text not null default 'other',
  add column if not exists platforms text[] not null default '{}',
  add column if not exists status text not null default 'active',
  add column if not exists size_bytes bigint,
  add column if not exists mime_type text,
  add column if not exists uploader_name text,
  add column if not exists updated_at timestamptz not null default now();

alter table public.event_playbook_files
  drop constraint if exists event_playbook_files_category_check;

alter table public.event_playbook_files
  add constraint event_playbook_files_category_check
  check (category in (
    'flyer',
    'vendor_list',
    'contract',
    'volunteer_form',
    'artwork',
    'caption_copy',
    'approval_notes',
    'other'
  ));

alter table public.event_playbook_files
  drop constraint if exists event_playbook_files_status_check;

alter table public.event_playbook_files
  add constraint event_playbook_files_status_check
  check (status in ('active', 'pending', 'archived'));

create index if not exists event_playbook_files_uploaded_at_idx
  on public.event_playbook_files (uploaded_at desc);

create index if not exists event_playbook_files_category_idx
  on public.event_playbook_files (category);

-- ---------------------------------------------------------------------------
-- Storage: campaign-files bucket
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('campaign-files', 'campaign-files', true)
on conflict (id) do nothing;

drop policy if exists "Allow public read access on campaign-files"
  on storage.objects;

drop policy if exists "Allow public upload to campaign-files"
  on storage.objects;

drop policy if exists "Allow public update on campaign-files"
  on storage.objects;

drop policy if exists "Allow public delete on campaign-files"
  on storage.objects;

create policy "Allow public read access on campaign-files"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'campaign-files');

create policy "Allow public upload to campaign-files"
  on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'campaign-files');

create policy "Allow public update on campaign-files"
  on storage.objects for update to anon, authenticated
  using (bucket_id = 'campaign-files')
  with check (bucket_id = 'campaign-files');

create policy "Allow public delete on campaign-files"
  on storage.objects for delete to anon, authenticated
  using (bucket_id = 'campaign-files');
