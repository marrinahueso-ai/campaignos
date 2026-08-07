# Performance budget (load & memory)

**Status:** Living  
**Owner:** Engineering / QA  
**Last updated:** August 7, 2026 (image display pipeline note)  
**Related:** [Phase 1 complete](./performance-engineering-phase1-complete.md) ·
[k6 findings](./k6-load-test-findings.md) ·
[Testing guide](./testing-guide.md) · [Launch checklist](./launch-checklist.md) ·
[Image architecture](../engineering/image-architecture.md)

## Target

Interactive **page loads** and light **saves** should feel ready in **≤ 2 seconds** (wall-clock to usable UI: primary heading / chrome visible).

| Path | Budget |
|------|--------|
| Authenticated page navigation (Dashboard, Calendar, Events, Tasks, Approvals, Insights, Create with AI, key Settings) | **≤ 2000ms** |
| Light save / composer action (e.g. Tasks New Task) | **≤ 2500ms** |
| Sign-in submit → app shell | **≤ 3000ms** (Supabase auth) |
| Concurrent: 5 parallel warm dashboard loads | each **≤ 2000ms** |
| Soft JS heap after nav sweep (Chromium `performance.memory`) | **&lt; 250MB** used |

Measurement is **not** full `networkidle` (too noisy for RSC). Cold `next dev` compile of a never-visited route can exceed budget — the suite warms `/dashboard` first.

## How to run

```bash
npm run dev   # if not already running
npm run test:hey-ralli:perf
```

Requires `HEY_RALLI_TEST_EMAIL` / `HEY_RALLI_TEST_PASSWORD` in `.env.local`.

Spec: `tests/hey-ralli/perf/19-page-budget.spec.ts`  
Helpers: `tests/hey-ralli/helpers/perf.ts`

## Lighthouse route matrix (July 29, 2026 — Production desktop)

Founder-run desktop Chrome Lighthouse against logged-in Edmondson Elementary production pages:

| Route / surface | Performance | Accessibility | Best Practices | SEO | Result |
|---|---:|---:|---:|---:|---|
| `/dashboard` (Your overview) | **90** | **100** | **100** | **69** | Performance pass; **SEO 69 expected** (see below) |
| `/calendar` (Calendar Ease) | **99** | **100** | 96 | 92 | Performance pass |
| `/events` | **90** | **100** | **100** | 92 | Performance pass at threshold |
| `/volunteers` | **99** (was 81 / 76 pre-transform) | 97 | 96 | 92 | Performance pass |
| `/events/<event>/campaign-builder#inspiration` (Social Media Composer) | **88** | **83** | **100** | 92 | **Performance fail; accessibility follow-up** |
| `/homepage-composer` | **98** | **87** | **100** | **61** | Performance pass; accessibility and SEO follow-up |
| `/approvals` | **100** (was 82 pre-transform) | **100** | **100** | 92 | Performance pass |
| `/communications` | **97** | **100** | 92 | **100** | Performance pass |

**Soft-launch operational hubs and `/dashboard` now meet Lighthouse Performance ≥90** after the Supabase image-transform deploy (Jul 29 post-deploy re-measure, incognito production): Dashboard **90**, Calendar 99, Events 90, Volunteers **99**, Approvals **100**, Communications 97, Homepage Composer 98. Volunteers and Approvals jumped from **81/82** when list artwork still pulled multi-MB Supabase originals (~10,352 KiB / ~3,358 KiB payloads).

**Dashboard SEO 69 is expected, not a soft-launch defect.** Authenticated app routes emit `<meta name="robots" content="noindex, nofollow" />` so the signed-in product is not indexed — Lighthouse penalizes that by design. Do **not** remove `noindex` from dashboard or other app shells unless product intentionally wants authenticated routes in search (they should not). Marketing and public surfaces (`/`, share previews, etc.) are measured separately.

Product-wide Performance remains **Partial** — Social Media Composer **88** is the only remaining miss (prior Jul 29 run; not re-measured post-deploy).

