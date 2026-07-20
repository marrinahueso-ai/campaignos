# CampaignOS Sprints

## Sprint 1 — Project Foundation
**Status:** Complete

- Next.js 15 + Supabase scaffold
- Dashboard shell and navigation
- Product documentation (`/docs`)

## Sprint 2 — Live Events (Supabase CRUD)
**Status:** Complete ✅

- `events` table created in Supabase
- Environment configured with project URL and publishable key
- Create event form saves to Supabase
- Events page reads live data from Supabase
- Dashboard Upcoming Events reads live data from Supabase
- Mock/placeholder event arrays removed

## Sprint 3 — School Setup Foundation
**Status:** Complete ✅

- `organizations`, `brand_assets`, and `calendar_imports` tables
- Supabase Storage buckets for logos and calendar files
- School Setup onboarding wizard (`/school-setup`)
- Reusable organization queries, mutations, and server actions
- Sidebar navigation item for School Setup

## Sprint 4 — Calendar Intelligence UI
**Status:** Complete ✅

- Calendar Import Review page (`/calendar/review`)
- Placeholder statistics and sample imported events table
- Review actions: Import All, Review Individually, Upload Different Calendar
- Navigation from School Setup after calendar upload

## Sprint 5 — Event Workspace + Communications Hub
**Status:** Complete ✅

- Event Workspace route (`/events/[id]`)
- Hero, Overview, Communications Hub, Creative Assets, Timeline sections
- Database migration for workspace tables
- Event workspace queries, mutations, and server actions
- Links from Events grid and Dashboard upcoming events

## Engine 3 — Communication Playbooks (Communication Intelligence)
**Status:** Complete ✅

- Migration `004_create_communication_playbook_tables.sql`
- Eight seeded system playbooks with countdown steps
- Settings → Manage Playbooks (`/settings/playbooks`)
- Event Workspace: assigned playbook, communication timeline, Communication Health ring
- Dashboard aggregate Communication Health

### Live verification (June 2026)

Live DB verification passed using existing event **`79659782-ce78-4f74-bd1b-1906177f879e`** (Back to School Faair):

- Book Fair playbook assignment created **7** `event_communication_steps` rows
- Communication Health increased from **0%** to **14%** after marking one required step complete
- Event Workspace rendered live DB timeline data (not fallback mock data)
- Dashboard aggregate Communication Health updated to **14%**

Test data from this verification run was retained intentionally.

## Engine 4 — Communications Brain Foundation
**Status:** Complete ✅

- Generate Draft / Generate All Drafts on Event Workspace timeline
- Context-aware placeholder copy (event + playbook + step + channel)
- Drafts stored in `communication_versions` via step-linked `communication_items`
- Draft preview panel with Edit and Approve placeholder
- See `docs/ENGINE_4.md`

### Live verification (June 2026)

Live DB verification passed using existing event **`79659782-ce78-4f74-bd1b-1906177f879e`** (Back to School Faair):

- Migration **`006_create_communication_draft_tables.sql`** applied
- **7** `communication_items` rows created (one per timeline step)
- **8** `communication_versions` rows created (14 Days Out regenerated once via Generate All)
- Draft Preview Panels load saved drafts from the database (not placeholders)
- `npm run lint`, `npm run build`, and `npm run verify` passed
- Server action fix: removed invalid `initialState` export from `src/lib/event-workspace/actions.ts`

Test data from this verification run was retained intentionally.

## Engine 6 — Communications Planning Calendar
**Status:** Complete ✅

- Route **`/communications/calendar`** — professional communications planning calendar (distinct from school-events `/calendar`)
- **Month**, **Week**, and **Agenda** views (Month default)
- Live data aggregated from existing tables: `events`, `event_communication_steps`, `communication_items`, `communication_versions`, `event_assets`, `approval_requests`, `publication_schedule`
- Color-coded channels (newsletter, Facebook, Instagram, email, flyers, morning announcements, volunteer comms, etc.)
- Drag-and-drop reschedule updates underlying records (event date, step due date, publication schedule, approval requested date)
- Filters: event, channel, status, communication type; assigned user placeholder for future multi-user
- Right-side detail panel: event, timeline step, channel, draft/artwork/approval/publish status, draft preview
- Overdue items in red; today indicator; next-7-days deadline strip
- Sidebar nav: **Communications Calendar** under Events

