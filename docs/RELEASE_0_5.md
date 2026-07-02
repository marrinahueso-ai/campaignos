# Release 0.5 — Stabilization Checkpoint

**Date:** June 2026  
**Status:** Stable  
**Scope:** Documentation checkpoint after Engine 6 manual verification, Performance Sprint — Planning Data Optimization, Engine 8.1 Creative Studio Artwork workflow, Artwork Removal Sprint, and **Artwork v2 rebuild (Phases 1–5)**

Release 0.5 captures the verified state of CampaignOS after Engine 4 live verification, Engine 6 Communications Planning Calendar, the planning-data performance sprint, the Creative Studio Artwork workflow redesign, the intentional removal of the legacy Artwork / Creative Studio experience, and the **Artwork v2 rebuild** on the Event Workspace Artwork tab. The app supports school onboarding, calendar review UI, live events, communication playbooks, timeline management, placeholder draft generation, a professional communications planning calendar, and **human-directed AI artwork generation** (prompt + optional inspiration only).

---

## Completed engines

| Engine / Sprint | Status | Summary |
|-----------------|--------|---------|
| Sprint 1 — Project Foundation | ✅ | Next.js 15, Supabase, dashboard shell |
| Sprint 2 — Live Events | ✅ | Events CRUD, live Dashboard and Events list |
| Sprint 3 — School Setup | ✅ | Organization profile, brand assets, calendar upload |
| Sprint 4 — Calendar Intelligence UI | ✅ | Calendar Import Review page (sample data) |
| Sprint 5 — Event Workspace | ✅ | `/events/[id]` workspace, Communications Hub, assets, activity timeline |
| Engine 3 — Communication Playbooks | ✅ | System playbooks, assignment, timeline steps, Communication Health |
| Engine 4 — Communications Brain | ✅ | Generate Draft / Generate All, Draft Preview Panel, DB persistence |
| Engine 6 — Communications Planning Calendar | ✅ | `/communications/calendar`, Month/Week/Agenda, drag-and-drop, filters, detail panel |
| Performance Sprint — Planning Data | ✅ | Request-scoped planning raw cache; dashboard duplicate queries reduced; warm load ~0.56s |
| Engine 8.1 — Creative Studio Artwork | ✅ → ⏸️ Legacy | Guided workflow shipped; superseded by Artwork v2 on Event Workspace |
| Artwork Removal Sprint | ✅ | Legacy Creative Studio removed from nav; old generation blocked |
| Artwork v2 (Phases 1–5) | ✅ | Human-directed artwork on Event `#artwork` tab — generate, review, approve/deny/adjust |

See `docs/SPRINTS.md`, `docs/ENGINE_4.md`, and `docs/SPRINT_5.md` for sprint-level detail.

---

## Database migrations

| # | File | Applied (project) | Purpose |
|---|------|-------------------|---------|
| 001 | `001_create_events_table.sql` | ✅ | `events` table, RLS |
| 002 | `002_create_school_setup_tables.sql` | ✅ | `organizations`, `brand_assets`, `calendar_imports`, storage buckets |
| 003 | `003_create_event_workspace_tables.sql` | ⚠️ Partial | Workspace tables: `event_assets`, `communication_items`, `communication_versions`, `approval_requests`, `publication_schedule`, `activity_log`; extends `events` |
| 004 | `004_create_communication_playbook_tables.sql` | ✅ | Playbooks, playbook steps, assignments, `event_communication_steps`; extends `events.event_type` |
| 005 | `005_link_communication_items_to_playbook_steps.sql` | ⏭️ Skipped | Engine 4 column/index changes when 003 already applied |
| 006 | `006_create_communication_draft_tables.sql` | ✅ | Repair migration: creates comm draft tables + Engine 4 indexes when 003 was skipped |

**Deploy note:** Do not run **005** after **006** — 006 already includes 005's column and index changes.

**Live verification event:** `79659782-ce78-4f74-bd1b-1906177f879e` (Back to School Faair)

- 7 `communication_items`, 8 `communication_versions`
- `npm run lint`, `npm run build`, and `npm run verify` passed

### Engine 6 verification (June 2026)

Manual UI verification passed for **`/communications/calendar`**:

