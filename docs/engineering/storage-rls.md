# Storage RLS — Phase C3

**Status:** Applied on Supabase project `zyllfqieeihshnwpakiv`  
**Last updated:** July 18, 2026  
**Migration:** `supabase/migrations/067_storage_membership_rls.sql`  
**Depends on:** Phase C helpers (`private.is_active_org_member`, `private.can_access_event`)

Companion: [access-control.md](./access-control.md)

---

## Why this exists

Table RLS (Phases C / C2) stopped cross-org row reads. Storage was still open: any authenticated (and often anon) client could read/write entire buckets if they knew or guessed a path.

Phase C3 locks **Storage API** access (`storage.objects` policies) to the same membership model, using the **first path folder** as the tenancy key.

---

## Path conventions (source of truth = app upload builders)

| Bucket | Visibility | First folder | Example path | App builders |
|--------|------------|--------------|--------------|--------------|
| `vendor-documents` | private | `organization_id` | `{orgId}/{vendorId}/logo/...` | `src/lib/vendors/storage.ts` |
| `calendar-uploads` | private | `organization_id` | `{orgId}/{timestamp}-file.pdf` | `calendar-import/mutations.ts`, `organizations/mutations.ts` |
| `training-library` | private | `organization_id` | `{orgId}/{docId}/file.pdf` | `organization-intelligence/mutations.ts` |
| `school-assets` | **public** | `organization_id` | `{orgId}/pto-logo.png` | `organizations/mutations.ts` |
| `event-assets` | **public** | `event_id` | `{eventId}/campaign-builder-v2/...` | `event-workspace/storage.ts`, AI / builder uploaders |
| `campaign-files` | **public** | `event_id` | `{eventId}/{timestamp}-file.pdf` | `campaign-files/storage.ts` |

**Do not change first-folder conventions without updating `067` helpers/policies.**

---

## Policy model

Helpers (private schema):

| Function | Meaning |
|----------|---------|
| `private.storage_first_folder_uuid(name)` | Parse first `/` segment as uuid (else null → deny) |
| `private.can_access_storage_org_path(name)` | Active org member for that folder |
| `private.can_access_storage_event_path(name)` | `can_access_event` for that folder |

Per bucket: `SELECT` / `INSERT` / `UPDATE` / `DELETE` for role **`authenticated` only**.

Upsert requires INSERT + SELECT + UPDATE — all three use the same predicate.

Service role continues to bypass RLS.

---

## Incident note (Create with AI / BooHoo) — 2026-07-18

During remote apply of C3, `storage.objects` policies were dropped before
event-bucket policies were recreated (brief gap). Authenticated uploads to
`event-assets` then failed with `new row violates row-level security policy`.

Symptoms in Create with AI:
- Preview showed empty milestone + RLS error
- Stepper showed `0 of 1 milestones complete` even after a later successful save

Mitigations shipped in app code:
- `protectSessionFromRichnessDowngrade` on session save (do not wipe richer server art)
- Client recovers from server when generation fails / Preview is empty

Hard refresh also restores the saved session for affected events.

---

## What this does / does not cover

| Covered | Not covered (follow-up) |
|---------|-------------------------|
| Authenticated Storage API list/download/upload/update/delete | Making public buckets private |
| Signed URL issuance for private buckets (needs SELECT) | Migrating DB-stored public URLs → signed URLs |
| Cross-org path guessing via Storage API | Template permission keys (`upload_artwork`, etc.) — still app-layer |
| Anon Storage API access removed | CDN/public GET on `public = true` buckets |

**Residual risk (documented, intentional for this phase):**  
Objects in public buckets remain fetchable via `/storage/v1/object/public/...` URLs already stored in the DB. Closing that requires a signed-URL migration, not only RLS.

---

## How to re-verify

1. SQL — no open bucket-only policies remain:

```sql
select policyname, cmd, roles::text, qual
from pg_policies
where schemaname = 'storage' and tablename = 'objects'
order by policyname;
```

Expect **24** policies named `*_active_member` / `*_event_member`, all using `can_access_storage_*`. Zero `Allow public…` / anon roles.

2. Authenticated Storage API smoke (2026-07-18):
   - Test admin: upload to `event-assets/{ownEventId}/…` → **OK**
   - Test admin: upload to `vendor-documents/{foreignOrgId}/…` → **denied**
   - Test admin: `createSignedUrl` on existing vendor logo path → **OK**
   - Playwright: `01`, `05`, `07` → **7/7 pass**

3. Contract tests: `src/lib/auth/__tests__/storage-rls-phase-c3.test.ts` (via `npm run test:team-access`)

---

## File index

| Area | Path |
|------|------|
| Migration | `supabase/migrations/067_storage_membership_rls.sql` |
| Contract test | `src/lib/auth/__tests__/storage-rls-phase-c3.test.ts` |
| Path builders | `src/lib/vendors/storage.ts`, `event-workspace/storage.ts`, `campaign-files/storage.ts` |
