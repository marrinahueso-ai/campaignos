# 100-school / 75-VU latency — root-cause analysis

**Status:** Dual bottleneck confirmed and **partially infrastructure-amplified**.
Three app fixes + **Micro→Small** A/B: Small moved read p95 by ~0.8s and cut
hold `>3s` ~79% versus same-app Micro, but the **1.5s ordinary-read gate still
fails** (2.55s). Residual is still wait + receiving under concurrent RSC.
**Date:** August 4, 2026
**Baseline:** [75-VU Run 1](./100-school-75vu-data-scale-run1.md)
**Attempts:** [Run 2](./100-school-75vu-data-scale-run2-rca.md) ·
[Run 3](./100-school-75vu-data-scale-run3-attn.md) ·
[Run 4](./100-school-75vu-data-scale-run4-defer.md) ·
[Run 5 Small A/B](./100-school-75vu-data-scale-run5-small-ab.md)

---

## Root cause summary

At 75 concurrent pinned owners, latency rises from concurrent RSC **waiting**
and **receiving**. On Micro, that dual pattern was heavily amplified (hold
`>3s` hundreds). On Small (same Preview/app), both phases improve ~equally and
hold tails collapse — proving Micro was under-provisioned for this hold — while
residual p95 still misses the gate by ~1s.

| Phase (k6 p95) | 50-VU | R1 Micro | R4 Micro (same app) | **R5 Small (same app)** |
|---|---:|---:|---:|---:|
| waiting | 594ms | 1,215ms | 1,513ms | **1,144ms** |
| receiving | 900ms | 1,732ms | 1,934ms | **1,562ms** |
| `kind:read` | 1,376ms | 2,766ms | 3,353ms | **2,554ms** |
| Hold >3s | 1 | 134 | 343 | **71** |

**Tried (keep all):**

1. Dashboard event-range collapse (Run 2)
2. Lean Attention counts (Run 3)
3. Approvals terminal deferral (Run 4) — ~40% Approvals HTML
4. **Micro → Small compute** (Run 5) — primary latency mover vs same app

---

## Evidence pivot

| Fact | Value |
|---|---|
| Classic approval_requests (school 1) | 0 |
| CB2 scheduling items (school 1) | 125 |
| Approvals HTML after deferral | ~130.6 KB / 50 detail rows |
| Compute during R1–R4 | Micro (1 GB / 2-core) |
| Compute during R5 | **Small (2 GB / 2-core)** verified |
| Auth allocation | Absolute/10 unchanged |

---

## Where latency is introduced (ranked, post–Small)

### 1. Residual concurrent RSC + HTML transfer — HIGH / HIGH

Even on Small: wait p95 1.14s + recv p95 1.56s. Hot routes remain
dashboard / calendar / events / event_detail. App-side payload/route work is
still justified for the remaining ~1s gate miss.

### 2. Compute headroom — HIGH / **partially addressed**

Micro→Small proved infra amplification. Keep Small. Further Medium A/B is
optional to bound remaining infra headroom.

### 3. Prior app remediations — keep / insufficient alone

Query collapse, Attention lean, Approvals deferral remain product-correct
cleanups; they did not clear the gate on Micro.

---

## Ranked next opportunities

| Rank | Opportunity | When |
|---|---|---|
| 1 | Targeted app receiving/TTFB work on remaining hot routes (dashboard / calendar / event_detail) **or** Small→Medium A/B | Next (pick one) |
| 2 | Keep Small on staging | Done |
| 3 | Approvals deferral / Attention lean / query collapse | Kept |
| 4 | 100 VU | Only after 75 gate clears, or exploratory discovery |

---

## Recommended next engineering step

1. **Keep Small** on staging.
2. Do **not** loosen the 1.5s gate; do **not** change Auth Absolute/10; do
   **not** deploy production.
3. Choose **one** next experiment:
   - **App:** one hot-route payload/TTFB change under Small (now quieter hold).
   - **Infra:** Small→Medium A/B with identical Preview if you need to know how
     much more compute can buy.
4. Treat **100 VU** as optional discovery only until 75 clears unchanged gates.

## Re-validation / 100 VU

| Question | Answer |
|---|---|
| Keep Small? | **Yes** |
| 75 VU stable for gate? | **No** (2.55s read p95) — correctness yes |
| 100 VU reasonable? | Exploratory only; not a pass candidate yet |
| Primary remaining lever? | Mixed — residual dual wait/recv; prefer one focused app or Medium A/B |
