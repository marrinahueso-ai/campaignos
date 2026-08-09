# Release checkpoint — Events workspace round (2026-08-08)

**Status:** Living — **pre-regression** checkpoint (not a security or performance VERIFIED stamp)  
**Owner:** Engineering / QA  
**Date:** 2026-08-08  
**Repo HEAD (docs authored against):** `bbae97a` (`Update EventWorkspaceOverviewPanel.tsx`)  
**Round span (git):** `680b37b` (Get Started + Auth redesign) … `bbae97a` (workspace card accents)  
**Related:** [Feature list](../product/feature-list.md) · [Architecture](../engineering/architecture.md) · [Access & onboarding](../security/access-and-onboarding.md) · [Production readiness verification](../security/production-readiness-verification-2026-08.md) · [Launch security assessment](../security/launch-security-assessment-2026-08.md) · [Performance Phase 1](./performance-engineering-phase1-complete.md)

This document records **what is actually implemented** on `main` at the checkpoint SHA for the current development round, and what still needs regression before treating the new surfaces as production-verified. It does **not** replace prior Production approvals for **unchanged** core platform controls.

---

## 1. Release status

| Field | Value |
|-------|--------|
| Checkpoint purpose | Pre–marketing screenshots / security regression / load testing |
| Deployment / environment | Code on `main` / `origin/main` at `bbae97a`. Prior Production readiness audit (2026-08-07) certified an earlier lineage (`b0438ea` hardening + later UI). **This round’s Events/auth/marketing deltas are not yet re-certified on Production in that report.** |
| Major changed surfaces | `/events` selected-event workspace · `/events/[id]` Event Workspace shell · Invite Team drawer · Event Volunteers Arrived/Received · Calendar detail drawer · Create Event modal · Auth Get Started package · Dashboard header display name · Marketing Wow pages (home/pricing/why/resources/about) |
| Intentionally deferred | Soft-redirect bare `/events/[id]` overview → `/events?event=` · Next Best Action · deleting `/events/[id]` · eager full tab datasets on Events home · Facebook OAuth on auth redesign |

### Known limitations (implemented)

- Events home manage menu uses **event** noun; Event ID overview manage menu still defaults to **campaign** noun (backend actions unchanged).
- Also Ahead **excludes** the selected event (not an Active highlight row in the list).
- Staffing counts **volunteer spots** (not Pilot “Roles”); empty staffing shows “isn't set up yet” / no fake `0%` goal when totals are unknown.
- Milestone / attention copy is derived from hero-stats aggregates, not prototype fake schedules.
- Playwright `24-event-workspace-redesign` covers **Event ID** overview navigation; **no** Playwright yet for Events home `?event=` / Also Ahead selection.
- Unit/contract tests cover selection helpers, home merge contracts, invite drawer contracts; not a substitute for security/load regression.

---

## 2. Events page — implemented architecture

**Primary files:** `src/app/(dashboard)/events/page.tsx`, `src/components/events-phase3/EventsHomeContent.tsx`, `src/components/events-phase3/EventWorkspaceOverviewPanel.tsx`, `src/components/events-phase3/EventsAlsoAheadList.tsx`, `src/lib/events/events-home-selection.ts`.

### Combined Events + selected-event workspace

When Phase 3 UI is enabled, `/events` is no longer a focus/queue-only landing. It hosts the **selected event’s overview** in place (hero → Also Ahead → operational summary → Attention Needed + Staffing → Event Workspace cards), while **deep work** still lives on `/events/[id]?tab=…`.

### Page hierarchy (Events home)

1. Events header (Create with AI · New event modal · filter pills · school year · search · Full calendar)
2. Selected-event hero (`variant="home"`, compact ~380px desktop height)
3. Also Ahead list (secondary browser only)
4. Operational summary strip (status · staffing goal · lead · milestone · Invite when permitted)
5. Attention Needed + Staffing Status
6. Event Workspace cards
7. Suite strip / Create Event modal / Invite drawer (when gated)

**Removed from this surface:** What’s Next. **Never implemented:** Next Best Action. Right-side upcoming stack / Open Workspace CTA from older ease layouts are gone from this merge.

### Selected event + `?event=`

- URL: `/events?event=<id>` via `router.replace` (no push remount).
- Server and client resolve selection with `resolveSelectedEventsHomeEvent` against **accessible** lens lists only.
- Untrusted / inaccessible IDs fall back to preferred-in-list then first event; URL is rewritten to the resolved id.
- Default: Upcoming (next-60-days) soonest when no valid URL id; archived URL id opens Archived lens.
- Selecting an Also Ahead row updates `?event=` and swaps hero/attention/staffing/workspace context.

### Also Ahead

