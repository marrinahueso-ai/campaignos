# Create with AI — artwork input matrix

**Status:** Living  
**Owner:** Engineering / QA (Hey Ralli)  
**Last updated:** 2026-07-21  
**Related:** [Testing guide](./testing-guide.md) · [Feature list](../product/feature-list.md) · [Campaign Builder debug](../../.cursor/rules/campaign-builder-debug.mdc) · Playwright Layer A `tests/hey-ralli/smoke/13-create-with-ai-artwork-inputs.spec.ts` · Layer C `tests/hey-ralli/smoke/13b-create-with-ai-artwork-generation-inputs.spec.ts` · Prompt contracts `src/lib/campaign-builder-v2/__tests__/artwork-prompts.test.ts`

Inventory of every Create with AI control that feeds **artwork** generation (feed + story). Use Layer A for wiring/persistence, unit prompt contracts for “UI saved but AI ignored,” and Layer C only for a small opt-in golden set that actually calls the model.

---

## Layers

| Layer | Purpose | Cost |
|-------|---------|------|
| **A. Wiring / persistence** | Controls save across steps; Your Selections / session reflect choices | Fast — smoke `13-…` |
| **B. Prompt contracts** | Inspiration fields appear in `buildCampaignBuilderArtworkPrompt` | Fast — unit tests |
| **C. Opt-in generation** | Real generate / Edit Artwork regenerate for a few golden paths | Slow — behind `HEY_RALLI_SKIP_ARTWORK_GENERATION` |

Do **not** generate full feed+story for every dropdown value in CI.

---

## Guidance fields (read this first)

| Field | UI today | Feeds artwork? | Notes |
|-------|----------|----------------|-------|
| **Overall inspiration comment** (`inspirationOverallComment`) | Creative Setup — “Overall inspiration comment (optional)” | **Yes** — primary campaign-level art direction | Prefer this over any legacy Notes field |
| **Per-image comment** (`inspirationImages[].comment`) | Under each inspiration image | **Yes** | “What AI should take from this” |
| **Notes to AI** (`globalAiGuidance`) | **No UI** | **No** (artwork prompt ignores it) | Legacy session field; do **not** QA as an artwork input |
| **Brand kit** (`brandKitId`) | Signal on Creative Setup (“Using your brand kit”) when org has logos/colors/mascot; no dropdown | **Yes** — defaults to `org-default` when brand exists; prompt gets primary/accent + mascot; logo URLs attached as visual refs | Edit via `/onboarding/brand`; Creative Setup logo/color toggles remain optional overlays |
| **Prior-milestone style reference** | None (automatic) | **Yes** on later milestones | First prior feed/story URL is prepended as a style reference — no control to toggle |

---

## Matrix — controls that feed artwork

### Campaign foundation

| # | Control | Field(s) | Feeds artwork? | Layer A / verify |
|---|---------|----------|----------------|------------------|
| 1 | Campaign name | `campaignId`, `campaignName` | Yes — event identity | Soft: select present |
| 2 | Event date | `eventDate` | Yes — date context | Soft |
| 3 | Playbook | `playbookId` | Indirect — milestones/purpose | Set playbook; continue to Milestones |

### Inspiration images (Creative Setup §1)

| # | Control | Field(s) | Feeds artwork? | Layer A / verify |
|---|---------|----------|----------------|------------------|
| 4–6 | Upload / choose / remove images | `inspirationImages[]` | Yes — reference images | Optional (upload permission) |
| 7 | Per-image comment | `inspirationImages[].comment` | Yes | Unit + manual |
| 8 | Overall inspiration comment | `inspirationOverallComment` | Yes | Fill → continue → return; value persists |

### Logo (Creative Setup §2)

| # | Control | Field(s) | Feeds artwork? | Layer A / verify |
|---|---------|----------|----------------|------------------|
| 9 | Logo None | `includeLogoInArtwork: false` | Yes — explicit no logo | Sidebar Logo = None |
| 10 | Organization logo | `selectedLogoId`, `includeLogoInArtwork` | Yes | Sidebar shows logo label (if org logos exist) |
| 11–12 | Uploaded logo | `uploadedLogoUrl`, `selectedLogoId` | Yes | Optional upload path |

### Colors (Creative Setup §3)

| # | Control | Field(s) | Feeds artwork? | Layer A / verify |
|---|---------|----------|----------------|------------------|
| 13 | Colors None | `colorMode: "none"` | Yes | Sidebar Colors = None |
| 14 | Organization palette | `colorMode: "organization_palette"` | Yes | If school colors saved |
| 15 | Inspiration palette | `colorMode: "inspiration_palette"` | Yes | Needs inspiration images |
| 16–18 | Custom palette / swatches | `custom_palette`, `customPaletteColors[]` | Yes | Sidebar Custom |

### Voice and tone (Creative Setup §4)

