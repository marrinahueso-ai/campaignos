# 100-school / 75-VU latency — root-cause analysis

**Status:** Dual bottleneck confirmed. Three focused app fixes (waiting-path
×2 + Approvals receiving deferral) validated and **insufficient** for the
unchanged 1.5s ordinary-read gate. Next cleanest experiment: **Micro → Small**.
**Date:** August 3, 2026
**Baseline:** [75-VU Run 1](./100-school-75vu-data-scale-run1.md)
**Attempts:** [Run 2 query-collapse](./100-school-75vu-data-scale-run2-rca.md) ·
[Run 3 Attention lean](./100-school-75vu-data-scale-run3-attn.md) ·
[Run 4 Approvals deferral](./100-school-75vu-data-scale-run4-defer.md)

---

## Root cause summary

At 75 concurrent pinned owners, sustained latency rises because **both**
server TTFB and large HTML transfer inflate under concurrent RSC documents —
while auth, tenant isolation, HTTP errors, and integrity stay perfect.

| Phase (k6 p95) | 50-VU | 75 Run 1 | 75 Run 2 | 75 Run 3 | 75 Run 4 |
|---|---:|---:|---:|---:|---:|
| waiting | 594ms | 1,215ms | 1,862ms | 1,494ms | 1,513ms |
| receiving | 900ms | 1,732ms | 2,147ms | 1,997ms | 1,934ms |
| `kind:read` | 1,376ms | **2,766ms** | **3,951ms** | **3,352ms** | **3,353ms** |
| Hold >3s | 1 | **134** | **395** | **344** | **343** |

**Not causal:** Auth Absolute/10; middleware `getClaims`; classic
`approval_requests` on this fixture (**0 rows** — classic-queue diet would be
a no-op).

**Tried and insufficient for the gate:**

1. Collapse 3 dashboard event-range queries → 1 (Run 2) — **keep**
2. Lean Attention counts (avoid rich-list fan-out) (Run 3) — **keep**
3. Defer Approvals terminal detail rows (~40% Approvals HTML) (Run 4) — **keep**

Run 4 cut Approvals HTML 218.5 → 130.6 KB and dropped Approvals from the top
hold-slow routes, but overall receiving/read p95 stayed ~flat vs Run 3 and
still far above Run 1’s already-failing baseline. Multi-route hold contention
(dashboard / calendar / events / event_detail) remains.

---

## Evidence pivot (fixture reality)

| Fact (school 1 / `arch100`) | Value |
|---|---|
| Classic approval_requests | 0 |
| CB2 approval_scheduling_items | 125 |
| campaign_builder_sessions | 0 |
| event_volunteer_sources | 0 |
| event_playbook_tasks | 0 |
| Approvals HTML (before deferral) | ~218.5 KB / 125 detail rows |
| Approvals HTML (after deferral) | ~130.6 KB / 50 detail rows |
| Dashboard HTML | ~146 KB |

Default dashboard Attention was materializing Volunteer Master + Task Hub +
classic queue solely for three counts that are mostly zero on this dataset.

---

## Where latency is introduced (ranked)

### 1. Concurrent RSC + shared backend contention — HIGH / HIGH

Hold-sustained, multi-route. Three app fixes did not clear the gate; Run 4
payload win did not move overall read p95. **Primary remaining lever:**
compute headroom (Micro → Small A/B).

### 2. Concurrent transfer of large HTML — HIGH / MEDIUM (partially addressed)

Receiving remains ~half+ of read p95. Approvals deferral delivered a real
local payload cut; residual receiving is spread across other hot routes.

### 3. Dashboard fan-out beyond Attention — MEDIUM / MEDIUM

Planning-raw / memory hints are light on this fixture. Lower priority than
infra A/B for *this* dataset.

### 4. Events GET workspace seed — MEDIUM / MEDIUM

Still a cheap win candidate; not yet validated under 75 VU.

### 5. Event-range collapse + Attention lean + Approvals defer — LOW alone / HIGH *done*

Keep all three. Insufficient for the gate.

---

## Ranked optimization opportunities

| Rank | Opportunity | Est. @75 VU | Complexity | Risk | When |
|---|---|---|---|---|---|
| 1 | Micro → Small staging A/B (same Preview code, identical 75-VU) | unknown waiting | Low ops | Low | **Next** |
| 2 | Events lean+skipSeed on GET | 0.05–0.2s events | Low | Low | Only if Small still fails |
| 3 | Approvals deferral (**done**, keep) | local HTML −40% | Med | Low | Kept |
| 4 | Attention lean (**done**, keep) | small / contention | Low | Low | Kept |
| 5 | Event-range collapse (**done**, keep) | ≤0.1–0.4s dash | Low | Low | Kept |

**Stop speculative app-side latency work** until the Micro→Small A/B answers
whether waiting tails are compute-bound.

---

## Recommended next engineering step

1. Run controlled **Micro → Small** A/B on staging with the identical 75-VU
   profile and current Preview code (including Approvals deferral).
2. Do **not** run further speculative query/payload refactors first.
3. Do **not** run 100 VU until 75 VU meets unchanged gates (preferably twice).
4. Do **not** change Auth Absolute/10 unless the A/B clearly implicates Auth.

## Re-validation / 100 VU

| Question | Answer |
|---|---|
| Another 75-VU? | **Yes** — as the Micro→Small A/B recorded run. |
| 100 VU meaningful? | **Only after** 75 VU clears unchanged gates cleanly. |
| Infra A/B justified now? | **Yes** — receiving-focused Approvals attempt done; gate still fails. |
| Keep Approvals deferral? | **Yes** — explicit, reversible, real payload win, no correctness hit. |
