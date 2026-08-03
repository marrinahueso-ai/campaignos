# 100-school / 20-VU data-scale — Run 2 (auth remediation validation)

**Status:** **PASSED** — remediation confirmed. Safe to continue the remaining
100-school load-test sequence.
**Date:** August 3, 2026
**Run ID:** `100school-20vu-run2-20260803-2056`
**Related:** [Run 1](./100-school-20vu-data-scale-run1.md) ·
[Auth remediation](./100-school-20vu-auth-rate-limit-remediation.md)

---

## 1. Executive summary

Run 2 re-executed the identical 100-school / 20-VU data-scale profile against a
**new** staging-pinned Vercel Preview that includes the `getClaims()` auth-path
fix (`85caa0e`). Auth allocation was left at **Absolute / 10** so the code
change was the only meaningful variable.

**Result:** all hard gates passed (`K6_EXIT_CODE=0`). Auth failures dropped
from 48 real events (Run 1) to **0**. Zero Auth `429 over_request_rate_limit`
events on this deployment during the run. Tenant isolation stayed at 0.
Latency improved across the board (overall p95 1.19s → 1.02s; max 32.4s →
3.56s). Dataset/storage drift: none.

**Remediation is confirmed.** Ordinary authenticated page loads no longer
depend on `GET /auth/v1/user` in middleware/RSC, and valid users are not
redirected to `/login` under sustained 20-VU load.

---

## 2. Deployment and code state

| Item | Value |
|---|---|
| Commit tested | `85caa0e` — `fix(auth): use getClaims in middleware to stop Auth /user rate limits` |
| Preview URL | `https://campaignos-p2ltky8cr-campignos.vercel.app` |
| Deployment ID | `dpl_D5348dMfdWTs3rCFmtBHtL8s9zdn` |
| Supabase target | `heyralli-staging` (`hdoujyngcqrsgtvqehyt`) — confirmed inlined in `/login` HTML; production ref absent |
| Deploy method | One-off `vercel deploy --build-env/--env` for staging URL + anon key only (not persisted to project Preview settings) |
| Auth allocation during run | **Unchanged** — Absolute, max **10**/60 |
| Auth rate limits during run | Unchanged |

### Implementation verification (pre-deploy)

| Check | Result |
|---|---|
| Middleware uses `auth.getClaims()` | Yes — `src/lib/supabase/middleware.ts` |
| RSC `getAuthUser` uses `getClaims()` | Yes — `src/lib/auth/queries.ts` |
| Sensitive paths still call `getUser()` | Yes — billing/account/ops/ralli-assistant actions, auth callback, account-queries |
| Staging JWKS | ES256, 1 key (`/.well-known/jwks.json`) |

---

## 3. Preflight and manual validation

| Step | Result |
|---|---|
| Reminted 800 sessions (`mintedAt` 2026-08-03T20:53:12Z) | Pass |
| Manual: 20/20 pinned owners → `/dashboard` 200, own org present, no foreign leak | Pass |
| Manual route smoke (VU01): dashboard/calendar/events/approvals/comms/settings/branding | All 200 |
| Full 100-school preflight | **19/19 PASS** |
| Post-preflight remint of 20 pinned owners (heal RLS `signOut` of s001-owner) | Done |
| Re-verify 20/20 after remint | Pass |
| Pre-run DB snapshot | Saved (`pre-run2`) |

**Departure from naive “preflight then immediately k6”:** after the full
preflight (required), the 20 pinned owner sessions were reminted before k6.
Evidence: `validate-architecture-seed` signs out `s001-owner` during the RLS
negative check (Run 1 Finding F1). Reminting only the pinned owners keeps the
run trustworthy without changing the profile. Validated by a second 20/20
live auth check before launch.

---

## 4. K6 results (Run 2)

| Metric | Run 2 | Gate | Result |
|---|---:|---|---|
| HTTP requests | 4,360 | — | — |
| Completed iterations | 1,381 | — | — |
| Dropped iterations | 0 | `count==0` | **PASS** |
| Checks | **100.00%** (24,800 / 0) | `rate==1` | **PASS** |
| HTTP failure rate | 0.00% | `rate==0` | **PASS** |
| Auth failures | **0** | `count==0` | **PASS** |
| Tenant-isolation failures | 0 | `count==0` | **PASS** |
| Unexpected 401 / 403 / 429 / 500 | 0 / 0 / 0 / 0 | `count==0` | **PASS** |
| `kind:read` p95 | **1.02s** | `<1.5s` | **PASS** |
| `dashboard` p95 | **1.16s** | `<2s` | **PASS** |
| `calendar` p95 | **994.9ms** | `<2s` | **PASS** |
| `events_list` p95 | **925.6ms** | `<2s` | **PASS** |
| Duration | 28m18.1s | — | completed |
| k6 exit | **0** | — | **PASS** |

### Overall latency

| | p50 | p90 | p95 | p99 | max |
|---|---:|---:|---:|---:|---:|
| `http_req_duration` | 643ms | 905ms | **1.02s** | 1.27s | **3.56s** |

### Route-level p95 (selected)

| Route | p95 | max |
|---|---:|---:|
| dashboard | 1.16s | 2.69s |
| calendar | 995ms | 1.36s |
| events_list | 926ms | 1.68s |
| event_detail | 1.10s | 3.56s |
| approvals | 900ms | 1.09s |
| communications | 791ms | 3.07s |
| branding | 1.09s | 1.78s |
| cross_tenant | 700ms | 3.39s |

Slow requests: `slow_req_over_3s = 2` (0.05%); no >5s / >10s counters reported.

---

## 5. Comparison with Run 1