### Live verification (June 2026)

Manual UI verification passed:

- `/communications/calendar` loads live planning data from existing tables (no schema changes)
- Month, Week, and Agenda views render correctly
- Drag-and-drop reschedule updates scheduled dates in the database
- Filters and detail panel work as expected
- `npm run lint` and `npm run verify` passed
- **Fix:** client/server boundary — moved client-safe helpers (`enrichItemFlags`, `filterPlanningItems`, `getUpcomingItems`) from `planning-queries.ts` to `planning-utils.ts` to avoid importing Supabase server client in client components

Key files: `src/lib/communications-calendar/planning-queries.ts`, `planning-utils.ts`, `planning-mutations.ts`, `planning-actions.ts`, `src/components/communications-planning-calendar/`

## Performance Sprint — Planning Data Optimization
**Status:** Complete ✅

- Request-scoped **planning raw data cache** added (`fetchPlanningRawData()` via React `cache()`)
- **Dashboard** planning/intelligence duplicate Supabase queries reduced (~8 fewer round-trips per request)
- Dashboard warm load improved from **~0.64s → ~0.56s**
- **Calendar** remains fast (same 7-table read, now shares cached raw fetch when co-rendered)
- **Event workspace** unchanged — still uses targeted per-event intelligence queries
- `getLatestOrganization()` memoized per request; dashboard passes org into `getTodayPageData()`
- `npm run lint` and `npm run verify` passed

Key files: `src/lib/communications-calendar/planning-raw.ts`, `build-planning-items.ts`, `src/lib/today/queries.ts`, `src/lib/campaign-intelligence/queries.ts`

## Engine 8.1 — Creative Studio Artwork Workflow + Generate Fix
**Status:** Complete ✅

- **Creative Studio redesigned** into a guided **Artwork** workflow (checklist → focused creation panel via `?item=`)
- Old tab-heavy Creative Studio (Overview, Brief, Planner, etc.) **hidden from primary UI**
- **Generate silent failure fixed** — save errors surfaced; progress phases during generation; friendly failure copy
- **Canonical asset binding by `plan_label`** — panel always resolves to the planner row for that item (e.g. `Flyer`)
- **Orphan `event_assets` rows** (`plan_label: null`) **no longer used** for planner item binding
- Storage upload failures surfaced; partial success shows a muted warning when only some concepts save

Key files: `src/components/creative-studio/ArtworkCreationPanel.tsx`, `CreativeStudioShell.tsx`, `src/lib/creative-studio/artwork-workflow.ts`, `src/lib/creative-director/build-asset-plan.ts`, `src/lib/ai-artwork/actions.ts`

### Live verification (June 2026)

Live verification passed using event **`dcf56e7f-d90e-4372-9750-b2c43e0b9c77`** (Flyer item):

- `/creative-studio?campaign=…&item=flyer` resolves to canonical asset **`89d77cce-3d93-4cf1-9d14-8682dae82e6c`** with `plan_label = "Flyer"`
- **Flyer generation verified end-to-end** — Generate artwork → OpenAI → storage → `event_artwork_concepts`
- **Concepts created on canonical Flyer asset** (not orphan rows)
- **Previews render after refresh**
- `npm run lint` and `npm run verify` passed

## Artwork Removal Sprint — Creative Studio Disabled
**Status:** Complete ✅

The Artwork / Creative Studio section was **intentionally removed from active navigation** so it can be rebuilt cleanly.

### What changed

- **Sidebar:** Artwork / Creative Studio nav item removed
- **`/creative-studio`:** Placeholder only — “Artwork is being rebuilt.” with **Return to Today**
- **Event Artwork step:** Read-only — existing uploads visible; no Generate, no upload, no Creative Studio links
- **Server-side block:** `generateArtworkConceptsAction` and `generateArtworkVariationAction` return an error while `ARTWORK_SECTION_DISABLED = true`

### What was preserved

