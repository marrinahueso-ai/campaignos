# Performance budget (load & memory)

**Status:** Living  
**Owner:** Engineering / QA  
**Last updated:** July 24, 2026  
**Related:** [Testing guide](./testing-guide.md) · [Launch checklist](./launch-checklist.md)

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
- **List fetch soft caps (Priority 2)** — org Files SSR caps at `FILES_ORG_FETCH_CAP` (400; event detail `FILES_EVENT_FETCH_CAP` 200); Tasks hub org load at `TASK_HUB_ORG_FETCH_CAP` (1000; event Tasks tab uncapped); Inbox threads `INBOX_THREAD_FETCH_CAP` (50), messages `INBOX_MESSAGES_PER_THREAD_CAP` (40) / `INBOX_MESSAGES_FETCH_CAP`, unread badge sums at most `INBOX_UNREAD_BADGE_THREAD_CAP` (500) thread rows; channel sidebar counts use `head: true` exact counts (no full thread row scan).
- **Optimistic mutations skip `router.refresh` (Priority 3)** — Task Hub list/board/calendar status + reorder, GroupedTaskChecklist status/reorder, caption field generate/save/approve/unapprove/sync, Campaign Captions generate/save, and Preview clear-milestone rely on local state (create/delete and milestone-wide approve still refresh).
- **Insights pulse is lean (Priority 4)** — Today widget uses `getInsightsPulseData` (connection + account KPIs for 7d only). Full `/insights` still uses `getInsightsPageData` (posts, series, activity, breakdowns).

## Not covered here

- Lighthouse CI / Core Web Vitals on Production (optional follow-up)
- Artwork generation latency
- Full k6/Artillery soak against Production (avoid hammering prod)
