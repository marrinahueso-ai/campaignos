# 100-school / 75-VU latency — root-cause analysis

**Status:** Dual bottleneck confirmed (server TTFB + large HTML transfer).
Smallest dashboard query fix validated — **insufficient**; Run 2 still fails
unchanged gates and showed deeper multi-route tails.
**Date:** August 3, 2026
**Baseline:** [75-VU Run 1](./100-school-75vu-data-scale-run1.md)
(`100school-75vu-run1-20260803-2341`)
**Re-validation:** [75-VU Run 2 RCA](./100-school-75vu-data-scale-run2-rca.md)
(`100school-75vu-run2-rca-20260803-1915`)
**Related:** [50-VU Run 2](./100-school-50vu-data-scale-run2.md) ·
[20-VU Run 2](./100-school-20vu-data-scale-run2.md)

---

## Root cause summary

At 75 concurrent pinned owners, sustained latency rises because **both**
server time-to-first-byte and response-body transfer inflate under concurrent
RSC HTML documents — while auth, tenant isolation, HTTP errors, and integrity
stay perfect.

| Phase (k6) | 50-VU Run 2 p95 | 75-VU Run 1 p95 | 75-VU Run 2 p95 |
|---|---:|---:|---:|
| `http_req_waiting` | 594ms | **1,215ms** | **1,862ms** |
| `http_req_receiving` | 900ms | **1,732ms** | **2,147ms** |
| `kind:read` total | 1,376ms | **2,766ms** | **3,951ms** |
| Hold >3s | 1 | **134** | **395** |

**Not causal:** Auth Absolute/10 (0 auth failures / 0 unexpected 429s),
tenant isolation, middleware `getClaims`, and “DB-only” (receiving shares
~54–63% of read p95; multi-route tails).

**Partially tested and insufficient:** collapsing three overlapping dashboard
event-range queries into one (Run 2). Dashboard remains hot, but hold slows
also hit `event_detail`, `events_list`, `calendar`, approvals paths — a
systemic concurrency + payload story, not a single Today query.

---

## Where latency is introduced (ranked)

### 1. Concurrent transfer of large HTML documents — HIGH impact, HIGH confidence

**Evidence:** receiving p95 is ~54–63% of read p95 at 75 VU; single-tenant
sizes approvals **219 KB** / dashboard **143 KB** / calendar 119 KB / events
116 KB; receiving roughly doubles 50→75 with the same class of share.

**Expected improvement if hot-route payload meaningfully cut / streamed:**
~0.5–0.9s off read p95 under 75 VU (receiving-dominated).

**Complexity / risk:** Medium–high.
**Launch timing:** **Before launch** for dashboard / approvals / events.

### 2. Concurrent RSC render + shared backend contention — HIGH impact, HIGH confidence *as amplifier*

**Evidence:** Hold-sustained (not ramp-only); Run 2 multi-route hold slows
(dashboard 88, event_detail 86, events_list 43, calendar 41, …) with status
200; Run 2 tails far worse than Run 1 (92 hold `>10s`, max 36s) under the
same gates/profile — high variance under saturation.

**Expected improvement if contention relieved (leaner work per request and/or
more compute headroom):** large on waiting tails; hard to quantify without an
A/B.

**Complexity / risk:** App lean = medium; infra bump = low ops / medium cost.
**Launch timing:** Address with payload/composition first; infra A/B only if
waiting tails remain after one payload-focused change.

### 3. Dashboard blocking data fan-out (beyond event-range collapse) — MEDIUM–HIGH impact, HIGH confidence

**Evidence:** Dashboard still leads hold slows; Attention → org-wide rich
lists; `fetchPlanningRawDataForEvents`; `getMemoryHintsForEvents` →
`getAllEvents()`.

**Query-collapse result:** implemented + re-validated — **did not clear gate**
(Run 2 read p95 3.95s). Treat as small TTFB win at best, not the primary lever.

**Expected further improvement (Attention defer / planning-raw / memory-hints):**
0.2–0.8s dashboard waiting under concurrency.

**Complexity / risk:** Medium.
**Launch timing:** Before launch if dashboard stays in launch mix.

### 4. Events home workspace seed on GET — MEDIUM impact, MEDIUM confidence

**Evidence:** `getOrganizationWorkspaceData` → `ensureOrganizationWorkspaceSeeded`
unless lean/skipSeed; events list among top hold-slow routes in Run 2.