- Database tables and migrations (unchanged)
- Storage buckets and files (unchanged)
- Existing artwork records, concepts, versions, and approval history (unchanged)
- Legacy artwork code files kept on disk (inactive, not deleted)

### Reason for removal

The old section accumulated too much hidden creative direction:

- Creative Director / art direction prompts
- Style memory and approved-artwork learning
- Prompt builders and template assembly
- Auto-inspiration and style presets
- Event/school/brand facts injected into image prompts

### Rebuild principle

**User is the Creative Director.** CampaignOS only manages workflow and storage.

The future Artwork rebuild will use:

1. User prompt box (“What should this artwork look like?”)
2. Optional inspiration image (attached only — no usage instructions in prompt)
3. Technical output size / aspect ratio for the asset type

No automatic creative direction. No style memory. No prompt builders. No auto inspiration.

See `product-v2/ARTWORK_REBUILD_NOTES.md` for full rebuild notes.

Key files: `src/lib/creative-studio/artwork-section-disabled.ts`, `src/components/creative-studio/ArtworkRebuildPlaceholder.tsx`, `src/app/(dashboard)/creative-studio/page.tsx`, `src/components/event-workspace/CampaignCreativeTab.tsx`, `src/lib/ai-artwork/actions.ts`

### Verification (June 2026)

- `/dashboard`, `/calendar`, `/events`, `/events/[id]` load
- `/creative-studio` shows placeholder (HTTP 200)
- No sidebar Artwork item; no active Generate Artwork button in UI
- `npm run lint` and `npm run verify` passed

## Artwork v2 — Rebuild Complete (Phases 1–5)
**Status:** Complete ✅

Artwork was rebuilt from scratch on the **Event Workspace → Artwork** tab (`#artwork`). The old Creative Director generation path remains inactive (`ARTWORK_SECTION_DISABLED = true` on legacy `generateArtworkConceptsAction`).

### Phase 1 — Workflow architecture
- Screen flow: Pick campaign item → Describe (+ optional reference) → Review → Approved
- Entry: `CampaignCreativeTab` → `ArtworkV2Shell` (not Creative Studio)

### Phase 2 — Review & approval UX
- Apple Photos–style comparison grid (2-up desktop, stacked mobile)
- `object-contain` everywhere — no cropping
- Approve / Like this, but adjust / Deny per card
- Empty and exhausted states

### Phase 3 — Simple generation
- `generateArtworkV2Action` — bypasses old prompt builders and Creative Director
- Sends only: manual prompt (exact), one optional inspiration image, technical output size
- Exactly **2** versions per generation

### Phase 4 — Approve / Deny / Adjust
- **Approve:** `approveArtworkV2Action` → `activateConceptAsAsset`; other pending concepts discarded; hero promoted only when no hero exists
- **Deny:** hard delete with soft-delete fallback; grid removes version; “No versions left. Try generating again.”
- **Adjust:** appends 2 new versions; prompt = original manual prompt + user comments only (no creative direction)

### Phase 5 — Live UX verification + docs (June 2026)
- `npm run dev:clean`, `npm run lint`, `npm run verify` passed
- Event **`dcf56e7f-d90e-4372-9750-b2c43e0b9c77`** (Fun Run, full campaign) — `/events/[id]#artwork` HTTP 200
- Prompt audit script: `npx tsx scripts/verify-artwork-v2-generation.ts` — 9/9 checks passed
- Full interactive generation flow (OpenAI + browser) requires manual pass with `OPENAI_API_KEY` configured

Key files: `src/components/artwork-v2/*`, `src/lib/artwork-v2/actions.ts`, `src/lib/artwork-v2/generation.ts`, `src/lib/artwork-v2/prompt.ts`, `src/lib/artwork-v2/hero.ts`, `src/components/artwork/GeneratedArtworkFrame.tsx`, `src/components/event-workspace/CampaignCreativeTab.tsx`

Legacy (inactive): `src/lib/creative-studio/`, old `generateArtworkConceptsAction`, `/creative-studio` placeholder

See `product-v2/ARTWORK_REBUILD_NOTES.md`.

## Sprint 6 — AI Generation & Integrations
**Status:** Planned

- OpenAI campaign generation
- Image generation
- Social scheduling and publishing integrations
