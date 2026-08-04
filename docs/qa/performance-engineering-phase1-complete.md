# Performance Engineering Phase 1 — Complete

**Status:** **COMPLETE** — closed August 4, 2026  
**Next program phase:** Security & Production Readiness  
**Reopen only if:** production evidence shows latency/correctness regressions under real concurrency that contradict this envelope  
**Owner:** Engineering / QA  
**Canonical run log:** [k6-load-test-findings.md](./k6-load-test-findings.md) · [75-VU RCA](./100-school-75vu-latency-rca.md)

This document is the Phase 1 handoff. It summarizes the investigation from
first principles, freezes accepted conclusions, and states what remains
hypothesis or future work.

---

## Executive summary

Performance Engineering Phase 1 validated Hey Ralli’s **multi-tenant read
capacity** on isolated staging (`heyralli-staging`) using GET-only k6 against
Vercel Previews pinned to staging Supabase. Correctness (tenant isolation,
auth, checks, unexpected 4xx/5xx, dropped iterations) stayed **perfect** from
20 VU through 75 VU. Latency was the binding constraint.

**Accepted operating envelope (final measured):**

| Concurrent pinned owners | Ordinary-read p95 | Verdict |
|---|---:|---|
| 20 VU (100-school) | well under 1.5s (post–auth remediation) | **Pass** |
| 50 VU (100-school, Micro-era app path) | **~1.38s** | **Pass** (tight) |
| 75 VU on **Medium** + kept app fixes | **1.55s** | **Near-miss FAIL** (~53ms over 1.5s); route gates pass |

**Infrastructure ladder (same workload discipline):** Micro was under-provisioned
for 75 VU; **Small** removed much amplification (−0.80s vs same-app Micro);
**Medium** removed most of the rest (−0.91s vs same-app Small) and is the
accepted staging / preferred production compute tier for a ~75-VU ambition.

**Application work:** several correctness-preserving keeps (dashboard query
collapse, Attention lean counts, Approvals terminal deferral, Event Detail
Approvals client-load). None alone cleared the 75-VU 1.5s gate; Event Detail
client-load was a strong *local* win with weak aggregate impact.

**Launch posture:** ship with **Medium** if ~75 concurrent org-scoped readers
matter; treat 50 VU as the last fully green latency point; do **not** loosen
thresholds or Auth Absolute/10. Phase 1 does **not** require a 100-VU run
(see recommendation below).

**Handoff:** Performance Engineering Phase 1 is complete. Transition to
**Security & Production Readiness**. Post-launch performance work is a
roadmap item, not a Phase 1 blocker.

---

## Detailed technical report

### 1. Methodology (validated)

| Control | Practice |
|---|---|
| Target | Staging only (`heyralli-staging` / `hdoujyngcqrsgtvqehyt`); production blocked |
| App surface | One-off Vercel Preview with staging Supabase build/runtime overrides (not shared Preview env) |
| Auth to Preview | Deployment-protection bypass JWT (`VERCEL_JWT`); never disable team SSO |
| Sessions | API-minted Supabase cookies; **pinned** one session ↔ one VU; remint before recorded runs |
| Traffic | Weighted GET-only workflows; think time excluded from route latency |
| Hard gates | 0 tenant/auth failures; 100% checks; 0 unexpected 401/403/429/500; dropped=0; `kind:read` p95 **&lt;1.5s**; dashboard/calendar/events_list p95 **&lt;2.0s** |
| Discipline | Preflight → discardable warm-up → recorded run → integrity; one intentional variable per experiment |
| Non-goals | No AI/Meta/email/Stripe writes; no threshold loosening to force green; no production deploy |

**Fact:** `next dev` produced false-positive tenant-isolation failures; only
`next start` / Preview timings are authoritative.

### 2. Datasets

| Dataset | Scale | Role |
|---|---|---|
| First 20 schools | 20 orgs · 160 users · seeded events/approvals/inbox | Early smoke → headroom ladder |
| **arch100** (100-school architecture) | 120 orgs · 960 users · ~2.5k events · milestones · integrity 25/25 | Authoritative data-scale envelope |

Idle/post-seed baselines (Nano → Micro) confirmed dataset stability across
compute upgrades (row counts unchanged).

### 3. Workload evolution

1. **20-school suite** — smoke → light-peak (15 VU) → launch-spike (30 VU) → headroom (50 VU); all passed on Preview.  
2. **100-school / 20 VU** — architecture validation; Run 1 hit Auth rate limits; Run 2 passed after remediation.  
3. **100-school / 50 VU** — passed ~1.38s read p95 (reproduced).  
4. **100-school / 75 VU** — first **latency boundary** with perfect correctness; remediation + infra A/Bs through Run 7.

### 4. Auth remediation (validated)

**Symptom:** 100-school / 20-VU Run 1 — Auth rate-limit / session failures under concurrency.  
**Cause class:** hot-path `getClaims` / Auth pressure, not product RLS.  
**Fix:** Auth Absolute/10 allocation + application remediation documented in
[100-school-20vu-auth-rate-limit-remediation.md](./100-school-20vu-auth-rate-limit-remediation.md).  
**Fact:** After remediation, auth failures stayed **0** through 75 VU. Auth was
ruled **non-causal** for the later 75-VU latency miss.

