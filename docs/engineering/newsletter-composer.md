# Newsletter Composer (Engineering)

**Status:** Living  
**Owner:** Engineering (Hey Ralli)  
**Last updated:** July 26, 2026  
**Related:** [QA guide](../qa/newsletter-composer.md) · [Feature list](../product/feature-list.md) · [Homepage Composer eng](./homepage-composer.md) · [Storage RLS](./storage-rls.md) · [Architecture](./architecture.md)

Client-heavy scoop-style email builder. Server actions host artwork; drafts stay in the browser. No in-app SMTP send.

---

## Surface & entry

| Item | Detail |
|------|--------|
| Route | `/newsletter-composer` — `src/app/(dashboard)/newsletter-composer/page.tsx` |
| Chooser | `/create-with-ai` → Newsletter (`CreateWithAiLanding` → `/newsletter-composer`) |
| UI | `src/components/newsletter-composer/NewsletterComposer.tsx` |
| Preview chrome | `EmailPreviewPhone.tsx` (`EmailPreviewPhone` + `EmailPreviewDesktop`) |
| Shared UI | `SettingsBox` from homepage-composer |
| Events feed | Same as Homepage: `getCampaignPageEvents` + `getEventVolunteerSignupUrls` |

Steps: `header` → `message` → `stories` → `mustdos` → `footer` → `layout` → `preview` → `send` (`NewsletterComposerStep`).

---

## Key files

| Path | Role |
|------|------|
| `src/components/newsletter-composer/NewsletterComposer.tsx` | Multi-step UI, draft hydrate/save, uploads, copy HTML |
| `src/components/newsletter-composer/EmailPreviewPhone.tsx` | Phone / desktop preview shells |
| `src/lib/newsletter-composer/types.ts` | State, stories, layout blocks, sponsors, socials |
| `src/lib/newsletter-composer/defaults.ts` | Initial state, layout sync with stories, chip/story helpers |
| `src/lib/newsletter-composer/draft-storage.ts` | localStorage + IndexedDB (raw state JSON v1) |
| `src/lib/newsletter-composer/artwork-actions.ts` | Upload header / story / sponsor / volunteer art |
| `src/lib/newsletter-composer/export-html.ts` | Email-safe HTML + preview fragment |
| `src/lib/homepage-composer/compress-image.ts` | Shared client compress before upload |
| `src/lib/homepage-composer/volunteer-links.ts` | Signup URLs for event-sourced volunteer asks |

---

## Draft storage

**DB:** IndexedDB `heyralli-newsletter-composer` / store `drafts`  
**LS key:** `newsletter-composer:v1:{organizationId|local}`

Unlike Homepage (v4 envelope with `at`), Newsletter stores **raw** `NewsletterComposerState` JSON.

**Write** (`saveComposerDraft`): best-effort `localStorage.setItem`, then IDB put. Quota / IDB failures are swallowed (status may still show saved if LS succeeded).

**Read** (`loadComposerDraftRaw`): prefer IDB; fall back to LS.

**Autosave:** ~450ms debounce after hydrate. No dedicated `pagehide` / visibility flush (Homepage has a stronger flush path) — keep that in mind when hardening.

Drafts are **not** stored in Postgres.

---

## Server actions

### Artwork — `uploadNewsletterComposerArtworkAction`

- Input: `{ assetId, dataUrl }` (JPG/PNG/WebP; max ~2.5MB after compress).
- Path: `{orgId}/newsletter-composer/{safeAsset}-{timestamp}.{ext}` in **`event-assets`**.
- Upload via `uploadArtworkBytes` (**service role** when admin client configured) — same org-first path exception pattern as Homepage. See [storage-rls.md](./storage-rls.md).
- Used for header image, story images, sponsor logos, volunteer photos.

No blurb / text-generation server action on this surface today.

---

## Credits

| Action type | When |
|-------------|------|
| _(none)_ | Newsletter Composer does not call `generateText` / artwork orchestration |

Uploads are storage-only. AI credits for Social Campaign Builder remain separate.

---

## Export HTML

| Export | Use |
|--------|-----|
| `exportNewsletterHtml(state)` | Full HTML document for clipboard / email tools |
| `exportNewsletterPreviewFragment(state)` | Inner body for in-app phone/desktop preview |

Implementation notes:

- Table-based, ~560px content column, cream page background.
- `orderedLayoutBlocks(state)` drives section order.
- Story rendering: featured stories first (badge); then a “News & events” / “More news & events” band for non-featured included stories.
- Section bands: calendar, volunteer, sponsors, links, socials / CTA with distinct colors.
- Links normalized to `https://` when scheme missing.
- Images expected as hosted URLs from the upload action.

**Send step** = `navigator.clipboard.writeText(exportNewsletterHtml(state))` — no delivery API.

---

## State highlights

| Area | Types / notes |
|------|----------------|
| Stories | `source`: `event` \| `homepage` \| `manual`; `included`, `featured` |
| Layout | `NewsletterLayoutBlock` kinds: header, message, story, calendar, volunteer, sponsors, links, cta, socials |
| Must-dos | `calendarChips`, `volunteerAsks`, `sponsors` (logo `imageUrl` required for display) |
| Brand | `NewsletterBrandColors` — primary, accent, messageBar, cta |
| Socials | instagram / facebook / website / x with `enabled` |

`syncLayoutWithStories` keeps story blocks aligned when stories are added/removed/reordered.
