# Homepage Composer (Engineering)

**Status:** Living  
**Owner:** Engineering (Hey Ralli)  
**Last updated:** August 17, 2026 — Homepage date picker: click a day to set it (Clear optional)
**Related:** [QA guide](../qa/homepage-composer.md) · [Feature list](../product/feature-list.md) · [Image architecture](./image-architecture.md) · [Storage RLS](./storage-rls.md) · [Architecture](./architecture.md) · [Billing / AI credits](../ops/billing-and-access.md)

Client-heavy Membership Toolkit homepage builder. Server actions cover AI blurbs and artwork hosting; drafts stay in the browser.

---

## Surface & entry

| Item | Detail |
|------|--------|
| Route | `/homepage-composer` — `src/app/(dashboard)/homepage-composer/page.tsx` |
| Chooser | `/create-with-ai` → Home Page (`CreateWithAiLanding` → `/homepage-composer`) |
| UI | `src/components/homepage-composer/HomepageComposer.tsx` (+ `SettingsBox`, `EmojiPicker`, `DatePopoverField`) |
| Events feed | `getCampaignPageEvents` + `getEventVolunteerSignupUrls` → `HomepageComposerEvent[]` |

Steps: `header` → `footer` → `cards` → `preview` → `export` (`HomepageComposerStep` in `types.ts`).

Header and footer CTAs both use `buttonCount` (`1 | 2`) with Volunteer-style **How many buttons?** toggle; button 2 fields stay in the draft when count is 1 but are hidden in the editor / preview / export.

---

## Key files

| Path | Role |
|------|------|
| `src/components/homepage-composer/HomepageComposer.tsx` | Step UI, autosave flush, card CRUD, preview scrubber, export UX |
| `src/components/homepage-composer/DatePopoverField.tsx` | Portal date picker (cards + announcements; click a day to set; Clear only when a date is already set) |
| `src/components/homepage-composer/SettingsBox.tsx` | Shared settings panel chrome (also used by Newsletter) |
| `src/lib/homepage-composer/types.ts` | State + card/header/footer shapes (`cardsSectionTitle`, `workingMonth`, `monthDrafts`, `monthSaved`) |
| `src/lib/homepage-composer/defaults.ts` | Initial state, `cardFromEvent`, normalize / migrate fields (legacy → current-month save) |
| `src/lib/homepage-composer/month-drafts.ts` | Per-month card stash/switch/save/copy helpers |
| `src/lib/homepage-composer/draft-storage.ts` | localStorage + IndexedDB envelope v4 (via shared store); stashes active month on save |
| `src/lib/composer-draft-storage.ts` | Shared newest-wins draft store (Homepage + Newsletter) |
| `src/lib/homepage-composer/blurb-actions.ts` | Server action → generate blurb |
| `src/lib/homepage-composer/generate-blurb.ts` / `generate-blurb-prompt.ts` | Model call, ≤2 sentences, brand voice |
| `src/lib/homepage-composer/artwork-actions.ts` | Upload compressed data-URL → public URL |
| `src/lib/homepage-composer/compress-image.ts` | Client compress before upload |
| `src/lib/homepage-composer/export-html.ts` | Full-page MTK HTML + show/hide script; preview may pass `includeDataImages` |
| `src/lib/homepage-composer/share-actions.ts` | Create tokenized share snapshot (uploads pending data: artwork first) |
| `src/lib/homepage-composer/share-queries.ts` | Insert/fetch share rows (service role for public token lookup) |
| `src/lib/homepage-composer/share-document.ts` | Full HTML document wrapper + print toolbar for share page |
| `src/app/share/homepage/[token]/page.tsx` | Public share route (`noindex`) |
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

**Read path** (`loadComposerDraftRaw`): compare IDB vs LS by `at`; prefer newer; tie → IDB. If LS wins but quota-slimmed `imageUrl`s to null, merge artwork back from IDB for matching card ids.

**Write races:** IndexedDB puts are skipped when a newer envelope already exists (same-transaction get-then-put), so an older in-flight save cannot clobber a newer draft.

**Flush:** Composer debounces ~350ms; also flushes on `visibilitychange` (hidden), `pagehide`, `beforeunload`, and effect cleanup so navigate-away cannot drop the pending timer.