### 5. Infrastructure A/Bs (Micro → Small → Medium)

All A/Bs used identical Preview/app, fixture, workload, thresholds, Auth, and
pinned-session strategy.

| Step | Ordinary-read p95 | Wait / recv p95 | Hold >3s | Conclusion |
|---|---:|---:|---:|---|
| Micro (75 VU R1 / R4) | 2.77–3.35s | dual high | 134–343 | Under-provisioned for hold |
| **Small** (R5 vs R4 same app) | **2.55s** (−0.80s) | −0.37 / −0.37s | 71 (−79%) | Large infra win; keep |
| Small + ED Approvals client (R6) | 2.46s | ~flat wait / −0.16 recv | 55 | App local win |
| **Medium** (R7 vs R6 same app) | **1.55s** (−0.91s) | −0.46 / −0.50s | 48 | Material boundary shift; near-clear |

**Conclusion:** 75-VU latency was a **dual wait+receiving** problem **amplified
by insufficient compute**. Medium is the accepted tier for this ambition.
Further Large is not the Phase 1 next step (~53ms miss after Medium).

### 6. Application optimizations attempted

| Change | Run | Aggregate gate impact | Disposition |
|---|---|---|---|
| Dashboard event-range query collapse | R2 | Insufficient (tails noisier) | **Keep** (correct; less wasted work) |
| Lean Attention counts | R3 | Insufficient | **Keep** |
| Org Approvals defer terminal detail rows | R4 | ~40% Approvals HTML; weak aggregate | **Keep** |
| Event Detail Approvals client-load (no SSR stream) | R6 | `event_detail` −0.56s; aggregate −0.10s | **Keep** |

### 7. Accepted improvements

- Auth Absolute/10 + getClaims remediation (correctness at scale)  
- Small then **Medium** compute on staging for 75-VU work  
- All four app keeps above  
- Methodology: Preview + pinned sessions + hold-slow tracking + integrity gates  

### 8. Rejected hypotheses

| Hypothesis | Evidence against |
|---|---|
| “Auth Absolute/10 is causing 75-VU latency” | 0 auth failures; Absolute/10 unchanged across latency A/Bs |
| “Database-only / waiting-only bottleneck” | Receiving ≈ half of read p95; both move together on compute A/Bs |
| “One more Event Detail Approvals SSR tweak clears the gate” | R6: local win, aggregate −96ms |
| “Classic Approvals queue is the arch100 payload” | 0 classic `approval_requests`; CB2 scheduling dominates |
| “Micro or Small is enough for 75 VU + 1.5s” | Measured fail / near-miss only after Medium |
| “Loosen thresholds to declare pass” | Explicitly rejected; gates unchanged |

### 9. Final measured operating envelope

**Correctness (20→75 VU, arch100, Medium + kept app):**  
0 tenant isolation · 0 auth · 100% checks · 0 unexpected 401/403/429/500 ·
0 dropped · integrity 25/25 post-run.

**Latency (authoritative final pair — same app):**

| Metric | 50 VU (pass) | 75 VU Medium R7 |
|---|---:|---:|
| `kind:read` p95 | ~1.38s | **1.55s** |
| wait / recv p95 | ~0.59 / 0.90s (50-VU era) | **0.73 / 0.90s** |
| dashboard / calendar / events_list | under 2s | **1.91 / 1.58 / 1.63s** (pass &lt;2s) |
| event_detail p95 | — | **1.36s** |

**HTML probes (school 1, Run 6-era app on Medium path):** dashboard ~143 KB,
calendar ~119 KB, approvals hub ~131 KB, event detail ~72 KB (Approvals not
SSR-streamed).

### 10. Remaining known limitations

- 75 VU ordinary-read gate still **fails by ~53ms** on Medium.  
- Playwright ≤2s wall-clock budget not re-verified on production for concurrent criteria.  
- Suite is **read-only** — no write/AI/Meta/email load characterization.  
- Org-switch slice largely unexercised (few multi-org seeded users).  
- Hold `>3s` / `>5s` tails still exist on Medium (compressed, not eliminated).  
- Query Performance still shows high-frequency `approval_scheduling_items`
  PostgREST shapes as a large share of DB time (cache hit ~100%).  
- Single-run near-miss; no Medium re-validation series (unlike 50 VU ×2).

### 11. Launch recommendations

1. **Do not** treat 75 VU as a green latency pass.  
2. **Do** treat correctness at 75 VU as validated.  
3. Prefer **Medium** compute for production if launch traffic can approach tens
   of concurrent org-scoped dashboard readers.  
4. Keep Auth Absolute/10; do not loosen k6 thresholds for marketing green.  
5. Production deploy of performance app keeps should follow normal release
   process (out of Phase 1 scope here).  