Accessibility is also Partial product-wide: Calendar, Events, Approvals, and Communications scored 100, Volunteers 97, but Social Media Composer (83) and Homepage Composer (87) need focused remediation (prior Jul 29 run for composers; not re-measured post-deploy). These lab scores remain narrower than a keyboard, screen-reader, contrast, or WCAG audit.

Every run warned that IndexedDB may affect loading. Re-run in an incognito Chrome profile with extensions disabled before using the results to prioritize first-party bundle work. The Calendar audit’s ~192 KiB unused-JS diagnostic included ~82 KiB from Chrome extension `ofaokdiedipichpaobibbnahnkdoiiah` (including jQuery), not application code; about ~109 KiB was first-party `heyralli.com` chunks. Lighthouse’s lab score does **not** measure this document’s authenticated wall-clock-to-usable ≤2s budget or concurrent-dashboard requirement.

### Post-deploy win — Supabase image transform (July 29, 2026)

Deployed fix: public Supabase object URLs become `/storage/v1/render/image/public/...` transformed derivatives before they reach `next/image`. Hero cards are capped at 800px and queue thumbnails at 128px; queue images retain Next Image's default lazy loading. This bounds the upstream source instead of relying on the Vercel image optimizer to retrieve a multi-megabyte original. Signed/non-Supabase URLs intentionally retain their existing source URL and still use Next Image optimization.

**Current standard (August 2026):** shared `AppImage` + `toDisplayImageUrl` — see [image-architecture.md](../engineering/image-architecture.md). Hub surfaces (Approvals, Volunteers, Events, Campaigns, Today, Background Library) use that pipeline; remaining surfaces migrate when touched.

Founder post-deploy re-measure (incognito production desktop Lighthouse):

| Route | Performance (before → after) | Accessibility | Best Practices | SEO |
|---|---:|---:|---:|---:|
| `/volunteers` | **81 → 99** | 97 | 96 | 92 |
| `/approvals` | **82 → 100** | 100 | 100 | 92 |

Pre-deploy diagnostics (for context — superseded on these routes):

| Route | Image-delivery estimated savings | Cache-lifetime estimated savings | Total payload | Unused JS | Performance (pre-deploy) |
|---|---:|---:|---:|---:|---|
| `/volunteers` | **~9,769 KiB** | **~7,882 KiB** | **~10,352 KiB** | ~158 KiB | 81 |
| `/approvals` | **~2,790 KiB** | **~2,276 KiB** | **~3,358 KiB** | ~172 KiB | 82 |

Root cause confirmed: pre-deploy, list artwork pulled full-size Supabase originals; the earlier local-only `unoptimized` removal did not cap the upstream source. Post-deploy transform URLs fixed Volunteers/Approvals payloads and cleared the soft-launch ops-hub Performance bar.

**Still open:** Social Media Composer Performance **88** and Accessibility **83**; Homepage Composer Accessibility **87** (prior Jul 29 measurements — not re-run post-deploy). Recommended founder re-runs in incognito desktop Chrome:

1. `/events/<event>/campaign-builder#inspiration` and `/homepage-composer` — record failing audits, not just scores.
2. `/calendar`, `/events`, and `/communications` as control samples; verify the IndexedDB warning is gone or clearly isolated.

## Baseline (July 22, 2026 — Production heyralli.com)

After dashboard layout streaming (badge/pulse/weather deferred; shell no longer waits on sidebar counts):

### Client-side sidebar navigations (primary UX)

| Route | Result |
|-------|--------|
| Dashboard | **~0.9–1.4s** — Pass |
| Calendar / Events / Tasks / Insights | **~0.8–1.2s** typical (Calendar cold start can spike) — Pass |
| Approvals | **~0.9s** — Pass (lean: classic queue + CB2 scheduling only; no full Calendar / Meta bundles on hub load) |
| Tasks New Task click | **~18ms** — Pass |
| Sign-in submit → app | **~0.85s** — Pass |

### Concurrent ×5 warm Dashboard reloads

| # | Result |
|---|--------|
| 1–2 | **~1.6–2.0s** — Pass |
| 3–5 | **~2.1–2.5s** — slightly over under load |

