-- Org-scoped custom stickers for Communications Hub (image uploads).
-- Public bucket so Meta Messenger/IG can fetch attachment URLs when sending DMs.

-- ---------------------------------------------------------------------------
-- Table
-- ---------------------------------------------------------------------------
create table if not exists public.organization_stickers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  label text not null default 'Sticker',
  storage_path text not null,
  public_url text not null,
  mime_type text,
  size_bytes integer,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organization_stickers_storage_path_unique unique (storage_path),
  constraint organization_stickers_size_bytes_positive
    check (size_bytes is null or size_bytes > 0)
);

create index if not exists organization_stickers_org_created_idx
  on public.organization_stickers (organization_id, created_at desc);

comment on table public.organization_stickers is
  'Custom image stickers for Communications Hub replies (org-scoped).';

alter table public.organization_stickers enable row level security;

drop policy if exists organization_stickers_select_active_member
  on public.organization_stickers;
drop policy if exists organization_stickers_insert_active_member
  on public.organization_stickers;
drop policy if exists organization_stickers_update_active_member
  on public.organization_stickers;
drop policy if exists organization_stickers_delete_active_member
  on public.organization_stickers;

create policy organization_stickers_select_active_member
  on public.organization_stickers
  for select to authenticated
  using (private.is_active_org_member(organization_id));

create policy organization_stickers_insert_active_member
  on public.organization_stickers
  for insert to authenticated
  with check (private.is_active_org_member(organization_id));

create policy organization_stickers_update_active_member
  on public.organization_stickers
  for update to authenticated
  using (private.is_active_org_member(organization_id))
  with check (private.is_active_org_member(organization_id));

create policy organization_stickers_delete_active_member
  on public.organization_stickers
  for delete to authenticated
  using (private.is_active_org_member(organization_id));

-- ---------------------------------------------------------------------------
-- Storage bucket (public HTTP GET for Meta attachment fetch)
-- Path convention: {organization_id}/{sticker_id}.{ext}
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'organization-stickers',
  'organization-stickers',
  true,
  2097152, -- 2 MiB
  array['image/png', 'image/webp', 'image/gif', 'image/jpeg']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists organization_stickers_select_active_member on storage.objects;
drop policy if exists organization_stickers_insert_active_member on storage.objects;
drop policy if exists organization_stickers_update_active_member on storage.objects;
drop policy if exists organization_stickers_delete_active_member on storage.objects;

create policy organization_stickers_select_active_member on storage.objects
  for select to authenticated
  using (
    bucket_id = 'organization-stickers'
    and private.can_access_storage_org_path(name)
  );

create policy organization_stickers_insert_active_member on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'organization-stickers'
    and private.can_access_storage_org_path(name)
  );

create policy organization_stickers_update_active_member on storage.objects
  for update to authenticated
  using (
    bucket_id = 'organization-stickers'
    and private.can_access_storage_org_path(name)
  )
  with check (
    bucket_id = 'organization-stickers'
    and private.can_access_storage_org_path(name)
  );

create policy organization_stickers_delete_active_member on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'organization-stickers'
    and private.can_access_storage_org_path(name)
  );
