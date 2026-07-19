-- =============================================================================
-- Phase C3 — Membership-scoped Storage RLS
-- =============================================================================
-- Project: zyllfqieeihshnwpakiv
-- Depends on: 064 (private.is_active_org_member, private.can_access_event),
--             065 (private.drop_all_policies)
--
-- Applied remotely as:
--   storage_membership_rls_helpers
--   storage_membership_rls_org_buckets
--   storage_membership_rls_event_buckets_v2
-- This file remains the source of truth for the C3 policy set.
--
-- Intent
-- ------
-- Replace open "Allow public/authenticated … by bucket_id only" policies on
-- storage.objects with path-aware membership checks that match app upload
-- conventions (see docs/STORAGE_RLS.md):
--
--   Org-prefixed paths (first folder = organization_id):
--     school-assets, vendor-documents, calendar-uploads, training-library
--
--   Event-prefixed paths (first folder = event_id):
--     event-assets, campaign-files
--
-- Roles
-- -----
--   * Policies target `authenticated` only (no anon Storage API access).
--   * Service role bypasses RLS (unchanged).
--
-- Public buckets (residual risk — intentional for this phase)
-- ----------------------------------------------------------
--   event-assets, campaign-files, school-assets remain `public = true` so
--   existing DB-stored `/object/public/...` URLs keep working.
--   Public HTTP GET still bypasses these policies; this migration hardens
--   Storage API list/upload/update/delete (+ signed-URL issuance for private
--   buckets). Flipping buckets private + signed URLs is a separate follow-up.
--
-- Upsert note
-- -----------
-- Storage upsert needs INSERT + SELECT + UPDATE. All three are granted for
-- each bucket under the same membership predicate.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Helpers: parse first path folder safely as uuid
-- ---------------------------------------------------------------------------
create or replace function private.storage_first_folder_uuid(p_object_name text)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when (storage.foldername(p_object_name))[1]
      ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then ((storage.foldername(p_object_name))[1])::uuid
    else null
  end;
$$;

comment on function private.storage_first_folder_uuid(text) is
  'First path segment of a storage object name as uuid, or null if not a uuid.';

revoke all on function private.storage_first_folder_uuid(text) from public;
grant execute on function private.storage_first_folder_uuid(text)
  to authenticated, service_role;

create or replace function private.can_access_storage_org_path(p_object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_active_org_member(
    private.storage_first_folder_uuid(p_object_name)
  );
$$;

comment on function private.can_access_storage_org_path(text) is
  'True when auth.uid() is an active member of the org in the first path folder.';

revoke all on function private.can_access_storage_org_path(text) from public;
grant execute on function private.can_access_storage_org_path(text)
  to authenticated, service_role;

create or replace function private.can_access_storage_event_path(p_object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.can_access_event(
    private.storage_first_folder_uuid(p_object_name)
  );
$$;

comment on function private.can_access_storage_event_path(text) is
  'True when auth.uid() can access the event in the first path folder.';

revoke all on function private.can_access_storage_event_path(text) from public;
grant execute on function private.can_access_storage_event_path(text)
  to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Replace all storage.objects policies
-- ---------------------------------------------------------------------------
select private.drop_all_policies('storage.objects');

-- ---- Org-prefixed private buckets ----------------------------------------

-- vendor-documents: {organizationId}/{vendorId}/...
create policy vendor_documents_select_active_member on storage.objects
  for select to authenticated
  using (
    bucket_id = 'vendor-documents'
    and private.can_access_storage_org_path(name)
  );
create policy vendor_documents_insert_active_member on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'vendor-documents'
    and private.can_access_storage_org_path(name)
  );
create policy vendor_documents_update_active_member on storage.objects
  for update to authenticated
  using (
    bucket_id = 'vendor-documents'
    and private.can_access_storage_org_path(name)
  )
  with check (
    bucket_id = 'vendor-documents'
    and private.can_access_storage_org_path(name)
  );
create policy vendor_documents_delete_active_member on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'vendor-documents'
    and private.can_access_storage_org_path(name)
  );

