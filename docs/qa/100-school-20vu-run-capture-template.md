# 100-school / 20-VU data-scale run capture — template

**Status:** Template — fill in during/after Run 1. Leave any field blank if
the value was not available at capture time; do not fabricate values.
**Related:** [100-school / 20-VU design](./100-school-20vu-data-scale-design.md) ·
[Micro idle baseline](./100-school-micro-idle-baseline.md) ·
[k6 findings log](./k6-load-test-findings.md)

Copy this file (or this section) per run — e.g.
`100-school-20vu-run1-capture.md` — rather than editing this template in
place.

## Run identification

| Field | Value |
|---|---|
| `TEST_RUN_ID` | |
| Date/time (UTC) | |
| Operator | |
| `BASE_URL` (Vercel preview) | |
| Supabase project | `heyralli-staging` (`hdoujyngcqrsgtvqehyt`) |
| Compute tier at time of run | Micro |
| Session fixture minted at | |
| k6 version | |
| Profile file / git commit | `load-tests/k6/data-scale-100school-20vu.js` @ |

## Checkpoint 1 — before load (T-0, immediately before `k6 run`)

| Metric | Value |
|---|---|
| Supabase CPU utilization | |
| Supabase memory utilization | |
| Supabase active connections / max | |
| Supabase disk IO utilization | |
| Vercel function invocations (last 5 min) | |
| Vercel function error rate | |
| Vercel function p50/p95 duration | |
| Sentry error count (last 5 min, staging) | |
| Notable open Sentry issues | |
| Database query observations (slow query log, if any) | |

## Checkpoint 2 — during peak hold (mid-way through the 20-minute hold at 20 VUs)

| Metric | Value |
|---|---|
| Wall-clock time into hold | |
| Supabase CPU utilization | |
| Supabase memory utilization | |
| Supabase active connections / max | |
| Supabase disk IO utilization | |
| Vercel function invocations (concurrent/last 5 min) | |
| Vercel function error rate | |
| Vercel function p50/p95 duration | |
| Vercel function concurrency / cold starts | |
| Sentry error count (last 5 min, staging) | |
| Notable new Sentry issues since checkpoint 1 | |
| Top slow SQL queries (Supabase → Database → Query Performance) | |
| Top most-executed SQL queries | |
| k6 live summary: `checks` rate | |
| k6 live summary: `http_req_failed` rate | |
| k6 live summary: `tenant_isolation_failures` / `auth_failures` count | |
| k6 live summary: `unexpected_401`/`403`/`429`/`500` counts | |

## Checkpoint 3 — five minutes after ramp-down completes

| Metric | Value |
|---|---|
| Supabase CPU utilization | |
| Supabase memory utilization | |
| Supabase active connections / max | |
| Supabase disk IO utilization | |
| Connections returned to baseline? (Y/N) | |
| Vercel function error rate (last 5 min) | |
| Sentry error count (last 5 min, staging) | |
| Any lingering elevated error rate or latency? | |
| Database query observations | |

## Final k6 result summary

| Metric | Value | Threshold | Pass? |
|---|---:|---|---|
| Total iterations | | — | |
| Total requests | | — | |
| `checks` rate | | `rate==1` | |
| `http_req_failed` rate | | `rate==0` | |
| `tenant_isolation_failures` | | `count==0` | |
| `auth_failures` | | `count==0` | |
| `unexpected_401` | | `count==0` | |
| `unexpected_403` | | `count==0` | |
| `unexpected_429` | | `count==0` | |
| `unexpected_500` | | `count==0` | |
| `dropped_iterations` | | `count==0` | |
| `http_req_duration{kind:read}` p95 | | `<1500ms` | |
| `http_req_duration{route:dashboard}` p95 | | `<2000ms` | |
| `http_req_duration{route:calendar}` p95 | | `<2000ms` | |
| `http_req_duration{route:events_list}` p95 | | `<2000ms` | |
| `workflow_duration_ms` p95 (informational) | | — | — |

## Comparison against Micro idle baseline

Compare against
[`docs/qa/100-school-micro-idle-baseline.md`](./100-school-micro-idle-baseline.md):

| Metric | Idle (baseline) | Peak hold (this run) | Δ |
|---|---:|---:|---:|
| CPU utilization | 44% | | |
| Memory utilization | 39% | | |
| Active connections | 14 / 60 | | |
| Disk IO utilization | 1% | | |

## Dataset drift check (post-run)

Re-run `npm run test:load:validate:100-schools` after the test and confirm
row counts / integrity are unchanged (this profile issues **no writes**, so
any drift here would indicate an unexpected side effect and must be
investigated before any further testing):

| Check | Result |
|---|---|
| All 25 integrity checks pass | |
| Row counts unchanged from pre-run snapshot | |

## Narrative summary

_(Fill in after the run: overall verdict, any surprises, whether the
architecture shows headroom or strain at 100-school scale, and a go/no-go
recommendation for the next step — e.g. a higher-VU 100-school profile or a
longer soak.)_