**Expected improvement:** 0.05–0.2s on `/events` if lean+skipSeed on GET.

**Complexity / risk:** Low–medium.
**Launch timing:** Before launch if events remains in traffic mix.

### 5. Approvals hub uncapped classic queue + large HTML — MEDIUM impact, MEDIUM confidence

**Evidence:** 219 KB HTML; classic queue path uncapped / wide selects;
approvals p95 spiked in Run 2 (7.26s) under contention.

**Expected improvement:** 0.2–0.5s on approvals if projected/capped + leaner HTML.

**Complexity / risk:** Medium.
**Launch timing:** Before launch for Approvals-heavy schools; else after.

### 6. Supabase Micro as *primary* cause — LOW–MEDIUM impact, LOW confidence *as primary*

**Evidence against DB-primary:** receiving shares majority of p95; zero 500s;
dataset ~28 MB; Auth fine. **Evidence for contribution:** waiting rose and
Run 2 multi-route waiting tails suggest shared backend pressure under 75
concurrent server renders.

**Smallest infra experiment worth testing (only after one app payload pass,
or in parallel as a pure A/B):** staging **Micro → Small**, same Preview code
and identical 75-VU profile. Accept infra as limiting only if waiting p95
drops sharply while HTML sizes stay constant.

**Launch timing:** After (or tightly A/B’d against) app payload work — do not
use upgrade to mask large HTML.

### 7. Middleware / getClaims — LOW impact, HIGH confidence *not causal*

**Evidence:** Zero auth failures at 75 VU on both Run 1 and Run 2.

---

## Ranked optimization opportunities

| Rank | Opportunity | Est. p95 impact @75 VU | Complexity | Risk | When |
|---|---|---|---|---|---|
| 1 | Reduce hot-route HTML / stream / defer widgets | 0.5–0.9s | Med–High | Med | Before launch |
| 2 | Dashboard: defer/slim Attention + planning-raw + memory-hints | 0.2–0.8s (dashboard) | Med | Med | Before launch |
| 3 | Events: lean workspace + skipSeed on GET | 0.05–0.2s (events) | Low | Low | Before launch |
| 4 | Approvals: project/cap classic queue + shrink HTML | 0.2–0.5s (approvals) | Med | Med | Before / after |
| 5 | Dashboard event-range collapse (**done**, insufficient alone) | ≤0.1–0.4s (dashboard) | Low | Low | Keep |
| 6 | Infra Micro→Small A/B if waiting tails remain after #1 | unknown | Low (ops) | Low | After / parallel A/B |

**Estimated cumulative (app-side, before infra):** roughly **0.8–2.0s** off
ordinary-read p95 at 75 VU if payload + remaining dashboard fan-out are both
addressed — enough to approach the 1.5s gate **only if receiving is cut**.
Query collapse alone will not clear the gate (empirically confirmed).

---

## Smallest correct change (implemented + validated)

Collapse overlapping dashboard `getEventsInDateRange` calls into one
planning-window fetch; derive month/week strips in memory.

- `src/lib/today/queries.ts`
- `src/lib/today/event-date-filter.ts`
- `src/lib/today/__tests__/today-event-window.test.ts`
- Preview: `campaignos-68faks8tv-campignos.vercel.app`

**Outcome:** correctness unchanged; latency gates still fail (Run 2 worse
tails than Run 1 — treated as saturation variance, not proof the collapse
regressed the product).

---

## Recommended next engineering step

1. **Do not** run 100 VU yet.
2. Next app change should target **receiving**: reduce or stream hot-route HTML
   (dashboard Attention deferral and/or approvals payload diet are the highest
   leverage candidates supported by size + route evidence).
3. Optionally add **minimal** `Server-Timing` (or equivalent) on dashboard /
   events / approvals for one short probe — only if needed to split “DB vs
   render vs serialize” inside waiting.
4. If after one payload-focused change waiting still shows multi-route `>10s`
   hold tails, run the **Micro → Small** staging A/B on the same Preview code
   before further speculative query work.
5. Re-run the **identical 75-VU** profile after the next material change;
   compare waiting / receiving / hold tails to Run 1 (primary baseline) and
   Run 2 (post query-collapse).

## Re-validation / 100 VU

| Question | Answer |
|---|---|
| Run another 75-VU? | **Yes** — after the next material remediation (payload/composition or infra A/B). |
| 100 VU meaningful after remediation? | **Only after** 75 VU meets the unchanged gates cleanly (preferably twice). |
