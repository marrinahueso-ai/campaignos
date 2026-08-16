# Hey Ralli — Image architecture

**Status:** Living  
**Owner:** Engineering  
**Last updated:** 2026-08-16 — Inbox avatars: nested fbcdn CSP + no no-referrer  
**Related:** [Architecture](./architecture.md) · [Storage RLS](./storage-rls.md) · [Feature list](../product/feature-list.md) · [Performance budget](../qa/performance-budget.md) · [Homepage Composer](./homepage-composer.md) · [Newsletter Composer](./newsletter-composer.md) · [Release checkpoint 2026-08-08](../qa/release-checkpoint-2026-08-08-events-workspace.md)

This is the **canonical guide** for how images are uploaded, stored, displayed, published, and consumed by AI across Hey Ralli. Follow it for every new image-heavy feature.

---

## 1. Principles (non-negotiable)

| Rule | Do | Do not |
|------|----|--------|
| Canonical asset | Store **one** high-quality original in Supabase Storage | Create thumb / medium / web duplicate files |
| Display | Derive Supabase Image Transformation URLs **at render time** | Persist `/render/image/…` URLs in the database |
| Grids / cards / dashboards | Serve bounded transforms via `AppImage` / `toDisplayImageUrl` | Load full-resolution originals in lists |
| Full-quality consumers | Pass **original** object URLs | Feed transform URLs into AI, Meta, download, print, or email |
| CDN / delivery | Rely on Supabase Storage CDN + Image Transformations | Add Cloudflare Images or a second object store without a strong reason |
| Shared code | Use `AppImage` + `toDisplayImageUrl` | Copy-paste local `ArtTile` / `isOptimizableImageUrl` helpers |

**Source of truth:** Supabase Storage (public or private buckets). Postgres holds `storage_path` and optionally the original `public_url` — never a transform URL.

---

## 2. Pipeline overview

```text
Upload / AI generate / logo / Canva import
        │
        ▼
Supabase Storage — one original object
  (versioned or UUID path; long cacheControl when immutable)
        │
        ├── DB: storage_path (+ optional original public_url)
        │
        ├── Display (grids, cards, hubs, pickers, small previews)
        │     → toDisplayImageUrl / AppImage
        │     → /storage/v1/render/image/public/…?width=&quality=
        │     → auto WebP when supported · CDN cache · next/image
        │
        └── Original URL only
              AI inspiration · AI generation · Meta publish
              Downloads · exports · print · email HTML
              Lightbox “view full” · editing canvas
```

---

## 3. Shared code (start here)

| Piece | Path | Role |
|-------|------|------|
| Presets | `src/lib/images/presets.ts` | `thumb` / `card` / `hero` / `detail` widths + quality |
| Display API | `src/lib/images/display.ts` | `toDisplayImageUrl`, `canOptimizeWithNextImage`, `isLocalOrDataImageUrl` |
| Low-level transform | `src/lib/images/supabase-thumbnail.ts` | Rewrites public object → `/render/image/public/` |
| UI component | `src/components/images/AppImage.tsx` | Prefer this for all new display surfaces |
| Tests | `src/lib/images/__tests__/display.test.ts`, `supabase-thumbnail.test.ts` | Contract tests for transforms |

### Display presets

| Preset | Transform width | Typical CSS size | Use for |
|--------|-----------------|------------------|---------|
| `thumb` | 128 | ~40–64px | Table cells, chips, compact list icons |
| `card` | 360 | ~180–360px | Grids, focus cards, library tiles |
| `hero` | 800 | ~280–800px | Dashboard / event heroes |
| `detail` | 800 | Side panel preview | Selected asset preview (still bounded) |

Override with `displayWidth` / `displayHeight` / `resize` when a surface needs a specific box. Cap in the rewriter is **800px** (Supabase allows up to 2500; we keep display bounded).

### Intent