- Month, Week, and Agenda views with live data from existing tables (no new migrations)
- Drag-and-drop reschedule updates underlying communication records
- Filters and right-side detail panel confirmed
- `npm run lint` and `npm run verify` passed
- **Fix:** split client helpers into `planning-utils.ts` to resolve Supabase server import in client components (`PlanningCalendarShell`)

### Performance Sprint — Planning Data Optimization (June 2026)

- **Planning raw data cache** added — `fetchPlanningRawData()` with React `cache()` for request-scoped deduplication
- **Dashboard** planning/intelligence duplicate Supabase queries reduced (~8 fewer round-trips per request)
- Dashboard warm load improved from **~0.64s → ~0.56s**
- **Calendar** remains fast (same data path; benefits from shared cache when applicable)
- **Event workspace** unchanged — targeted per-event queries preserved
- `npm run lint` and `npm run verify` passed

Key files: `src/lib/communications-calendar/planning-raw.ts`, `build-planning-items.ts`, `src/lib/today/queries.ts`, `src/lib/campaign-intelligence/queries.ts`

### Engine 8.1 — Creative Studio Artwork Workflow + Generate Fix (June 2026)

- **Creative Studio redesigned** into a guided **Artwork** workflow (`/creative-studio?campaign={eventId}` checklist → `?item=flyer` creation panel)
- Old tab-heavy Creative Studio **hidden from primary UI** (Overview, Brief, Planner tabs removed from main shell)
- **Generate silent failure fixed** — prompt save errors block generation; progress states; clear error when OpenAI or storage fails
- **Canonical asset binding by `plan_label`** — `ArtworkCreationPanel` ensures the correct planner row before save/generate/previews
- **Orphan `event_assets` rows** (`plan_label: null`) **no longer used** for planner item binding (`build-asset-plan.ts`, `resolveWorkflowAsset`)
- Storage upload failures surfaced; partial concept save shows muted warning

Live verification on event **`dcf56e7f-d90e-4372-9750-b2c43e0b9c77`** (Flyer):

- Canonical asset **`89d77cce-3d93-4cf1-9d14-8682dae82e6c`** (`plan_label = "Flyer"`)
- **Flyer generation verified end-to-end** — concepts saved to `event_artwork_concepts` on canonical asset
- **Previews render after refresh**
- `npm run lint` and `npm run verify` passed

Key files: `src/components/creative-studio/ArtworkCreationPanel.tsx`, `CreativeStudioShell.tsx`, `src/lib/creative-studio/artwork-workflow.ts`, `src/lib/creative-director/build-asset-plan.ts`, `src/lib/ai-artwork/actions.ts`

### Artwork Removal Sprint — Creative Studio Disabled (June 2026)

The Artwork / Creative Studio section was **intentionally removed from active navigation** pending a clean rebuild.

| Area | Current behavior |
|------|------------------|
| Sidebar | No Artwork / Creative Studio link |
| `/creative-studio` | Placeholder: “Artwork is being rebuilt.” + Return to Today |
| Event Artwork step | Read-only — existing uploads visible; no Generate or upload CTAs |
| AI generation | Blocked server-side via `ARTWORK_SECTION_DISABLED` in `generateArtworkConceptsAction` / `generateArtworkVariationAction` |
| Data | All tables, storage, concepts, versions, and history **preserved** — nothing deleted |

**Why it was removed:** The old section had too much hidden creative direction (prompt builders, style memory, auto-inspiration, event/school/brand injection, Creative Director logic).

**Rebuild principle:** User is the Creative Director. CampaignOS only manages workflow and storage. Future Artwork = prompt box + optional inspiration image + technical output size only.

See `product-v2/ARTWORK_REBUILD_NOTES.md` and `docs/SPRINTS.md` (Artwork Removal Sprint).

Key files: `src/lib/creative-studio/artwork-section-disabled.ts`, `src/components/creative-studio/ArtworkRebuildPlaceholder.tsx`, `src/app/(dashboard)/creative-studio/page.tsx`, `src/components/event-workspace/CampaignCreativeTab.tsx`

### Artwork v2 — Rebuild Complete (June 2026)

Artwork v2 replaces the read-only Event Artwork step with a full human-directed workflow.