| Metric | Run 1 (pre-fix) | Run 2 (getClaims) | Δ |
|---|---:|---:|---:|
| Auth failures (real) | 48 | **0** | −100% |
| Checks | 99.79% | **100%** | fixed |
| Tenant isolation | 0 | 0 | same |
| Unexpected 4xx/5xx | 0 | 0 | same |
| HTTP failures | 0% | 0% | same |
| Dropped iterations | 0 | 0 | same |
| `kind:read` p95 | 1.19s | **1.02s** | −14% |
| `dashboard` p95 | 1.41s | **1.16s** | −18% |
| `calendar` p95 | 1.29s | **995ms** | −23% |
| `events_list` p95 | 1.15s | **926ms** | −19% |
| Overall max | 32.38s | **3.56s** | −89% |
| `slow_req_over_3s` | 39 | **2** | −95% |
| Auth 429s (Vercel, run window) | ~48 | **0** | eliminated |
| k6 exit | 99 | **0** | pass |

Workload, thresholds, fixture shape, VU pinning, and Auth Absolute/10 were the
same. The only intentional product change between the deployments is the
auth-path remediation.

---

## 6. Auth `/user` traffic and 429 evidence

| Observation | Method | Result |
|---|---|---|
| Auth `over_request_rate_limit` on Run 2 deployment | Vercel `get_runtime_logs` query over 20:56–21:25Z | **0 logs** |
| `AuthApiError` on Run 2 deployment | same | **0 logs** |
| HTTP status breakdown (deployment) | `group_by: statusCode` | **200 × 4360** (matches k6 `http_reqs`) |
| Middleware still executes | `group_by: source` | middleware ≈ 4367 (expected — gate still runs) |
| Ordinary page identity no longer uses `/user` | code review of deployed commit | middleware + `getAuthUser` → `getClaims()`; JWKS ES256 local verify |
| Sensitive `getUser()` retained | grep of `src/` | billing/account/ops/assistant actions + auth callback unchanged |

**Conclusion:** `/auth/v1/user` traffic from ordinary authenticated page loads
was materially eliminated by design; the empirical proof under load is the
disappearance of Auth 429s and auth-failure redirects that dominated Run 1’s
final ~2 minutes.

**Near-expiry refresh under load:** not exercised in this run. Sessions were
minted ~3 minutes before launch; JWT TTL is 3600s; the run lasted ~28 minutes,
so tokens never entered the ~90s refresh margin. The SDK path remains:
`getClaims()` → `getSession()` → refresh when near expiry, with cookie write
via middleware `setAll`. Recommend a dedicated short soak or artificially
near-expiry fixture before relying on refresh-at-scale claims.

---

## 7. Post-run recovery

| Check | Result |
|---|---|
| 20 pinned sessions still authenticate | **20/20** |
| Integrity | **25/25 PASS** |
| DB/storage snapshot vs pre-run2 | Identical except `capturedAt` |
| Lingering Auth 429s after ramp-down | None observed |
| Pre-existing staging noise | `[ai-credits]/[billing] Invalid API key` still present (unrelated; pages still 200) |

---

## 8. Verdict and next steps

| Question | Answer |
|---|---|
| Remediaton confirmed? | **Yes** |
| Safe to continue 100-school sequence? | **Yes** |
| Change Auth Absolute → Percentage now? | **Not required for this fix**, but still recommended as capacity hygiene before higher-VU / longer soaks so Auth DB connections scale with compute. Do not treat it as a substitute for the code fix. |

### Follow-up recommendations (do not apply yet unless approved)

1. Flip Auth → Performance → Allocation **Absolute → Percentage** on
   `heyralli-staging` before any 50-VU+ 100-school profile.
2. Fix preflight RLS check so it does not `signOut` a pinned load-test owner
   (test-harness Finding F1).
3. Fix k6 `auth_failures` double-count (observability Finding F2) before
   interpreting non-zero counts in future runs.
4. Optional: dedicated near-expiry refresh validation once (short script or
   soak that forces the 90s margin).

---

## 9. Artifacts / commands

**Artifacts**

- `load-tests/k6/results/data-scale-100school-20vu-run2-console.log`
- `load-tests/k6/results/data-scale-100school-20vu-100school-20vu-run2-20260803-2056-summary.json`
- `load-tests/k6/results/data-scale-100school-20vu-summary.json` (rolling)
- gitignored snapshots: `pre-run2` / `post-run2`

**Commands (sanitized)**

```bash
# Deploy (staging overrides, one-off)
npx vercel deploy \
  --build-env NEXT_PUBLIC_SUPABASE_URL=… \
  --build-env NEXT_PUBLIC_SUPABASE_ANON_KEY=… \
  --env NEXT_PUBLIC_SUPABASE_URL=… \
  --env NEXT_PUBLIC_SUPABASE_ANON_KEY=… \
  --yes

# Mint + preflight + heal pinned owners + run
SEED_PROFILE=100-school-architecture TEST_RUN_ID=arch100 npm run test:load:mint-sessions:100-schools
BASE_URL=… VERCEL_JWT=… TEST_RUN_ID=arch100 npm run test:load:preflight:100-schools
# remint schools 1–20 owners (post-preflight)
BASE_URL=… K6_SESSIONS_FILE=../data/sessions.100-school-architecture.local.json \
  TEST_RUN_ID=100school-20vu-run2-20260803-2056 VERCEL_JWT=… \
  npm run test:load:data-scale:100school:20vu
```

**Confirmation:** no Auth allocation/rate-limit/compute/dataset/workload/
threshold/RLS/index/cache/production changes were made for this validation.
