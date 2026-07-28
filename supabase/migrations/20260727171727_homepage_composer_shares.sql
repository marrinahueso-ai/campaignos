-- Shareable Homepage Composer preview snapshots (tokenized public links).

create table if not exists public.homepage_composer_shares (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  created_by uuid references auth.users (id) on delete set null,
  title text not null default 'Homepage preview',
  composer_state jsonb not null,
  preview_mode text not null default 'full_month'
    check (preview_mode in ('full_month', 'as_of_date')),
  as_of_date date,
  include_visibility_memos boolean not null default true,
  -- Future approvals: draft | shared | pending_approval | approved
  share_status text not null default 'shared'
    check (share_status in ('draft', 'shared', 'pending_approval', 'approved')),
  approval_item_id uuid,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists homepage_composer_shares_org_idx
  on public.homepage_composer_shares (organization_id, created_at desc);

create index if not exists homepage_composer_shares_token_idx
  on public.homepage_composer_shares (token);

alter table public.homepage_composer_shares enable row level security;

create policy homepage_composer_shares_select_active_member
  on public.homepage_composer_shares
  for select
  using (private.is_active_org_member(organization_id));

create policy homepage_composer_shares_insert_active_member
  on public.homepage_composer_shares
  for insert
  with check (private.is_active_org_member(organization_id));

create policy homepage_composer_shares_update_active_member
  on public.homepage_composer_shares
  for update
  using (private.is_active_org_member(organization_id))
  with check (private.is_active_org_member(organization_id));

create policy homepage_composer_shares_delete_active_member
  on public.homepage_composer_shares
  for delete
  using (private.is_active_org_member(organization_id));