```tsx
import { AppImage } from "@/components/images/AppImage";

// Display (default) — transform when the URL is a public Supabase object
<AppImage src={publicUrl} alt="" fill preset="card" sizes="220px" />

// Original — never transform (lightbox enlarge, rare full preview)
<AppImage src={publicUrl} alt="" fill intent="original" sizes="90vw" />
```

Or URL-only:

```ts
import { toDisplayImageUrl } from "@/lib/images/display";

const thumb = toDisplayImageUrl(url, { preset: "thumb" });
const original = toDisplayImageUrl(url, { intent: "original" });
```

`AppImage` falls back to a plain `<img>` for `blob:`, `data:`, static `/…` paths, and non-Supabase hosts (Meta avatars, GIPHY, Canva CDN).

Inbox contact/page avatars use `InboxParticipantAvatar` (plain `<img>` + initials on error). CSP `img-src` in `next.config.ts` allowlists Meta lookaside (`*.fbsbx.com`), nested Facebook CDNs (`*.fbcdn.net`, `*.xx.fbcdn.net`, `*.fna.fbcdn.net`), `*.cdninstagram.com`, `graph.facebook.com`, and `*.giphy.com` so profile pictures are not blocked. Do not set `referrerPolicy="no-referrer"` on those `<img>`s — signed Meta CDNs often fail without a referrer.

---

## 4. When to use originals vs transforms

### Always originals

| Consumer | Why |
|----------|-----|
| AI inspiration / generation | Model needs full detail (`detail: "high"`) |
| Meta Instagram + Facebook Story | Graph receives the public object URL |
| Meta Facebook feed | Fetch original, then **ephemeral** sharp 4:5 JPEG at publish (not stored) |
| Downloads / Files API / Story Post Kit | User expects full quality |
| Email HTML / newsletter / homepage export | Email clients; transform URLs are fragile |
| Print / flyer export | Full resolution |
| Lightbox “enlarge” / edit canvas | Pixel-accurate review |

### Always transforms (display)

| Surface | Notes |
|---------|-------|
| Background Library grids / detail | `AppImage` |
| Approvals Ease + table | Focus cards: inset `p-3` + `rounded-[14px]` art wells (not flush); compact queue/table thumbs: square transform + `object-cover` |
| Volunteers Ease | Same focus inset + `rounded-[14px]`; cover for compact queue thumbs; contain for larger focus art |
| Events Ease list / focus / upcoming | Legacy ease list helpers remain for thumbs; **Events home selected hero** uses `AppImage` `preset="hero"` + `object-cover`; **Also Ahead** uses `preset="thumb"` |
| Event ID overview poster | `AppImage` `preset="card"` (detail variant) |
| Campaign list thumbs | `CampaignThumbnail` → `AppImage` |
| Today / Dashboard widgets | `AppImage` |
| Small approval lightbox **tiles** | Transform; open lightbox stays original |

### Documented exceptions

| Exception | Behavior | Why |
|-----------|----------|-----|
| Homepage / Newsletter / Volunteer composer upload | Client JPEG compress (~650KB, max edge ~1100) before store | Email/HTML payload; not a second thumbnail system |
| Flyer QR composite | sharp stamps QR onto AI PNG | Product requirement |
| `events.approved_square_image_url` | May be a data URL | Prefer Storage object for new work |
| Vendor logos (private bucket) | Signed original URL today | Transform helper is public-path only; use `createSignedUrl` + transform when migrating |
| Meta / GIPHY / Canva remote thumbs | External CDNs | Not our Storage objects |
| Static marketing (`/images/*`, BrandLogo) | `next/image` on repo assets | Not Supabase |

---

## 5. Storage buckets (images)

Path and RLS details: **[storage-rls.md](./storage-rls.md)**.

| Bucket | Visibility | Typical images |
|--------|------------|----------------|
| `platform-backgrounds` | public | Owner Background Library sources + assets |
| `event-assets` | public | AI art, campaign builder, flyer, composers |
| `campaign-files` | public | Files hub images |
| `school-assets` | public | PTO / school / brand-kit logos |
| `organization-stickers` | public | Inbox stickers |
| `vendor-documents` | private | Vendor logos (signed at display) |