| Capability | Behavior |
|------------|----------|
| Entry | Event Workspace → **Artwork** tab (`#artwork`) |
| Prompt | Manual text only — sent exactly as typed (`generateArtworkV2Action`) |
| Inspiration | One optional image (upload or event file); no usage instructions in prompt |
| Output size | Technical `size` API param from asset type — never appended to prompt |
| Generation | Exactly **2** versions per generate or adjust |
| Review | Side-by-side grid; `object-contain`; neutral background; no cropping |
| Approve | Sets campaign item artwork; promotes to event hero **only if no hero exists** |
| Deny | Removes version (hard delete or discarded); does not touch parent asset |
| Adjust | Appends 2 new versions; prompt = original + user comments only |
| Legacy path | `/creative-studio` placeholder; `generateArtworkConceptsAction` still blocked |

Live verification (June 2026):

- Event **`dcf56e7f-d90e-4372-9750-b2c43e0b9c77`** (Fun Run, full campaign) — artwork route HTTP 200
- `npm run dev:clean`, `npm run lint`, `npm run verify` passed
- `npx tsx scripts/verify-artwork-v2-generation.ts` — 9/9 prompt audit checks passed

Key files: `src/components/artwork-v2/*`, `src/lib/artwork-v2/actions.ts`, `src/lib/artwork-v2/generation.ts`, `src/lib/artwork-v2/prompt.ts`, `src/lib/artwork-v2/hero.ts`, `src/components/artwork/GeneratedArtworkFrame.tsx`

See `product-v2/ARTWORK_REBUILD_NOTES.md` and `docs/SPRINTS.md` (Artwork v2).

---

## Current routes

| Route | Type | Description |
|-------|------|-------------|
| `/` | Static | Redirects to `/dashboard` |
| `/dashboard` | Dynamic | Upcoming events, aggregate Communication Health |
| `/events` | Dynamic | Events grid (live Supabase) |
| `/events/create` | Static | Create event form |
| `/events/[id]` | Dynamic | Event Workspace (playbooks, timeline, drafts, hub, assets) |
| `/school-setup` | Static | School Setup wizard |
| `/calendar/review` | Static | Calendar Import Review (sample data) |
| `/calendar` | Dynamic | Communications calendar (Engine 5.8 workload view) |
| `/communications/calendar` | Dynamic | Communications Planning Calendar — Month/Week/Agenda, drag-and-drop, filters, detail panel |
| `/settings` | Static | Settings placeholder |
| `/settings/playbooks` | Dynamic | Manage playbooks list |
| `/settings/playbooks/new` | Static | Create playbook |
| `/settings/playbooks/[id]` | Dynamic | Edit playbook |
| `/creative-studio` | Static | **Placeholder** — legacy route; active artwork is Event `#artwork` tab |
| `/events/[id]#artwork` | Dynamic | **Artwork v2** — pick item, generate, review, approve/deny/adjust |

---

## Current Supabase tables

Tables created by applied migrations (001, 002, 004, 006; partial 003):

| Table | Migration | Role |
|-------|-----------|------|
| `events` | 001, 003, 004 | Core event entity |
| `organizations` | 002 | PTO / school profile |
| `brand_assets` | 002 | Logos, colors, fonts |
| `calendar_imports` | 002 | Uploaded calendar file metadata |
| `communication_playbooks` | 004 | System and custom playbooks |
| `communication_playbook_steps` | 004 | Template countdown steps |
| `organization_playbook_defaults` | 004 | Default playbook per event type |
| `event_playbook_assignments` | 004 | One playbook per event |
| `event_communication_steps` | 004 | Live timeline steps per event |
| `communication_items` | 003 / 006 | Hub channel rows + step-linked draft rows |
| `communication_versions` | 003 / 006 | Versioned draft content |

**From 003 — may be missing if only 006 repair path was applied:**

| Table | Role |
|-------|------|
| `event_assets` | Creative asset placeholders (shown on planning calendar when present) |
| `approval_requests` | Board approval tracking (shown on planning calendar when present) |
| `publication_schedule` | Scheduled publish (shown on planning calendar when present) |
| `activity_log` | Workspace activity timeline |

**Storage buckets (002):**

| Bucket | Purpose |
|--------|---------|
| `school-assets` | PTO and school logos |
| `calendar-uploads` | Uploaded calendar files |

---

## Known limitations