-- calendar-uploads: {organizationId}/{timestamp}-filename
create policy calendar_uploads_select_active_member on storage.objects
  for select to authenticated
  using (
    bucket_id = 'calendar-uploads'
    and private.can_access_storage_org_path(name)
  );
create policy calendar_uploads_insert_active_member on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'calendar-uploads'
    and private.can_access_storage_org_path(name)
  );
create policy calendar_uploads_update_active_member on storage.objects
  for update to authenticated
  using (
    bucket_id = 'calendar-uploads'
    and private.can_access_storage_org_path(name)
  )
  with check (
    bucket_id = 'calendar-uploads'
    and private.can_access_storage_org_path(name)
  );
create policy calendar_uploads_delete_active_member on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'calendar-uploads'
    and private.can_access_storage_org_path(name)
  );

-- training-library: {organizationId}/{documentId}/filename
create policy training_library_select_active_member on storage.objects
  for select to authenticated
  using (
    bucket_id = 'training-library'
    and private.can_access_storage_org_path(name)
  );
create policy training_library_insert_active_member on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'training-library'
    and private.can_access_storage_org_path(name)
  );
create policy training_library_update_active_member on storage.objects
  for update to authenticated
  using (
    bucket_id = 'training-library'
    and private.can_access_storage_org_path(name)
  )
  with check (
    bucket_id = 'training-library'
    and private.can_access_storage_org_path(name)
  );
create policy training_library_delete_active_member on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'training-library'
    and private.can_access_storage_org_path(name)
  );

-- ---- Org-prefixed public bucket (API hardened; public GET unchanged) -----

-- school-assets: {organizationId}/pto-logo.* | school-logo.*
create policy school_assets_select_active_member on storage.objects
  for select to authenticated
  using (
    bucket_id = 'school-assets'
    and private.can_access_storage_org_path(name)
  );
create policy school_assets_insert_active_member on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'school-assets'
    and private.can_access_storage_org_path(name)
  );
create policy school_assets_update_active_member on storage.objects
  for update to authenticated
  using (
    bucket_id = 'school-assets'
    and private.can_access_storage_org_path(name)
  )
  with check (
    bucket_id = 'school-assets'
    and private.can_access_storage_org_path(name)
  );
create policy school_assets_delete_active_member on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'school-assets'
    and private.can_access_storage_org_path(name)
  );

-- ---- Event-prefixed public buckets (API hardened; public GET unchanged) --

-- event-assets: {eventId}/...
create policy event_assets_select_event_member on storage.objects
  for select to authenticated
  using (
    bucket_id = 'event-assets'
    and private.can_access_storage_event_path(name)
  );
create policy event_assets_insert_event_member on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'event-assets'
    and private.can_access_storage_event_path(name)
  );
create policy event_assets_update_event_member on storage.objects
  for update to authenticated
  using (
    bucket_id = 'event-assets'
    and private.can_access_storage_event_path(name)
  )
  with check (
    bucket_id = 'event-assets'
    and private.can_access_storage_event_path(name)
  );
create policy event_assets_delete_event_member on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'event-assets'
    and private.can_access_storage_event_path(name)
  );

-- campaign-files: {eventId}/{timestamp}-filename
create policy campaign_files_select_event_member on storage.objects
  for select to authenticated
  using (
    bucket_id = 'campaign-files'
    and private.can_access_storage_event_path(name)
  );
create policy campaign_files_insert_event_member on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'campaign-files'
    and private.can_access_storage_event_path(name)
  );
create policy campaign_files_update_event_member on storage.objects
  for update to authenticated
  using (
    bucket_id = 'campaign-files'
    and private.can_access_storage_event_path(name)
  )
  with check (
    bucket_id = 'campaign-files'
    and private.can_access_storage_event_path(name)
  );
create policy campaign_files_delete_event_member on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'campaign-files'
    and private.can_access_storage_event_path(name)
  );