**Upload conventions**

- Prefer **relative** `storage_path` in DB; derive public URL with bucket helpers.
- Immutable / versioned paths when possible; set long `cacheControl` (e.g. Background Library: `public, max-age=31536000`).
- Enforce MIME + size limits at the action layer (Background Library 12MB/file, **40MB total** per bulk FormData; event assets 10MB; stickers 2MB; etc.).
- Server Action request ceiling is `experimental.serverActions.bodySizeLimit` in `next.config.ts` (max of event-asset + Background Library bulk budgets).
- **Background Library uploads** use signed direct-to-Supabase Storage (`createSignedUploadUrl` → browser `uploadToSignedUrl` → register DB row). Bytes never pass through the Vercel Server Action body, so large images do not hit the platform request-size wall or the dashboard error screen.

**Image Transformations** must stay enabled on the Supabase project (Pro+): [Storage Settings](https://supabase.com/dashboard/project/zyllfqieeihshnwpakiv/storage/files/settings).

Verify quickly:

```text
GET …/storage/v1/render/image/public/{bucket}/{path}?width=360&quality=72
```

Expect a much smaller body than the original (often `image/webp`) and `cf-cache-status` on repeat requests.

---

## 6. Feature map (where images live)

| Feature | Store | Display | Full-quality use |
|---------|-------|---------|------------------|
| Background Library | `platform-backgrounds` | Owner grids + school picker (`AppImage`) | AI generate from source; **vision auto-tag** fills searchable metadata (title, tags, …) from the image; school attach uses original `public_url` as inspiration (Social / Flyer); selecting bumps `usage_count` |
| AI / Artwork V2 / CB2 | `event-assets` | Hubs via shared thumbs; builder still migrating | Generation + inspiration URLs |
| Approvals / Volunteers / Events / Today | URLs from event / approval rows | Shared pipeline | Download / Meta from original columns |
| Campaign lists | Hero artwork URL | `CampaignThumbnail` | — |
| School / PTO logos | `school-assets` | Prefer `AppImage` for new UI | Overlay into AI / composers as original |
| Vendors | `vendor-documents` | Signed URL (`VendorLogoMark`) | — |
| Stickers / GIPHY | Stickers bucket / GIPHY CDN | Raw `<img>` today | Meta DM attachment = original / CDN send URL |
| Newsletter / Homepage / Volunteer composers | `event-assets` (often compressed) | In-app tiles migrating | Export HTML uses hosted URL |
| Flyer composer | `event-assets` | React builder `<img>` preview | Approval + Files save = original |
| Insights | Meta Graph thumbnails | Remote `<img>` | — |
| Marketing | `public/images` | `next/image` / raw | — |

### Background Library metadata (vision)

Platform-owned curated backgrounds (`/ops/background-library`) grow via Generate-10 or bulk upload into `pending_review`. After each successful ingest, vision (`generateText` + `imageUrl`, `action_type: background_library_metadata`) fills:

| Field | Purpose |
|-------|---------|
| `title` | Clean human title (not UUID / timestamp filenames) |
| `filename_label` | Display/export kebab-case name — **does not** rename `storage_path` |
| `description` | One-sentence scene description |
| `tags[]`, `colors[]`, `objects[]` | Search facets |
| `style`, `audience` | Style + intended audience phrases |
| `season`, `school_level` | Existing enums |
| Suggested `librarySlugs` | Applied to `background_asset_libraries` only when the asset has no collections yet |

Owner reviews/edits in the detail panel (**Auto-tag from image** re-runs analysis) before Approve. School pickers (Social **Browse Gallery**, Flyer **Browse Gallery**) search the same haystack with assortment ordering (round-robin across Generate `sourceId` batches and bulk lookalike buckets of style/color/library; within a bucket prefer lower `usage_count`) — see `src/lib/background-library/assortment.ts`.

**Migration:** `supabase/migrations/20260807120000_background_asset_metadata.sql` (apply before deploy that writes these columns).

---

## 7. Migration status (as of 2026-08-07)

### On shared pipeline

Background Library · Approvals · Volunteers · Events Ease (list, focus, upcoming) · Campaign thumbs · Today/Dashboard widgets · `ArtworkHoverThumbnail` · `ArtworkLightboxThumbnail` (tile) · `EventArtworkPreview`

### Still to migrate (use `AppImage` when touching)

Planning hub / Social Media Center · Campaign builder / Social composer previews · Homepage / Newsletter / Volunteer / Flyer in-app tiles · Brand kit / onboarding logo previews · Vendor logos (signed + transform) · Org sticker picker · Files / creative asset carousels · Event detail heroes outside Ease

Do **not** block product work on a big-bang migration — convert call sites when you edit that surface.

---

## 8. Checklist for new image features

1. **Upload** one original to the correct bucket with a stable path builder.
2. **Persist** `storage_path` (and original `public_url` only if needed) — never a render URL.
3. **Display** with `<AppImage … preset="…" sizes="…" />` (or `toDisplayImageUrl` if you must).
4. **Lazy-load** below the fold (`AppImage` defaults to lazy unless `priority`).
5. **Pass originals** into AI, Meta publish, download, and export helpers.
6. **Delete** Storage objects when the row is rejected/deleted (Background Library pattern).
7. **Skip** Cloudflare Images, imgproxy sidecars, and pre-generated derivatives unless Ops explicitly adopts them.
8. **Update** this doc + [feature-list.md](../product/feature-list.md) if you add a new bucket or change the pipeline.

---

## 9. Performance and cost notes

- Transforming list art cut multi‑MB PNG payloads to tens of KB WebP on Approvals/Volunteers (see [performance-budget.md](../qa/performance-budget.md)).
- Supabase Image Transformations: Pro quota includes a monthly origin count; overage is modest vs AI image generation. Billing is per **unique origin** transformed in the cycle, not per page view once cached.
- Prefer few preset widths so CDN HIT rates stay high.
- First request for a new derivative may be a CDN `MISS`; subsequent loads should be cheap.

---

## 10. Anti-patterns

- `unoptimized` on `next/image` for Supabase **public** list art (forces full original download).
- Storing `thumbnail_url` / transform URLs in Postgres.
- Writing three files per upload (`original`, `medium`, `thumb`).
- Using transform URLs as AI inspiration or Meta `image_url`.
- Global Next.js custom loader that breaks `blob:` / signed / non-Supabase hosts.
- Duplicating `isOptimizableImageUrl` + local `ArtTile` instead of `AppImage`.

---

## 11. File index

| Area | Path |
|------|------|
| Presets / display API | `src/lib/images/` |
| `AppImage` | `src/components/images/AppImage.tsx` |
| Background Library storage | `src/lib/background-library/storage.ts` |
| Background Library vision metadata | `src/lib/background-library/analyze-metadata.ts`, `metadata-parse.ts` |
| Event asset URLs | `src/lib/event-workspace/storage.ts` |
| AI upload | `src/lib/ai-artwork/storage.ts`, `src/lib/artwork-v2/` |
| Meta FB feed prepare | `src/lib/meta-publishing/facebook-feed-image.ts` |
| Storage RLS / buckets | [storage-rls.md](./storage-rls.md) |
| `next.config` remotePatterns | `next.config.ts` (`object/public`, `object/sign`, `render/image/public`) |

---

## 12. Related QA / product

- Soft-launch image transform win: [performance-budget.md](../qa/performance-budget.md) (Approvals / Volunteers Lighthouse).
- Artwork → approvals: [artwork-approval-findings.md](../qa/artwork-approval-findings.md).
- Create with AI inputs: [create-with-ai-artwork-inputs.md](../qa/create-with-ai-artwork-inputs.md).