6. Close Phase 1; prioritize Security & Production Readiness.

### 12. Recommended compute tiers

| Environment | Tier | Rationale |
|---|---|---|
| **Staging** | **Medium** (4 GB / 2-core) | Matches final A/B envelope; required to reproduce 75-VU near-miss honestly |
| **Production** | **Medium** preferred for ~75-VU ambition; Small only if launch concurrency is confidently ≤50 VU class | Small fails / far-fails 75-VU 1.5s gate with current app |

### 13. Post-launch optimization roadmap (future work — not Phase 1)

Ordered for expected value after Security handoff:

1. **Dashboard (then calendar) HTML/query lean** under Medium, identical 75-VU — chase the ~53ms miss.  
2. Re-validate 75 VU on Medium (prefer 2× for stability like 50 VU).  
3. Optional: Approvals scheduling query shape / call-frequency review (DB time share).  
4. Only then consider Large compute A/B if still short after one app cut.  
5. Optional exploratory **100 VU after** 75 clears (see §15).  
6. Write-path / AI / Meta load profiles — separate program.  
7. Production Playwright ≤2s concurrent re-baseline.

### 14. Classification of claims

#### Validated facts

- Correctness holds 20→75 VU on arch100 with pinned sessions.  
- 50 VU passes ordinary-read ~1.38s.  
- 75 VU is the first sustained latency boundary.  
- Dual wait+recv; compute A/Bs move both.  
- Medium lands at 1.55s read p95; only `kind:read` fails; route gates pass.  
- Auth Absolute/10 not causal for 75-VU latency.  
- Listed app keeps are product-correct; none alone cleared 75 on Micro/Small.

#### Engineering conclusions

- Phase 1 is **complete** for launch-capacity *characterization*.  
- **Medium** is the recommended staging and preferred production tier for the
  studied ambition.  
- Remaining gap is **thin** and best attacked with **one hub app cut**, not
  another compute jump or 100 VU.  
- Transition to Security & Production Readiness is appropriate.

#### Remaining hypotheses (unproven)

- A single dashboard lean under Medium will clear 1.5s at 75 VU.  
- Clearing 75 VU will leave meaningful headroom at 100 VU.  
- Production traffic shape matches the k6 GET mix closely enough that Medium
  margins transfer 1:1.  
- Large would buy more than the next app cut for the last ~53ms.

#### Future work

- Items in §13; Security & Production Readiness program; production monitoring
  that could reopen Phase 1 if contradicted.

---

## 15. 100-VU assessment (Phase 1 close)

**Recommendation: do not run 100 VU** as part of Phase 1 closure or the
immediate Security handoff.

| Option | Decision |
|---|---|
| Do not run 100 VU | **Selected** |
| Run 100 VU as exploratory characterization only | Not now |
| Run 100 VU after future application improvements | Deferred option (see below) |

**Justification**

1. **No unanswered Phase 1 question.** We already know: correctness scales;
   latency fails between 50 (pass) and 75 (near-miss); Medium is required;
   residual is dual wait+recv led by dashboard-class hubs.  
2. **100 VU cannot invent a pass** below a failed/near-failed 75-VU gate.  
3. **Cost without decision value** — another long staging soak would not change
   compute-tier or handoff recommendations.  
4. **Next evidence that matters** is whether a dashboard lean clears ~53ms at
   **75 VU**, not how badly 100 VU fails.

**When 100 VU would become useful later**

After a Medium + app change that **clears or tightly bounds** 75 VU, an
exploratory 100-VU run could answer a *new* question:

> Does clearing the 75-VU 1.5s gate also provide headroom at 100 concurrent
> pinned owners, or does a new cliff appear immediately above 75?

That question is **not** answered today and is **not** required to close
Phase 1.

---

## 16. Document index (Phase 1)

| Doc | Role |
|---|---|
| **This file** | Phase complete + handoff |
| [k6-load-test-findings.md](./k6-load-test-findings.md) | Chronological run log |
| [100-school-75vu-latency-rca.md](./100-school-75vu-latency-rca.md) | 75-VU root-cause living summary |
| [performance-budget.md](./performance-budget.md) | Budgets + multi-tenant envelope pointer |
| Run reports R1–R7 | `100-school-*-data-scale-*.md` |
| [100-school-20vu-auth-rate-limit-remediation.md](./100-school-20vu-auth-rate-limit-remediation.md) | Auth fix |
| [load-tests/k6/README.md](../../load-tests/k6/README.md) | How to run |

---

## 17. Phase gate checklist

- [x] Methodology frozen and documented  
- [x] Datasets and integrity baselines recorded  
- [x] Auth remediation validated  
- [x] Infra A/Bs Micro → Small → Medium completed  
- [x] App keeps accepted; rejected hypotheses listed  
- [x] Operating envelope stated  
- [x] Launch + compute-tier recommendations stated  
- [x] 100 VU decision recorded (**do not run** for Phase 1)  
- [x] Ready to transition to **Security & Production Readiness**  
- [x] Reopen criterion stated (production evidence only)
