# Storage RLS — Phase C3

**Status:** Living  
**Owner:** Engineering  
**Last updated:** 2026-08-07  
**Related:** [access-control.md](./access-control.md) · [multi-tenant-isolation.md](../security/multi-tenant-isolation.md) · [developer-agreements.md](./developer-agreements.md)

**Supabase project:** `zyllfqieeihshnwpakiv`  
**Core migration:** `supabase/migrations/067_storage_membership_rls.sql`  
**Later bucket policies:** `20260723042605_organization_stickers.sql`, `073_developer_agreements.sql`  
**Depends on:** Phase C helpers (`private.is_active_org_member`, `private.can_access_event`)

---

## Why this exists

Table RLS (Phases C / C2) stopped cross-org row reads. Storage was still open: any authenticated (and often anon) client could read/write entire buckets if they knew or guessed a path.

Phase C3 locks **Storage API** access (`storage.objects` policies) to the same membership model, using the **first path folder** as the tenancy key (except `developer-agreements`).

---

## Path conventions (source of truth = app upload builders)

| Bucket | Visibility | First folder | Example path | App builders |
|--------|------------|--------------|--------------|--------------|
| `vendor-documents` | private | `organization_id` | `{orgId}/{vendorId}/logo/...` or `{orgId}/{vendorId}/{eventId?}/…` | `src/lib/vendors/storage.ts` (docs + logos) |
| `calendar-uploads` | private | `organization_id` | `{orgId}/{timestamp}-file.pdf` | `calendar-import/mutations.ts`, `organizations/mutations.ts` |
| `training-library` | private | `organization_id` | `{orgId}/{docId}/file.pdf` | `organization-intelligence/mutations.ts` |
| `school-assets` | **public** | `organization_id` | `{orgId}/pto-logo.png`, `{orgId}/school-logo.png` | `organizations/mutations.ts` |
| `organization-stickers` | **public** | `organization_id` | `{orgId}/{stickerId}.png` | `src/lib/inbox/sticker-constants.ts` (Meta DM stickers) |
| `event-assets` | **public** | `event_id` (usual) | `{eventId}/{assetType}/…`, AI concepts under `{eventId}/…/concepts/…` | `event-workspace/storage.ts`, `ai-artwork/storage.ts` |
| `campaign-files` | **public** | `event_id` | `{eventId}/{timestamp}-file.pdf` | `campaign-files/storage.ts` |
| `developer-agreements` | private | path prefix (not org/event UUID) | `templates/…`, `signatures/{userId}/…`, `signatures/company/…` | `developer-agreements/actions.ts` + `storage.ts` (`073`) |
| `platform-backgrounds` | **public** | `sources` / `assets` (not org-scoped) | `sources/{uuid}-….png`, `assets/{uuid}-….png` | `background-library/storage.ts` (Owner ops; service-role writes) |

### Path exceptions (still shipped)

| Flow | Bucket | Path | How it works |
|------|--------|------|----------------|
| Homepage Composer card art | `event-assets` | `{orgId}/homepage-composer/…` | Org UUID first folder — **does not** match event-scoped RLS. Uploads use **service role** via `uploadArtworkBytes` when admin is configured (`homepage-composer/artwork-actions.ts`). See [homepage-composer.md](./homepage-composer.md). |
| Newsletter Composer art | `event-assets` | `{orgId}/newsletter-composer/…` | Same org-first / service-role pattern (`newsletter-composer/artwork-actions.ts`). See [newsletter-composer.md](./newsletter-composer.md). |
| AI artwork generation | `event-assets` | `{eventId}/…` | Prefer service role for the same reason (user-JWT Storage RLS failures mid-generation). |
| Developer agreement templates + company countersign + executed packets | `developer-agreements` | `templates/…`, `signatures/company/…`, packet paths | **Service role** only. Authenticated clients may only write `signatures/{auth.uid()}/…`. |

**Do not change first-folder conventions without updating `067` helpers/policies** (and stickers / agreements migrations as needed).

---

## Policy model

Helpers (private schema, from `067`):

| Function | Meaning |
|----------|---------|
| `private.storage_first_folder_uuid(name)` | Parse first `/` segment as uuid (else null → deny) |
| `private.can_access_storage_org_path(name)` | Active org member for that folder |
| `private.can_access_storage_event_path(name)` | `can_access_event` for that folder |

**Org / event buckets:** `SELECT` / `INSERT` / `UPDATE` / `DELETE` for role **`authenticated` only**, same membership predicate on each.

**`developer-agreements`:** path-prefix policies (not `can_access_storage_*`):