- Excludes the selected event (`eventsHomeAlsoAheadEvents`).
- Collapsed default **4** rows (`EVENTS_ALSO_AHEAD_COLLAPSED_COUNT`); **Show all events** / **Show less**.
- Expand resets when lens / search / school year changes.
- Thumbs: `AppImage` `preset="thumb"`.

### Attention Needed / Staffing / Workspace

| Block | Behavior |
|-------|----------|
| Attention Needed | From `buildAttentionItems(stats)` → jumps via `onSelectTab` to Event ID tabs |
| Staffing Status | Spot fill donut when configured; otherwise empty CTA → Volunteers |
| Planning | Tasks, Notes, & Files → `?tab=tasks` (Planning hub) |
| Approvals | Content requiring review → `?tab=approvals` |
| Volunteers | Shifts & Signups → `?tab=volunteers` |
| Community | Team & Vendors → `?tab=responsibilities` |
| Visual polish | Muted 3px top accents (sage / soft gold / teal / taupe); cards stay warm white |

### Invite + `(...)` menu

- Invite Team Member: `InviteEventMemberDrawer` when `manage_people`; wired on operational summary + Community **+ Invite**.
- `EventManageMenu` with `entityNoun="event"`: Edit details · Archive event · Delete event (actions = existing `archiveEventAction` / `deleteEventAndRedirectAction` / restore).

### `/events/[id]` deep routes (still required)

- Still the destination for Planning / Approvals / Volunteers / Community / Insights / Activity / Create with AI handoff.
- Overview on Event ID keeps **What’s Next** (default `showWhatsNext`).
- Invite entry points also on Event ID header + Community (same drawer + `manage_people`).
- No auto soft-redirect from bare Event ID overview to `/events?event=` in this round.

### Images

- Home hero: `AppImage` `preset="hero"`, `object-cover object-center`, compact `lg:h-[380px]`.
- Also Ahead: `preset="thumb"`.
- Detail overview poster: `preset="card"` (Event ID).

---

## 3. Events data / performance

### Initial `/events` load (lean)

`Promise.all`: campaign events, archived events, org workspace, school years, active year, committee assignments, home layout pref, playbooks, effective access. Then artwork map for a **subset** of ids, responsible-person map for list rows, and **one** `getEventDetailHeroStats(selectedId)`.

Lean client events clear unused `planningQuickLinks` / `planningVendors`.

### After selection change

- Reuses list row title/date/type/lead/artwork.
- Fetches hero stats only via `refreshEventDetailHeroStatsAction` when that event’s stats are not already cached client-side.
- Does **not** load full tasks / approvals / volunteers / files / notes / vendors / insights payloads on `/events`.

### Aggregates (`getEventDetailHeroStats`, React `cache`)

Parallel counts: builder-session milestones, communication steps, classic pending approvals, scheduling-queue approvals, scheduled posts, playbook tasks (if tables exist), latest confirmed volunteer staffing spots.

### Stale / rapid switching

Identity check: `requestEventId !== selectedEventIdRef.current` (same pattern as Event Detail manage-assignments / hero refresh), plus effect cancellation. Prevents an older stats response from overwriting the current selection.

### N+1 / assumptions

- No per-row stats/tasks/approvals queries on the list.
- Assumption: one selected-event aggregate bundle is enough for home overview; deep tabs remain Event ID + existing lazy tab loaders.
- **Requires performance re-check** under concurrent selection switching and multi-tenant load (prior Phase 1 k6 did **not** cover this home merge).

---

## 4. Events security / permissions

| Concern | Implemented treatment |
|---------|----------------------|
| List scope | `getCampaignPageEvents` / archived variants → org + school-year scope → `filterEventsByAccess` |
| Selected id | Untrusted; must appear in accessible lens list |
| Stats refresh | Auth user + active membership + `getEventById` (access / IDOR guard) before stats |
| Invite | `requirePermission("manage_people")` in invite-event-member actions |
| Edit details | Existing event edit dialog / actions behind event access |
| Archive / Delete | Existing actions; gated by successful `getEventById` (no separate permission key beyond access) |
| RLS | Unchanged dependency: org-scoped event tables + invite/membership RLS; volunteer ops table migration `20260808140000_event_volunteer_ops.sql` for Arrived/Received |

**Requires security regression** for: `?event=` cross-org / inaccessible id, invite gate on home + Event ID, archive/delete from home menu, volunteer ops writes.

---

## 5. Onboarding / account access (this round)

Auth redesign package (cream auth-card shell) + Get Started marketing entry — **no parallel auth/setup systems**.