| # | Control | Field(s) | Feeds artwork? | Layer A / verify |
|---|---------|----------|----------------|------------------|
| 19 | Voice None | clear `voiceTone` / `voiceToneValues` | Yes | Sidebar Voice & Tone = None |
| 20 | Tone chips (multi) | `voiceToneValues[]`, joined `voiceTone` | Yes | Sidebar lists selected tones |
| 21 | Clear all selections | resets creative fields | Yes | Sidebar all None |

### Milestones

| # | Control | Field(s) | Feeds artwork? | Layer A / verify |
|---|---------|----------|----------------|------------------|
| 22 | Name / purpose / suggested date | milestone fields | Yes | Soft |
| 23 | Artwork notes | `artworkNotes` | Yes — also seeds Edit Artwork | Edit milestone → save → reopen |
| 24 | Platforms & formats | `platformFormats` | Yes — which formats generate | Toggle if practical |
| 25–26 | Logo / colors override | `creativeOverrides` | Yes — inherit \| none | Soft |

### Preview / generate / edit

| # | Control | Field(s) | Feeds artwork? | Layer |
|---|---------|----------|----------------|-------|
| 27 | Generate this / next / sparkles | generation action | Yes | **C** (opt-in) |
| 28 | Edit Artwork → instructions | `extraInstructions` | Yes (regenerate) | **C** |
| 29 | Edit Artwork → style strength | `styleStrength` | Yes — regenerate only | Unit + manual |
| 30–31 | Apply / Resend for approval | persist / approval | No model call | Skip for artwork matrix |

---

## Not artwork (skip this matrix)

Caption notes, delivery method, schedule/email fields, Auto-suggest best time, Apply/Resend-only, Review step, Ask Ralli.

---

## Manual verify tips

1. Open Create with AI → Creative Setup for a staging event.
2. Set Overall inspiration comment, a voice tone chip, and a color mode (or Clear all).
3. Confirm **Your Selections** sidebar updates.
4. **Save & Continue to Milestones**, then return to Creative Setup — values persist.
5. Edit a milestone: set Artwork notes + platforms; Save; reopen.
6. Optional: generate one milestone in Preview; confirm prompt direction is reflected visually (mood/colors/logo), not as pasted note text on the graphic.
7. Do **not** look for Notes to AI or a brand kit dropdown — neither is a current Creative Setup control for artwork.

Inspect session (DevTools):

```js
JSON.parse(localStorage.getItem('campaign-builder-v2:YOUR_EVENT_ID'))
```

Check `inspiration.inspirationOverallComment`, `inspirationImages[].comment`, `voiceTone`, `colorMode`, `includeLogoInArtwork`, and `milestones[].artworkNotes`.

---

## Playwright / unit pointers

### Layer A (wiring — no generation)

```bash
npm run test:hey-ralli -- tests/hey-ralli/smoke/13-create-with-ai-artwork-inputs.spec.ts
```

Requires `HEY_RALLI_TEST_EMAIL`, `HEY_RALLI_TEST_PASSWORD`, `HEY_RALLI_TEST_EVENT_ID` in `.env.local`. Does **not** call artwork generation.

### Layer C (opt-in generation)

By default CI should keep generation skipped:

```bash
HEY_RALLI_SKIP_ARTWORK_GENERATION=true
```

To run golden paths (logo+colors and/or inspiration comment + Edit Artwork regenerate):

```bash
# Unset or set false — burns AI credits; staging only
HEY_RALLI_SKIP_ARTWORK_GENERATION=false npm run test:hey-ralli -- tests/hey-ralli/smoke/13b-create-with-ai-artwork-generation-inputs.spec.ts
```

Also related: `09-artwork-generation-approval.spec.ts` (generate → Send for approval → Approvals hub).

### Unit prompt contracts

```bash
npm run test:campaign-builder-v2 -- --test-name-pattern "buildCampaignBuilderArtworkPrompt"
# or the whole suite:
npm run test:campaign-builder-v2
```

Asserts Overall inspiration comment + per-image comments appear in the built prompt; `globalAiGuidance` is not the primary path; voice/color/logo lines; style strength on regenerate.

Prior-milestone style reference is wired in `actions.ts` (`firstCampaignStyleReferenceUrl`) — not a pure exported helper; covered by this doc + Layer C behavior, not a unit assert.

---

## Prompt assembly reference

| Source | Prompt line / behavior |
|--------|------------------------|
| `inspirationOverallComment` | `Inspiration notes (interpret — do not paste on graphic): …` |
| Per-image `comment` | `Per-image inspiration notes…` / `Image N (label): …` |
| `voiceTone` | `Voice / tone: …` |
| `colorMode` | Org colors / inspiration palette / custom palette lines |
| `includeLogoInArtwork` + attached logo | Include attached logo line |
| `artworkNotes` + Edit `extraInstructions` | Artwork direction from the user |
| `globalAiGuidance` | **Not included** in artwork prompts |
| Prior milestone artwork URL | Prepended to inspiration image URLs on generate (automatic) |
