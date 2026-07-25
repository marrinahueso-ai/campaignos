-- Security fix: organization_canva_connections, organization_ai_profile, and
-- organization_training_documents were missed by the 064-067 membership-scoped
-- RLS hardening sweep and were left fully open ("using (true)") to both `anon`
-- and `authenticated`. This let anyone with only the public anon key read (and
-- write/delete) every org's Canva OAuth tokens, AI brand-voice profile, and
-- training document metadata. Lock these down to the same
-- private.is_active_org_member(organization_id) pattern used everywhere else.

-- ---------------------------------------------------------------------------
-- organization_canva_connections (stores Canva access/refresh tokens)
-- ---------------------------------------------------------------------------

drop policy if exists "Allow public read access on organization_canva_connections"
  on public.organization_canva_connections;
drop policy if exists "Allow public insert access on organization_canva_connections"
  on public.organization_canva_connections;
drop policy if exists "Allow public update access on organization_canva_connections"
  on public.organization_canva_connections;
drop policy if exists "Allow public delete access on organization_canva_connections"
  on public.organization_canva_connections;

create policy "organization_canva_connections_select_active_member"
  on public.organization_canva_connections for select to authenticated
  using (private.is_active_org_member(organization_id));
create policy "organization_canva_connections_insert_active_member"
  on public.organization_canva_connections for insert to authenticated
  with check (private.is_active_org_member(organization_id));
create policy "organization_canva_connections_update_active_member"
  on public.organization_canva_connections for update to authenticated
  using (private.is_active_org_member(organization_id))
  with check (private.is_active_org_member(organization_id));
create policy "organization_canva_connections_delete_active_member"
  on public.organization_canva_connections for delete to authenticated
  using (private.is_active_org_member(organization_id));

-- ---------------------------------------------------------------------------
-- organization_ai_profile (brand voice / writing style profile)
-- ---------------------------------------------------------------------------

drop policy if exists "Allow public read access on organization_ai_profile"
  on public.organization_ai_profile;
drop policy if exists "Allow public insert access on organization_ai_profile"
  on public.organization_ai_profile;
drop policy if exists "Allow public update access on organization_ai_profile"
  on public.organization_ai_profile;
drop policy if exists "Allow public delete access on organization_ai_profile"
  on public.organization_ai_profile;

create policy "organization_ai_profile_select_active_member"
  on public.organization_ai_profile for select to authenticated
  using (private.is_active_org_member(organization_id));
create policy "organization_ai_profile_insert_active_member"
  on public.organization_ai_profile for insert to authenticated
  with check (private.is_active_org_member(organization_id));
create policy "organization_ai_profile_update_active_member"
  on public.organization_ai_profile for update to authenticated
  using (private.is_active_org_member(organization_id))
  with check (private.is_active_org_member(organization_id));
create policy "organization_ai_profile_delete_active_member"
  on public.organization_ai_profile for delete to authenticated
  using (private.is_active_org_member(organization_id));

-- ---------------------------------------------------------------------------
-- organization_training_documents (training doc metadata)
-- ---------------------------------------------------------------------------

drop policy if exists "Allow public read access on organization_training_documents"
  on public.organization_training_documents;
drop policy if exists "Allow public insert access on organization_training_documents"
  on public.organization_training_documents;
drop policy if exists "Allow public update access on organization_training_documents"
  on public.organization_training_documents;
drop policy if exists "Allow public delete access on organization_training_documents"
  on public.organization_training_documents;

create policy "organization_training_documents_select_active_member"
  on public.organization_training_documents for select to authenticated
  using (private.is_active_org_member(organization_id));
create policy "organization_training_documents_insert_active_member"
  on public.organization_training_documents for insert to authenticated
  with check (private.is_active_org_member(organization_id));
create policy "organization_training_documents_update_active_member"
  on public.organization_training_documents for update to authenticated
  using (private.is_active_org_member(organization_id))
  with check (private.is_active_org_member(organization_id));
create policy "organization_training_documents_delete_active_member"
  on public.organization_training_documents for delete to authenticated
  using (private.is_active_org_member(organization_id));

-- Note: the `training-library` storage bucket itself is already correctly
-- scoped by migration 067 (private.can_access_storage_org_path) — only the
-- organization_training_documents metadata TABLE was left open here.