- **No Supabase Auth** — RLS policies allow open anon access (MVP).
- **Single-organization model** — `getLatestOrganization()`; no multi-tenant scoping in UI.
- **Calendar review is UI-only** — `/calendar/review` uses `lib/calendar/sample-data.ts`, not live parsed imports.
- **Placeholder AI** — Engine 4 generates template copy; OpenAI not integrated.
- **Communications Hub vs. timeline drafts** — Hub uses channel-level items; timeline uses step-linked items (`event_communication_step_id`).
- **Approval & publish placeholders** — Approve buttons disabled or non-functional; no external publishing.
- **Partial migration 003** — Workspace init (`event_assets`, `activity_log`) may fail silently if 003 tables absent; 006 covers comm draft tables only.
- **Fallback mock data** — Event Workspace falls back to mock playbook/workspace data when DB rows missing.
- **Dev cache sensitivity** — Run `npm run dev:clean` after `npm run build` to avoid stale CSS / module errors.
- **Settings page** — Not fully wired to Supabase persistence.
- **Two calendar routes** — `/calendar` (workload overview, Engine 5.8) and `/communications/calendar` (planning calendar, Engine 6); distinct purposes.
- **Artwork v2 active on Event Workspace** — Human-directed generation on `#artwork` tab; legacy `/creative-studio` and old `generateArtworkConceptsAction` remain inactive. See `product-v2/ARTWORK_REBUILD_NOTES.md`.

---

## Future engines

| Phase | Focus |
|-------|-------|
| Sprint 6 — AI Generation | OpenAI campaign generation, image prompts, real copy |
| Approval workflow | Board review, functional Approve, `approval_requests` |
| Publishing | Social scheduling, `publication_schedule`, channel integrations |
| Auth & multi-user | Supabase Auth, org-scoped RLS, user roles |
| Calendar intelligence | Live calendar parsing, import → event creation |
| Creative intelligence | **Artwork v2 shipped** — prompt + optional inspiration only; approve/deny/adjust on Event `#artwork` (see `product-v2/ARTWORK_REBUILD_NOTES.md`) |
| AI scheduling | Smart reschedule suggestions on planning calendar |
| Multi-user assignments | Assigned user filter and workflow routing on `/communications/calendar` |

See `docs/ROADMAP.md` and `product-v2/` for longer-horizon product concepts.

---

## Dependency graph

```
School Setup
    ↓
Calendar
    ↓
Events
    ↓
Playbooks
    ↓
Timeline
    ↓
Communication Items
    ↓
Communication Versions
    ↓
Communications Planning Calendar (Engine 6)
```

Each layer depends on the prior: organization profile enables calendar upload metadata; calendar review informs event planning; events receive playbook assignments; assignments spawn timeline steps; steps link to communication items; items store versioned draft content; the planning calendar aggregates all of the above for scheduling and rescheduling.

---

## Codebase audit (Release 0.5)

### Duplicate components

**Result: PASS** — No duplicate component filenames under `src/components/`. Related but distinct components (e.g. `CommunicationTimelineSection` vs. `TimelineSection`, `CommunicationCard` vs. `CommunicationStatusBadge`) serve different domains and are not redundant copies.

### Unused lib files

**Result: PASS with notes**

| File | Status |
|------|--------|
| All `src/lib/**` modules except below | Imported and in use |
| `src/lib/supabase/client.ts` | **Unused** — browser client scaffold; no imports yet (reserved for client-side Supabase) |
| `getStepDraftByStepId()` in `communications-brain/queries.ts` | **Unused export** — file is used via `getStepDraftsForEvent` |
| `ensureEventWorkspaceAction()` in `event-workspace/actions.ts` | **Unused export** — workspace init runs server-side in page via `initializeEventWorkspace()` |

No orphaned lib directories. Mock/sample files (`event-workspace/mock-data.ts`, `playbooks/mock-data.ts`, `calendar/sample-data.ts`) are intentional fallbacks.

### Migrations documented

**Result: PASS** — All six migration files are documented in this release note and `docs/ARCHITECTURE.md`. Cross-references also exist in `docs/SPRINTS.md`, `docs/SPRINT_5.md`, and `docs/ENGINE_4.md`. `docs/DATABASE_BLUEPRINT.md` remains the aspirational full-schema reference and predates Engines 3–4.

---

## Health scripts

```bash
npm run lint      # ESLint on src/
npm run build     # Production build
npm run verify    # HTTP 200 + CSS asset check (dev server required)
npm run dev:clean # Clear .next cache and restart dev
```