| Policy | Ops | Rule |
|--------|-----|------|
| `developer_agreements_select` | SELECT | `templates/%` or `signatures/{auth.uid()}/%` |
| `developer_agreements_insert_own_signature` | INSERT | `signatures/{auth.uid()}/%` |
| `developer_agreements_update_own_signature` | UPDATE | `signatures/{auth.uid()}/%` |
| *(none)* | DELETE | No authenticated delete — cleanup via service role if needed |

Upsert requires INSERT + SELECT + UPDATE — all three use the same predicate where granted.

Service role continues to bypass RLS.

**Live count (2026-07-26):** **31** policies on `storage.objects` — 28 membership (`*_active_member` / `*_event_member`) + 3 developer-agreements. Zero anon / “Allow public…” Storage API policies.

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
- `uploadArtworkBytes` prefers service role when configured

Hard refresh also restores the saved session for affected events.

---

## What this does / does not cover

| Covered | Not covered (follow-up) |
|---------|-------------------------|
| Authenticated Storage API list/download/upload/update/delete | Making public buckets private |
| Signed URL issuance for private buckets (needs SELECT) | Migrating DB-stored public URLs → signed URLs |
| Cross-org path guessing via Storage API | Template permission keys (`upload_artwork`, etc.) — still app-layer |
| Anon Storage API access removed | CDN/public GET on `public = true` buckets |
| | Aligning Homepage Composer paths with event- or org-scoped RLS (today: service role) |

**Residual risk (documented, intentional for this phase):**  
Objects in public buckets remain fetchable via `/storage/v1/object/public/...` URLs already stored in the DB. Closing that requires a signed-URL migration, not only RLS.

Public buckets today: `event-assets`, `campaign-files`, `school-assets`, `organization-stickers`, `platform-backgrounds`.

---

## Image Transformations (display)

**Status (2026-08-07):** Enabled and verified on production project `zyllfqieeihshnwpakiv`.

Public object URLs can be rewritten to on-the-fly derivatives:

`/storage/v1/object/public/{bucket}/{path}` → `/storage/v1/render/image/public/{bucket}/{path}?width=&quality=`

- Helper: `src/lib/images/supabase-thumbnail.ts` (`toSupabaseThumbnailUrl`)
- Auto WebP when the client accepts it; originals remain the source of truth at `storage_path` / original `public_url`
- Do **not** store transform URLs in the database or write separate thumbnail files
- Owner Background Library grids/detail already use this pattern; Approvals / Volunteers hubs do too
- Re-check anytime: Storage → Settings → **Enable Image Transformations**, or fetch a known public object via `/render/image/public/…?width=360` and confirm `image/webp` (or resized) with a much smaller body than the original

Dashboard toggle path: [Storage Settings](https://supabase.com/dashboard/project/zyllfqieeihshnwpakiv/storage/files/settings) (Pro plan and above).

---

## How to re-verify

1. SQL — policies match membership / agreements model:

```sql
select policyname, cmd, roles::text, qual
from pg_policies
where schemaname = 'storage' and tablename = 'objects'
order by policyname;
```

Expect **31** policies: 28 named `*_active_member` / `*_event_member` (using `can_access_storage_*`), plus 3 `developer_agreements_*`. Zero `Allow public…` / anon roles.

2. Authenticated Storage API smoke:
   - Upload to `event-assets/{ownEventId}/…` → **OK**
   - Upload to `vendor-documents/{foreignOrgId}/…` → **denied**
   - `createSignedUrl` on existing vendor logo path → **OK**
   - Stickers: upload to `organization-stickers/{ownOrgId}/…` → **OK**

3. Contract tests: `src/lib/auth/__tests__/storage-rls-phase-c3.test.ts` (via `npm run test:team-access`)

---

## File index

| Area | Path |
|------|------|
| C3 helpers + org/event policies | `supabase/migrations/067_storage_membership_rls.sql` |
| Organization stickers bucket + policies | `supabase/migrations/20260723042605_organization_stickers.sql` |
| Developer agreements bucket + policies | `supabase/migrations/073_developer_agreements.sql` |
| Contract test | `src/lib/auth/__tests__/storage-rls-phase-c3.test.ts` |
| Path builders | `vendors/storage.ts`, `event-workspace/storage.ts`, `campaign-files/storage.ts`, `inbox/sticker-constants.ts`, `ai-artwork/storage.ts`, `homepage-composer/artwork-actions.ts`, `newsletter-composer/artwork-actions.ts`, `developer-agreements/actions.ts` |
