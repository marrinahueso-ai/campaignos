# Homepage Composer (Engineering)

**Status:** Living  
**Owner:** Engineering (Hey Ralli)  
**Last updated:** July 26, 2026  
**Related:** [QA guide](../qa/homepage-composer.md) · [Feature list](../product/feature-list.md) · [Storage RLS](./storage-rls.md) · [Architecture](./architecture.md) · [Billing / AI credits](../ops/billing-and-access.md)

Client-heavy Membership Toolkit homepage builder. Server actions cover AI blurbs and artwork hosting; drafts stay in the browser.

---

## Surface & entry

| Item | Detail |
|------|--------|
| Route | `/homepage-composer` — `src/app/(dashboard)/homepage-composer/page.tsx` |
| Chooser | `/create-with-ai` → Home Page (`CreateWithAiLanding` → `/homepage-composer`) |
| UI | `src/components/homepage-composer/HomepageComposer.tsx` (+ `SettingsBox`, `EmojiPicker`) |
| Events feed | `getCampaignPageEvents` + `getEventVolunteerSignupUrls` → `HomepageComposerEvent[]` |

Steps: `header` → `footer` → `cards` → `preview` → `export` (`HomepageComposerStep` in `types.ts`).

---

## Key files

| Path | Role |
|------|------|
| `src/components/homepage-composer/HomepageComposer.tsx` | Step UI, autosave flush, card CRUD, preview scrubber, export UX |
| `src/components/homepage-composer/SettingsBox.tsx` | Shared settings panel chrome (also used by Newsletter) |
| `src/lib/homepage-composer/types.ts` | State + card/header/footer shapes |
| `src/lib/homepage-composer/defaults.ts` | Initial state, `cardFromEvent`, normalize / migrate fields |
| `src/lib/homepage-composer/draft-storage.ts` | localStorage + IndexedDB envelope v4 |
| `src/lib/homepage-composer/blurb-actions.ts` | Server action → generate blurb |
| `src/lib/homepage-composer/generate-blurb.ts` / `generate-blurb-prompt.ts` | Model call, ≤2 sentences, brand voice |
| `src/lib/homepage-composer/artwork-actions.ts` | Upload compressed data-URL → public URL |
| `src/lib/homepage-composer/compress-image.ts` | Client compress before upload |
| `src/lib/homepage-composer/export-html.ts` | Full-page MTK HTML + show/hide script |
| `src/lib/homepage-composer/blurbs.ts` / `urls.ts` / `colors.ts` / `emoji.ts` | Formatting helpers |
| `src/lib/homepage-composer/volunteer-links.ts` | Signup URLs for event cards |
| `__tests__/` | Draft storage, card fields, blurb prompt contracts |

---

## Draft storage

**DB:** IndexedDB `heyralli-homepage-composer` / store `drafts`  
**LS key:** `homepage-composer:v4:{organizationId|local}` (reads v1–v3 legacy)

Envelope:

```ts
{ v: 4, at: number, state: HomepageComposerState }
```

**Write path** (`saveComposerDraft`):

1. Sync write to localStorage first (survives cancelled async on navigate).
2. Mirror full JSON to IndexedDB (large payloads / artwork URLs).
3. On LS quota: slim by clearing `data:` card `imageUrl`s in the LS copy only.

**Read path** (`loadComposerDraftRaw`): compare IDB vs LS by `at`; prefer newer; tie → IDB.

**Flush:** Composer debounces ~350ms; also flushes on `visibilitychange` (hidden), `pagehide`, `beforeunload`, and effect cleanup so navigate-away cannot drop the pending timer.

Drafts are **not** stored in Postgres.

---

## Server actions

### Blurb — `generateHomepageComposerBlurbAction`

- Auth: current organization required.
- Impl: `generateHomepageCardBlurb` → `generateText` with fast draft model.
- Prompt: ≤2 sentences, PTO voice; uses org brand-voice profile when present.
- Usage / credits: `actionType: "homepage_composer_blurb"`, `feature: "homepage_composer_blurb"`.
- Ledger label: **Homepage Blurb** (`usage-breakdown-pure.ts`).

### Artwork — `uploadHomepageComposerArtworkAction`

- Input: `{ cardId, dataUrl }` (JPG/PNG/WebP; max ~2.5MB after compress).
- Path: `{orgId}/homepage-composer/{safeCard}-{timestamp}.{ext}` in **`event-assets`**.
- Upload via `uploadArtworkBytes` (**service role** when admin client configured) — org-first folder does **not** match event-scoped Storage RLS. Details: [storage-rls.md](./storage-rls.md) path exceptions.
- Returns public HTTPS URL for card `imageUrl` and export.

Client compresses (`compressImageForUpload`) before calling the action. Source files over 25MB are rejected in UI before compress.

---

## Credits

| Action type | When | Notes |
|-------------|------|--------|
| `homepage_composer_blurb` | Generate text on a card | Text-only burn via `generateText` usage; no artwork orchestration |

Artwork upload does **not** burn AI credits (storage only). Create with AI deep links spend credits inside Campaign Builder, not Homepage Composer.

---

## Export HTML

`exportHomepageHtml(state, { asOfDate?, showAllCards? })`:

- Inline `<style>` + `.ees-*` Membership Toolkit–style markup (hero, announcements, card grid, footer CTA, resources).
- Card images: **HTTPS only** — `data:` URLs omitted (placeholder square).
- Visibility attrs: `data-starts` / `data-expires` when not `alwaysOn`.
- Embedded script toggles `display` from “today” (or preview `asOfDate`); `showAllCards` skips hide logic for full-month audit.

---

## State highlights (`HomepageCard`)

| Field | Meaning |
|-------|---------|
| `linkLabel` | CTA text; export defaults to `Learn More →` if empty |
| `date` | Face date on the card (not visibility) |
| `startsOn` / `expiresOn` / `alwaysOn` | Visibility window for preview + export script |
| `source` | `event` \| `custom` |
| `imageUrl` | Prefer hosted URL after upload |

---

## Related deep links

Event cards can open Create with AI Social via `campaignBuilderHref(eventId)` (fallback `/create-with-ai`) so managers generate milestone artwork elsewhere, then return — approved square art already feeds the events list when present.