JS heap ~14–22MB used after client-nav sweep (under 250MB soft cap).

Prefer Production: `HEY_RALLI_BASE_URL=https://heyralli.com npm run test:hey-ralli:perf`  
(`next dev` and `.env.local` localhost BASE_URL inflate times; the test script preserves a caller-set `HEY_RALLI_BASE_URL`.)

## Interpreting failures

1. Note which route/label failed and the ms printed in the console summary / attached JSON.
2. Re-run once against Production (`HEY_RALLI_BASE_URL=https://heyralli.com`).
3. If still over budget: profile that route (server waterfall, large client bundle, N+1 queries).
4. Auth / AI generation / Meta OAuth are **out of scope** for the 2s page budget.
5. Client-side sidebar navigations are measured separately (closer to real in-app UX).

## Hot path notes (July 24, 2026)

- **`getMetaPublishBundles` is read-only** — does not call `syncMetaPublicationSlots` / write slots on GET. Approvals previews, calendar item preview, and planning-hub loads stay read-only. Mutations use `syncAndGetMetaPublishBundles` (or explicit `syncMetaPublicationSlots`) when slots must be created/updated.
- **List fetch soft caps (Priority 2)** — org Files SSR caps at `FILES_ORG_FETCH_CAP` (400; event detail `FILES_EVENT_FETCH_CAP` 200); Tasks hub org load at `TASK_HUB_ORG_FETCH_CAP` (1000; event Tasks tab uncapped); Approvals scheduling org load at `SCHEDULING_ORG_FETCH_CAP` (400; event tab `SCHEDULING_EVENT_FETCH_CAP` 200); Inbox threads `INBOX_THREAD_FETCH_CAP` (50), messages `INBOX_MESSAGES_PER_THREAD_CAP` (40) / `INBOX_MESSAGES_FETCH_CAP`, unread badge sums at most `INBOX_UNREAD_BADGE_THREAD_CAP` (500) thread rows; channel sidebar counts use `head: true` exact counts (no full thread row scan).
- **Optimistic mutations skip `router.refresh` (Priority 3)** — Task Hub list/board/calendar status + reorder, GroupedTaskChecklist status/reorder, caption field generate/save/approve/unapprove/sync, Campaign Captions generate/save, and Preview clear-milestone rely on local state (create/delete and milestone-wide approve still refresh).
- **Insights pulse is lean (Priority 4)** — Today widget uses `getInsightsPulseData` (connection + account KPIs for 7d only). Full `/insights` still uses `getInsightsPageData` (posts, series, activity, breakdowns).
- **Membership / hot helpers (Priority 5)** — layout `listActiveMemberships` + `getActiveMembership` share one cached `organization_users` load; `getOrganizationById`, `getOrganizationUsers`, playbook-with-steps, and team-access workload are request-`cache()`’d so metadata + page do not double-fetch.
- **Client code-split (Priority 6)** — Ask Ralli dialog loads on open (sidebar pin stays eager); Event Detail Volunteers tab is `next/dynamic` like other heavy tabs; Create with AI Artwork stack loads via dynamic `CampaignCreativeTab` + lazy ArtworkV2 step screens (campaign workspace stays on the default path).

## Hot path notes (Aug 1, 2026 — loading-speed wins)

- **Event Detail shell first; Approvals client-loaded** — bare `/events/[id]` paints hero/tabs via lean `getOrganizationWorkspaceDataLean` (explicit columns, skip seed, no member↔event assignment round-trip). Approvals is no longer SSR-streamed (`approvalsSlot={undefined}`); the client loads it via `loadEventDetailTabAction` like other lazy tabs so the HTML response is not blocked on the approvals query+DTO. Non-Approvals deep links keep SSR tab preload. `EventDetailApprovalsStream` remains in-tree for easy revert.
- **Tasks list selects omit `notes`** — `PLAYBOOK_TASK_LIST_SELECT` + parallel id presence query for `hasNotes`; drawer still loads note bodies via `getTaskHubTaskNotesAction`.
- **Dashboard widgets use lean helpers** — `getDashboardTaskItems` / `getUnifiedApprovalsSchedulingDataLean` (skip live-name + Meta slot overlay) instead of full Tasks V2 / Approvals hub DTOs; workspace via `getOrganizationWorkspaceDataLeanWithAssignments`.
- **Approvals enrich parallelized** — assignees / live names / Meta slots (hub) and assignees / Meta bundles / slots / live names (event tab) run in one `Promise.all` wave; approve still defers Meta schedule + email via `after()`.

