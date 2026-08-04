# 100-school / 75-VU data-scale — Run 2 (RCA re-validation)

**Status:** **LATENCY STILL FAILING** — correctness/security gates perfect;
ordinary-read and hot-route p95 gates failed. Dashboard event-range query
collapse did **not** clear the 1.5s gate; this run was noisier/worse than
Run 1 under the same profile.
**Date:** August 3, 2026
**Run ID:** `100school-75vu-run2-rca-20260803-1915`
**Baseline:** [75-VU Run 1](./100-school-75vu-data-scale-run1.md)
**RCA:** [100-school-75vu-latency-rca.md](./100-school-75vu-latency-rca.md)

---

## 1. What changed vs Run 1

| Item | Value |
|---|---|
| Application change | Collapse 3 dashboard `getEventsInDateRange` calls → 1 planning-window fetch (`src/lib/today/queries.ts` + `event-date-filter.ts`) |
| Preview | `https://campaignos-68faks8tv-campignos.vercel.app` (`dpl_5XtyxQb85Qy1eEJa22H3LUKb73w7`) |
| Dataset / Auth / Micro / gates | Unchanged (`arch100`, Absolute/10, Micro, same thresholds) |
| Profile | Identical `DATA_SCALE_100SCHOOL_75VU_WORKLOAD` |

No threshold, workload, Auth allocation, or infrastructure upgrades.

---

## 2. Preflight

| Step | Result |
|---|---|
| Remint 75 pinned owners | 75/75 |
| Live auth `/dashboard` | **75/75 OK** |
| Full preflight | **25/25 PASS** |
| Discardable warmup | Correctness green (not authoritative) |

---

## 3. Result vs Run 1

| Metric | Run 1 (baseline) | Run 2 (after query collapse) |
|---|---:|---:|
| Auth / tenant / checks | 0 / 0 / 100% | **0 / 0 / 100%** |
| HTTP failed / dropped | 0 / 0 | **0 / 0** |
| Unexpected 401/403/429/500 | 0 | **0** |
| `kind:read` p95 | 2.77s | **3.95s** (gate 1.5s — **FAIL**) |
| `dashboard` p95 | 3.17s | **4.16s** (**FAIL**) |
| `calendar` p95 | 2.83s | **3.67s** (**FAIL**) |
| `events_list` p95 | 2.42s | **4.04s** (**FAIL**) |
| `http_req_waiting` p95 | 1.21s | **1.86s** |
| `http_req_receiving` p95 | 1.73s | **2.15s** |
| Hold >3s / >5s / >10s / >20s | 134 / 2 / 0 / 0 | **395 / 203 / 92 / 11** |
| Overall max | 5.47s | **36.69s** |
| HTTP requests / iterations | 5,286 / 1,628 | 5,012 / 1,574 |

k6 error line: thresholds crossed on
`kind:read`, `route:dashboard`, `route:calendar`, `route:events_list`.

**Exit-code note:** `npm run … \| tee` still reported shell exit `0` despite
threshold failures (same class of capture issue as Run 1). Authoritative
outcome is the threshold-crossed line above.

---

## 4. Hold slow-route mix (Run 2)

395 hold `>3s` events, top routes:

| Route | Hold slow count |
|---|---:|
| dashboard | 88 |
| event_detail | 86 |
| events_list | 43 |
| calendar | 41 |
| event_approvals | 27 |
| (other routes) | 110 |

Degradation remains **multi-route and hold-sustained**, not dashboard-only.
That is inconsistent with “overlapping Today event-range queries” as the
primary limiter.

---

## 5. Interpretation

1. **Correctness still holds** at 75 VU — Auth, tenant isolation, checks, and
   HTTP success rates stay perfect.
2. **Query collapse is insufficient** for the 1.5s ordinary-read gate (as
   predicted: expected only ~0.1–0.4s dashboard waiting).
3. **Run 2 was worse than Run 1** (especially tail: 92 hold `>10s`, max 36s).
   That points to **systemic concurrency contention** (serverless + large RSC
   documents + shared staging DB) with high run-to-run variance — not a
   regression uniquely attributable to the query collapse (status 200 across
   many routes; payload path unchanged).
4. Phase mix remains dual: waiting ~47% / receiving ~54% of read p95 — still
   **not database-only** and still **not Auth**.

---

## 6. Decision

- Do **not** proceed to 100 VU.
- Do **not** loosen gates or shrink the profile.
- Keep the low-risk query collapse (correctness-preserving).
- Next remediation must target **payload / route composition** and/or a
  controlled **infra A/B** if multi-route waiting tails persist after one
  payload-focused change — see RCA.