Drafts are **not** stored in Postgres.

### Save by month

Cards, `selectedEventIds`, announcement bar lines, **and full chrome** (hero/footer copy + colors, 1/2 header CTAs, up to 2 footer CTAs, `cardsSectionTitle`, resources) are scoped to `workingMonth` (YYYY-MM). The composer shows a persistent **Working on** strip on every step; live state mirrors the active month. **Save this month** writes a full snapshot into `monthSaved` (Copy from… source). Autosave stashes the same shape into `monthDrafts`.

| Field | Role |
|-------|------|
| `workingMonth` | Active month workspace (all steps) |
| `cards` / `selectedEventIds` | Live card editors for `workingMonth` |
| `header` / `footer` / `cardsSectionTitle` / `resources` | Live chrome for `workingMonth` |
| `header.announcements` | Live announcement editors for `workingMonth` |
| `monthDrafts` | Working snapshots per month (full homepage; autosave stashes here) |
| `monthSaved` | Explicit **Save this month** snapshots — sources for **Copy from…** |

Legacy drafts without month maps migrate into `monthDrafts` + `monthSaved` for the current calendar month. Drafts that predate month-scoped announcements seed the working month from `header.announcements`. Snapshots that omit chrome keep the live header/footer when switching months until the next Save.

**Export refresh:** Export step remounts a live iframe + code `<pre>` via a content hash key and imperative `srcdoc` write (same Blink-safe pattern as Preview), so month switches and edits refresh without a manual browser reload.

---

## Server actions

### Blurb — `generateHomepageComposerBlurbAction`

- Auth: current organization required.
- Impl: `generateHomepageCardBlurb` → `generateText` with fast draft model.
- Prompt: ≤2 sentences, PTO voice; uses org brand-voice profile when present. Infers card angle (info / spirit / volunteer / meeting / fundraiser / general), bans “Join us” / “Don’t miss” openers, and receives sibling card openings so a homepage of cards does not all start the same way. Weak leftover “Join us for {title}” seeds are ignored. A last-resort strip removes those openers if the model still uses them. Temperature 0.85; regenerate passes a variety nonce.
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

`exportHomepageHtml(state, { asOfDate?, showAllCards?, includeDataImages?, includeVisibilityMemos? })`:

- Inline `<style>` + `.ees-*` Membership Toolkit–style markup (hero, announcements, card grid, footer CTA, resources).
- Card images: Export / Copy use **HTTPS only** (`data:` omitted → placeholder). In-app Preview passes `includeDataImages: true` so unhosted artwork still renders.
- Preview iframe: remount + imperative `srcdoc` write so Blink/Chrome refreshes when the slider or draft changes (Safari already updated `srcDoc` props).
- Visibility attrs: `data-starts` / `data-expires` when not `alwaysOn`.
- Embedded script toggles `display` from “today” (or preview `asOfDate`); `showAllCards` skips hide logic for full-month audit.
- Full-month Preview: **Open page** / **Save as PDF** persist a snapshot to `homepage_composer_shares` and open `/share/homepage/[token]` (PDF via browser print on that page). Share pages render per-card visibility memos (`includeVisibilityMemos`, e.g. `on: 8/10/26 · off: 8/15/26` / `Always on`). Memos are share-only — not in live preview or MTK Copy/Export.

---

## Share snapshots (Postgres)

Table: `homepage_composer_shares` (migration `20260727171727_homepage_composer_shares.sql`).

| Column | Purpose |
|--------|---------|
| `token` | Unguessable public id (24-byte base64url) |
| `composer_state` | Normalized `HomepageComposerState` JSON |
| `preview_mode` | `full_month` \| `as_of_date` |
| `include_visibility_memos` | Audit memos on share page |
| `share_status` | `draft` \| `shared` \| `pending_approval` \| `approved` — defaults `shared`; approvals UI later |
| `approval_item_id` | Nullable FK stub for future Approvals hub link |

RLS: org members CRUD their org’s rows. Public read uses **service role** in `getHomepageComposerShareByToken` (token is the secret). Middleware public path: `/share/homepage`.

Before insert, `prepareHomepageStateForShare` uploads any `data:` card images via `uploadHomepageComposerArtworkAction`.

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