## Caching contract

- **Scope:** performance caches use React `cache()` for request-local deduplication only; they do not persist or share authenticated organization data across requests. Examples: [membership queries](../../src/lib/auth/membership-queries.ts), [Meta publish bundles](../../src/lib/meta-publishing/bundles.ts), and [planning raw data](../../src/lib/communications-calendar/planning-raw.ts).
- **Coverage:** dashboard/layout reads share memberships and organization helpers; approvals, scheduling, Event detail, and campaign-builder option reads cache repeated server lookups within their render request.
- **Freshness:** mutations explicitly invalidate affected routes with `revalidatePath`; the app intentionally does not apply a shared response cache to session-scoped dashboard data.
- **Verification:** exercise a page that renders both metadata/layout and main content, then use the Supabase request log or temporary local query instrumentation to confirm a duplicated helper is issued once per request. Regression coverage should keep the cache wrapper around a hot helper rather than asserting cross-request reuse.

## Latest local verification (July 29, 2026)

`npm run test:hey-ralli:perf` ran against the local web server with the configured QA account. The Tasks **New Task** interaction passed at **33ms** (heap ~159MB). The five concurrent dashboard loads were **6.0–6.1s**, over the 2s target; this is a real local miss but is not comparable to the July 22 Production baseline because `next dev` compilation and the local machine are in the path. Two stale test locators (Approvals' non-unique heading and login's renamed "Log in" heading) prevented the other route samples from completing; they were corrected in the smoke harness. Re-run against Production before accepting a new baseline:

```bash
HEY_RALLI_BASE_URL=https://heyralli.com npm run test:hey-ralli:perf
```

## Multi-tenant readiness (k6)

**Performance Engineering Phase 1 is COMPLETE.** Canonical handoff:
[performance-engineering-phase1-complete.md](./performance-engineering-phase1-complete.md).

Suite lives under [`load-tests/k6/`](../../load-tests/k6/README.md). Prefer
staging Preview. Production hosts are blocked unless `K6_ALLOW_PRODUCTION=true`.
`next dev` is unsuitable (false-positive tenant-isolation failures).

### Accepted operating envelope (Phase 1)

| Concurrent pinned owners | Ordinary-read p95 | Notes |
|---|---:|---|
| 20 VU (100-school) | Pass (post–auth remediation) | Architecture validation |
| 50 VU (100-school) | **~1.38s — PASS** | Last fully green latency point |
| 75 VU on **Medium** + kept app fixes | **1.55s — near-miss FAIL** | ~53ms over 1.5s; dashboard/calendar/events_list pass &lt;2s |

| Environment | Recommended compute |
|---|---|
| Staging | **Medium** (4 GB / 2-core) |
| Production | **Medium** preferred if ~75-VU class concurrency is in scope |

Correctness (tenant/auth/checks/unexpected 4xx–5xx/dropped) held **perfect**
from 20→75 VU. Do **not** run 100 VU for Phase 1 closure. Chronological log:
[k6-load-test-findings.md](./k6-load-test-findings.md).

```bash
# Example — staging Preview + VERCEL_JWT; see suite README for full controls
npm run test:load:preflight:100-schools
K6_SESSIONS_FILE=../data/sessions.100-school-architecture.local.json \
  npm run test:load:data-scale:100school:75vu
```

## Not covered here

- Lighthouse CI / Core Web Vitals route and device matrix (optional follow-up)
- Artwork generation latency
- Full k6/Artillery soak against Production (avoid hammering prod; use the guarded k6 suite on staging instead)
- Write-path / AI / Meta load profiles (post–Phase 1)
- 100-VU characterization (deferred; see Phase 1 §15)