| Step | Route | Required? |
|------|-------|-----------|
| Marketing entry | `/get-started` | Optional entry |
| Path chooser | `/signup/welcome` | Optional entry |
| Founding signup | `/signup` (+ plan / founding code when required) | Required for new org |
| Login / recovery / invite accept | `/login`, `/forgot-password`, `/invite/[token]` | As needed |
| New School Handoff | `/onboarding` → bootstrap | Required for new org |
| First event | `/events/create?onboarding=1` | **Required** before essentials |
| Calendar + Brand | `/onboarding/essentials` | Optional (Skip) |
| Team + Meta | `/onboarding/connect` | Optional (Skip) |
| Land on event | Event workspace + You’re set toast | After setup |

Founding access codes / multi-org switcher / `manage_people` invite path unchanged in model; UI chrome updated. Living detail: [access-and-onboarding.md](../security/access-and-onboarding.md).

---

## 6. Dashboard changes (this round)

| Change | What shipped |
|--------|----------------|
| Header account label | Shows **display name** (membership / composed name) with **email fallback** — `e608f00` (`DashboardHeader` / layout queries). **Not** a widget redesign. |
| Dashboard Ease mockup | Still **in progress** / do not ship until GO (unchanged). |
| Arrived / Received | **Not** on dashboard. Lives on **Event Volunteers** People/Items (`event_volunteer_ops`). |

---

## 7. Other production changes in this round (verified in git)

| Area | What exists |
|------|-------------|
| Event Workspace redesign | Overview default, Planning/Community hubs, Approvals card grid, Volunteers Coverage/People/Items, Back to [Event] |
| Create Event modal | Events home New event → `CreateEventModal` (still `createEvent`); `/events/create` for onboarding/direct |
| Calendar detail drawer | Right drawer for event/scheduled/published; real artwork/captions; Open Event / Open Post / Insights |
| Marketing | Wow home, Pricing, Why Hey Ralli, Resources, About |
| Approvals / Volunteers Pilot UX | Event Approvals ease cards; Volunteers roster ease + Create Volunteer Post |
| Invite Team | Drawer + Event ID and Events home entry points |

Do **not** document Next Best Action, Events home auto-redirect from all Event ID URLs, or dashboard Arrived widgets — not implemented.

---

## 8. Testing checkpoint

### ALREADY VERIFIED / UNCHANGED (prior work — do not invalidate)

- Core platform launch security certification + Production readiness smokes as of **2026-08-07** ([launch-security-assessment](../security/launch-security-assessment-2026-08.md), [production-readiness-verification](../security/production-readiness-verification-2026-08.md)) for **pre-round** hardening lineage — auth/session, tenancy RLS baseline, Calendar SSRF Production path, credit RPCs, school-media, etc.
- Performance Engineering **Phase 1** k6 closeout for the **prior** surface set ([performance-engineering-phase1-complete](./performance-engineering-phase1-complete.md)).
- Contract/unit suites exercised in-round for Events selection, ease UI contracts, invite helpers, Event ID ease UI, volunteers tenancy (local `tsx` / `test:events-phase3` style runs — engineering confidence, **not** Production regression sign-off).

### REQUIRES FUNCTIONAL / PLAYWRIGHT REGRESSION

- Events home: default selection, `?event=` refresh, invalid id fallback, Also Ahead select/expand, archived lens, Create Event modal, Generate Event Plan, workspace card → Event ID tabs, Attention/Staffing empty & configured states, Invite open when `manage_people`, Archive/Delete event copy on home.
- Event ID: Overview What’s Next still present; Invite header/Community; Arrived/Received; Approvals/Volunteers Pilot layouts; Calendar detail drawer.
- Auth Get Started → welcome → founding/invite → Ease onboarding essentials/connect.
- Dashboard header shows display name when present.

### REQUIRES SECURITY REGRESSION

- `?event=` with foreign / inaccessible ids (no data leak; fallback only).
- Invite Team on `/events` and `/events/[id]` without `manage_people`.
- Archive/Delete/Edit from home manage menu (authorization + RLS).
- `refreshEventDetailHeroStatsAction` / invite actions IDOR.
- `event_volunteer_ops` Arrived/Received write isolation.
- Auth redesign routes still enforce founding-code / invite-email / deactivated gates.

### REQUIRES PERFORMANCE / LOAD REGRESSION

- `/events` SSR cost with one `getEventDetailHeroStats` + artwork subset under multi-tenant load.
- Rapid Also Ahead switching (stale-guard correctness under concurrency; no N+1 regression).
- Event ID tab lazy loaders still within prior budgets.
- Prior Phase 1 k6 scenarios **re-run or extended** to include Events home workspace path (do not treat Phase 1 alone as verification of this merge).

---

## 9. Doc index updates in this checkpoint

See companion updates in feature-list, architecture §5.4, access-and-onboarding, image-architecture (Events AppImage), QA architecture overview step 6, and security README / production-readiness pointer.
