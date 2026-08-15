-- Customer Terms of Service / Privacy Policy acceptance history.
-- Append-only. Platform-scoped (not org-scoped). Distinct from developer NDA/IP signatures.

create table if not exists public.legal_acceptances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  document_type text not null,
  version text not null,
  source text not null,
  accepted_at timestamptz not null default now(),
  constraint legal_acceptances_document_type_check
    check (document_type in ('terms', 'privacy')),
  constraint legal_acceptances_source_check
    check (source in ('signup', 'invite', 'reaccept_gate')),
  constraint legal_acceptances_user_document_version_key
    unique (user_id, document_type, version)
);

create index if not exists legal_acceptances_user_id_idx
  on public.legal_acceptances (user_id);

create index if not exists legal_acceptances_user_terms_version_idx
  on public.legal_acceptances (user_id, document_type, version);

comment on table public.legal_acceptances is
  'Append-only customer legal-document acceptance. Service role writes; users may read their own rows.';

alter table public.legal_acceptances enable row level security;

-- Users can read their own history (gate + account). They cannot write via JWT.
drop policy if exists "legal_acceptances_select_own" on public.legal_acceptances;
create policy "legal_acceptances_select_own"
  on public.legal_acceptances for select to authenticated
  using (user_id = auth.uid());

-- No INSERT / UPDATE / DELETE policies for authenticated or anon.
-- Writes go through createAdminClient() (service role) after getAuthUser().
revoke insert, update, delete on public.legal_acceptances from anon, authenticated;
grant select on public.legal_acceptances to authenticated;
