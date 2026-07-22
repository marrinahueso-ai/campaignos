-- Developer / contractor legal agreements (NDA, IP, future docs)
-- Platform-scoped (not org-scoped). Gate before app access for matching roles.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.developer_agreement_documents (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text not null default '',
  document_number text,
  sort_order integer not null default 0,
  required_for_roles text[] not null default array['developer']::text[],
  is_active boolean not null default true,
  current_version_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.developer_agreement_versions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.developer_agreement_documents (id) on delete cascade,
  version_label text not null,
  body_html text not null,
  source_filename text,
  storage_path text,
  effective_at timestamptz not null default now(),
  is_published boolean not null default true,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (document_id, version_label)
);

alter table public.developer_agreement_documents
  drop constraint if exists developer_agreement_documents_current_version_id_fkey;

alter table public.developer_agreement_documents
  add constraint developer_agreement_documents_current_version_id_fkey
  foreign key (current_version_id)
  references public.developer_agreement_versions (id)
  on delete set null;

create table if not exists public.developer_agreement_signatures (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  organization_user_id uuid references public.organization_users (id) on delete set null,
  document_id uuid not null references public.developer_agreement_documents (id) on delete restrict,
  version_id uuid not null references public.developer_agreement_versions (id) on delete restrict,
  typed_legal_name text not null,
  signature_image_path text not null,
  ip_address text,
  user_agent text,
  signed_at timestamptz not null default now(),
  unique (user_id, version_id)
);

create index if not exists developer_agreement_signatures_user_id_idx
  on public.developer_agreement_signatures (user_id);

create index if not exists developer_agreement_documents_active_sort_idx
  on public.developer_agreement_documents (is_active, sort_order);

-- ---------------------------------------------------------------------------
-- Storage bucket (platform legal originals + drawn signatures)
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('developer-agreements', 'developer-agreements', false)
on conflict (id) do nothing;

-- Authenticated users may read objects under templates/ and their own signatures/{user_id}/
drop policy if exists "developer_agreements_select" on storage.objects;
create policy "developer_agreements_select"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'developer-agreements'
    and (
      name like 'templates/%'
      or name like ('signatures/' || auth.uid()::text || '/%')
    )
  );

drop policy if exists "developer_agreements_insert_own_signature" on storage.objects;
create policy "developer_agreements_insert_own_signature"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'developer-agreements'
    and name like ('signatures/' || auth.uid()::text || '/%')
  );

drop policy if exists "developer_agreements_update_own_signature" on storage.objects;
create policy "developer_agreements_update_own_signature"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'developer-agreements'
    and name like ('signatures/' || auth.uid()::text || '/%')
  )
  with check (
    bucket_id = 'developer-agreements'
    and name like ('signatures/' || auth.uid()::text || '/%')
  );

-- Template uploads go through service role (admin actions).

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.developer_agreement_documents enable row level security;
alter table public.developer_agreement_versions enable row level security;
alter table public.developer_agreement_signatures enable row level security;

drop policy if exists "developer_agreement_documents_select" on public.developer_agreement_documents;
create policy "developer_agreement_documents_select"
  on public.developer_agreement_documents for select to authenticated
  using (is_active = true);

drop policy if exists "developer_agreement_versions_select" on public.developer_agreement_versions;
create policy "developer_agreement_versions_select"
  on public.developer_agreement_versions for select to authenticated
  using (is_published = true);

drop policy if exists "developer_agreement_signatures_select_own" on public.developer_agreement_signatures;
create policy "developer_agreement_signatures_select_own"
  on public.developer_agreement_signatures for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "developer_agreement_signatures_insert_own" on public.developer_agreement_signatures;
create policy "developer_agreement_signatures_insert_own"
  on public.developer_agreement_signatures for insert to authenticated
  with check (user_id = auth.uid());

-- Mutations for documents/versions use service role from owner-gated server actions.
