# Engineer commercial-readiness handoff

**Status:** Living  
**Owner:** Engineering / Product  
**Last updated:** August 13, 2026  
**Audience:** Short independent senior/staff review (target **10–15 hours**)  
**Related:** [Architecture](../engineering/architecture.md) · [Launch security assessment](../security/launch-security-assessment-2026-08.md) · [Production verification](../security/production-readiness-verification-2026-08.md) · [Audit remediation](../security/audit-remediation.md) · [Access control](../engineering/access-control.md) · [Multi-tenant isolation](../security/multi-tenant-isolation.md) · [Billing & access](./billing-and-access.md) · [Stripe](../engineering/stripe-integration.md) · [Cron jobs](./cron-jobs.md) · [Performance Phase 1](../qa/performance-engineering-phase1-complete.md) · [k6 findings](../qa/k6-load-test-findings.md)

This package exists so a hired engineer **does not reconstruct Hey Ralli from scratch** and **does not repeat completed security, RLS, billing, or load-test work**. Read this first, then the linked reports. Spot-check current code; do not re-audit closed findings unless production evidence contradicts them.

**Working-tree snapshot (13 Aug 2026, later same day):** uncommitted security fixes on `main` now also include assigned-only calendar DnD + campaign-file update/delete gates, plus `caption-approval-gate.test.ts`. They are **not in Production** until committed and deployed. Treat Production as the Aug 7–12 certified lineage plus later product/perf commits on `main`.

---

## 1. Product and architecture (5-minute brief)

Hey Ralli is a **calendar-first AI communications OS** for school PTO/PTA volunteers. Primary path: import school dates → generate creative (Social / Flyer / Homepage / Newsletter) → **human approve** → publish or schedule to Facebook/Instagram.

**Product rule:** AI drafts; humans approve; the UI is not an authorization boundary. If content requires approval, it must not be publishable or schedulable until approval is complete.

Pages stay thin. Reads: `src/lib/*/queries.ts`. Writes: `actions.ts` → `mutations.ts`. Almost all rows are **organization-scoped**. Membership + Postgres RLS isolate tenants; access templates (`EffectiveAccess`) are **app-layer** fine-grained permissions (not RLS keys).

Full layout and mermaid flows: [architecture.md](../engineering/architecture.md).

### Current production stack

| Layer | Choice |
|-------|--------|
| App | Next.js 15 App Router, React 19, TypeScript, Tailwind 4 |
| Auth / DB / Storage | Supabase (Auth, Postgres + RLS, Storage) |
| Hosting | Vercel Production `heyralli.com` · project `campignos/campaignos` |
| Billing | Stripe Checkout / Portal / signed webhooks |
| AI | OpenAI (text + images), credit RPCs in Postgres |
| Social | Meta Graph API (`src/lib/meta-publishing`, inbox, insights) |
| Calendar | Google Calendar OAuth + ICS subscribe |
| Email | Resend |
| Monitoring | Sentry |
| E2E / load | Playwright `tests/hey-ralli/smoke/` · k6 `load-tests/k6/` |

**Production (verified 7 Aug 2026):** Supabase `zyllfqieeihshnwpakiv` (us-east-1). Launch-hardening commit `b0438ea` is an ancestor of Production `main`. Details: [production-readiness-verification-2026-08.md](../security/production-readiness-verification-2026-08.md).

### Major workflows

| Workflow | Modules | Persistence |
|----------|---------|-------------|
| Calendar intake | `calendar-import`, `google-calendar` | `calendar_imports`, org Google connections, subscribe URL |
| Events / year calendar | `events`, `communications-calendar` | `events` via `school_years` (no `events.organization_id` column) |
| Create with AI — Social | `campaign-builder-v2`, `artwork-v2`, `meta-captions` | sessions + storage + `meta_publication_slots` |
| Flyer / Homepage / Newsletter | `flyer-composer`, `homepage-composer`, `newsletter` | durable rows + Approvals bridge |
| Approvals → Meta | `approvals-scheduling`, `meta-publishing` | `approval_scheduling_items`, slots; **Publish Now** hits Graph immediately; **Schedule** uses native FB feed schedule and/or `meta-publish` cron every ~20 min (cap **20 bundles/run**) |
| Inbox / Insights | `inbox`, `insights` | synced Meta entities |
| Billing / AI credits | `billing`, `ai/credits` | Stripe customer on org; atomic `ai_credit_*` RPCs |
| Access | `auth`, `access-templates`, `organization-workspace` | memberships + templates |

### Tenant model

| Guarantee | Behavior |
|-----------|----------|
| Tenant key | `organization_id` (events via `school_years.organization_id`) |
| Membership | `organization_users.status = active` |
| Active-org cookie | Never trusted alone; must match an active membership |
| RLS | Membership-scoped (`064`–`067`+); template keys are **not** in RLS |
| Storage | First path folder = org or event UUID; [storage-rls.md](../engineering/storage-rls.md) |
| Service role | Bypasses RLS. Required for cron. Must stay scoped in app code by org/event id. Shared helper: `createJobClient(useServiceRole)` in `src/lib/supabase/job-client.ts` |

### Infrastructure

- **Vercel Cron** is a **global** schedule (`vercel.json`), then jobs iterate orgs/connections. There is no per-org job queue today.
- **Supabase compute:** staging load work used **Medium** for a ~75 concurrent-reader ambition. Production should match if launch concurrency can approach tens of org-scoped dashboard readers. See [performance-engineering-phase1-complete.md](../qa/performance-engineering-phase1-complete.md).
- Capacity increases (Vercel function size, Supabase compute, Auth rate limits) are **not** application rearchitecture. Global cron fan-out and dual Meta publish paths **are** the items that could force design work later.

---

## 2. Completed work — do not repeat

Classification of **current evidence** (code + tests + Production verification). Uncommitted 13 Aug work is called out separately.

| Area | Class | Evidence |
|------|--------|----------|
| July 2026 security audit (25 findings) | **VALIDATED — do not repeat** | [audit-remediation.md](../security/audit-remediation.md) — all Critical/High/Medium/Low marked fixed |
| Launch hardening (SSRF, Stripe Reserve idempotency, cron auth, rate-limit fail-closed, CSRF, flyer Zod, CSP no `unsafe-eval`) | **VALIDATED — do not repeat** | [launch-security-assessment-2026-08.md](../security/launch-security-assessment-2026-08.md); `npm run test:security`; Production smokes 7 Aug |
| Core platform Production gate | **VALIDATED — do not repeat** | [production-readiness-verification-2026-08.md](../security/production-readiness-verification-2026-08.md) — **APPROVED FOR PRODUCTION** |
| Tenant isolation / RLS | **VALIDATED — do not repeat** | Migrations `064`–`067`; [multi-tenant-isolation.md](../security/multi-tenant-isolation.md); `membership-rls-phase-c.test.ts`, `storage-rls-phase-c3.test.ts` |
| IDOR / event access (`getEventById`, `requireEventAccess`, assigned-only Mode A/B) | **VALIDATED — do not repeat** (spot-check **new** surfaces only) | [access-control.md](../engineering/access-control.md); Playwright `08-assigned-event-access`; audit M1–M11; **uncommitted** calendar DnD + campaign-file update/delete now call `getEventById` |
| Authentication | **VALIDATED — do not repeat** | Supabase Auth + middleware gates; founding codes; password re-auth; session revoke **on deactivate** |
| Authorization / templates | **VALIDATED BUT SPOT-CHECK new actions** | `EffectiveAccess` + `requirePermission`; roster mutations gated `manage_people` in **uncommitted** tree |
| Service-role usage | **VALIDATED pattern; SPOT-CHECK new cron paths** | Known bug class: cookie client under cron = RLS no-op that looks healthy. Repair path for token-health **fixed**; story-kit **fixed in uncommitted tree**; approval **creation** under cron still open |
| Rate limiting | **VALIDATED** + **uncommitted** flyer/Giphy burst limits | `checkRateLimit` + `rate_limit_hit` RPC; fail-closed when admin configured |
| SSRF | **VALIDATED** calendar Production-path; **uncommitted** artwork-v2 orchestrator `safeFetch` | Calendar Refresh rejects private/loopback URLs. Save-time still allows storing those URLs (optional hardening) |
| Storage security | **VALIDATED for launch** | Storage RLS; private `school-media` + signed URLs for CB2 inspiration. Public buckets remain by design for AI art/logos. Historical public URLs residual |
| AI credit integrity | **VALIDATED — do not repeat** | Atomic `ai_credit_burn` / `ai_credit_ensure_period` / Reserve unique index — applied prod+staging |
| Stripe | **VALIDATED — do not repeat** | Signed webhooks; plan price IDs server-mapped; Reserve idempotency; [stripe-integration.md](../engineering/stripe-integration.md) |
| Email (Resend) | **VALIDATED for launch** | Transactional ledger + idempotency; newsletter `claim_newsletter_scheduled_send` |
| Cron auth | **VALIDATED — do not repeat** | Shared `isCronRequestAuthorized`; Production probes |
| Performance / query work | **VALIDATED characterization** | Phase 1 complete; later keeps: dashboard query collapse, Approvals org-scoped backfill (`46412001`), Meta/playbook N+1 removal, middleware membership snapshot |
| Load / concurrency | **VALIDATED — do not repeat the k6 program** | 100-school `arch100` fixture; 20/50 VU pass; 75 VU correctness pass, latency near-miss |
| Sentry | **VALIDATED enough for founding** | Wired; Report-a-Problem → `captureFeedback`. Ops runbook still thin ([sentry.md](./sentry.md)) |
| Automated tests | **VALIDATED suite exists** | `test:security`, `test:team-access`, `test:approvals-scheduling`, `test:meta-publishing`, `test:newsletter`, Playwright smokes |
| Deployment | **VALIDATED** | [deploy-and-rollback.md](./deploy-and-rollback.md); Git `main` → Vercel Production |

**Meta / Google:** classified **Operationally Ready but Pending Final Review** — not core-platform launch blockers. Do not treat as feature-complete. Meta App Review is an **external** calendar ([meta-app-review-use-cases.md](./meta-app-review-use-cases.md)).

---

## 3. Load-test results and validated capacity

Canonical: [performance-engineering-phase1-complete.md](../qa/performance-engineering-phase1-complete.md) · run log [k6-load-test-findings.md](../qa/k6-load-test-findings.md).

| What was measured | Result |
|-------------------|--------|
| Dataset | `arch100`: 120 orgs / 960 users / ~2.5k events (integrity 25/25) |
| Traffic | GET-only, pinned one session ↔ one VU, staging Preview, think time excluded |
| 20 VU | Pass (after Auth Absolute/10 remediation) |
| 50 VU | Pass · ordinary-read p95 **~1.38s** |
| 75 VU | Correctness **perfect**; `kind:read` p95 **1.55s** vs 1.5s gate (**near-miss FAIL**) |
| Auth failures 20→75 VU | **0** after remediation |
| Tenant isolation failures | **0** |
| 100 VU | **Explicitly not run** — no decision value until 75 clears |

**Do not re-run 100 VU or rebuild the k6 harness as part of this engagement.** Reopen performance only if production latency/correctness contradicts this envelope.

**Translation for school count (conservative):**

| Scale | Architecture fit |
|-------|------------------|
| Founding handful | Comfortable |
| ~25–50 schools | Existing model; watch cron backlog and compute, not schema |
| ~100 schools | **Data scale already exercised.** Concurrent **readers** ~50 is the last fully green latency point |
| ~250+ | Same app model can continue; **checkpoint** on cron fan-out, Meta publish backlog (20 bundles / 20 min), and whether Medium compute still holds. This is capacity/ops, not a rewrite — unless jobs stay global-sequential and due work exceeds the cap for hours |

Write/AI/Meta load was **not** characterized. Do not invent write-path capacity numbers.

---

## 4. Known open findings (verified against current tree, 13 Aug 2026)

Do not copy older reports blindly. Status below is **code-checked**.

### Uncommitted in working tree (land before treating as done)

| Item | What changed | Tests |
|------|----------------|-------|
| Caption/artwork last-mile before Graph | `publishMetaMilestoneBundle` requires caption `status === "approved"`; `bundleIsSchedulable` no longer treats draft preview text as schedulable | `caption-approval-gate.test.ts` |
| Bulk/retry Meta capacity | `assertMetaPostCapacityForEvent` on publish-all, retry/`publishMetaBundleAction` | `caption-approval-gate.test.ts` |
| Assignee approval bypass | `approveUnifiedItemAction` / `requestUnifiedChangesAction` require `approve_comms` **or** actual assignee match | `assignee-approval-gate.test.ts` |
| Roster `manage_people` | Workspace mutations go through `requireOrganizationIdWithManagePeople` | `manage-people-gate.test.ts` |
| Assigned-only calendar DnD | `reschedulePlanningItem` calls `getEventById` before mutate | Code in `planning-mutations.ts` |
| Campaign-file update/delete | `requireCampaignFileEventAccess` (file belongs to event + `getEventById`) | Code in `campaign-files/actions.ts` |
| Artwork SSRF | `artwork-v2/orchestrator.ts` `fetchImageAsDataUrl` → `safeFetch` + Supabase host allowlist | `orchestrator-ssrf.test.ts` |
| Story-kit cron | `sendStoryPostKitForMilestone({ useServiceRole: true })` | `send-story-post-kit-service-role.test.ts` |
| Flyer/Giphy burst limits | `checkRateLimit` on generate/search/trending | `expensive-route-rate-limits.test.ts` |

### Remaining issues

| Issue | Severity | Founding? | Commercial? | Scale | Product judgment? | Cursor? | Human? | Effort | Change risk |
|-------|----------|-----------|-------------|-------|-------------------|---------|--------|--------|-------------|
| **Native FB schedule still takes caption text without `status === "approved"`** (`native-schedule.ts`) | **High** | Yes if they Schedule to FB | Yes | Any Meta school | No — same product rule as Graph publish | **Yes** — mirror last-mile check | Spot-check dual-path | S | Medium (touches Graph schedule) |
| Cron `meta-publish` **does not** re-check monthly capacity | Medium | No (founding often exempt/unlimited) | Yes for Starter/Pro | Paying orgs hitting 10/40 posts | Mild: skip vs fail vs next run | Yes | Confirm product rule | S | Low |
| Token-health **creation** of missing approval rows still session-client **no-op** under cron | Medium | No — `/approvals` page backfill covers viewing org | Reliability | ~50+ orgs that don't open Approvals | No | Risky without design | **Yes — design** | M | Medium (bundle pipeline + `getEventById`) |
| Canceled-subscription lockout is **middleware/page only**, not per server action | Medium (defense-in-depth) | No if founding/exempt | Yes once paid cancel exists | Any paying org | **Yes** — wrap all actions vs high-risk subset | After decision | **Yes — design** | M | Medium (blast radius of wrapper) |
| `updateOrganizationProfileAction` has membership only, **no** `manage_people` | Low–Med | Unlikely | Yes if restricted seats edit school name/timezone | Any | Mild — other org-structure writes already use `manage_people` | **Yes** | No | S | Low |
| Password change does not revoke **other** sessions | Low | No | Nice-to-have | Any | Mild | **Yes** | No | S | Low |
| Upload size/MIME uneven (calendar import no size cap; several paths trust `file.type`) | Low–Med | Low | Yes as abuse/cost | Growth | Magic-byte sniffing = later | Size caps **yes**; magic bytes **wait** | No | S–M | Low |
| Calendar subscribe: private URLs **savable**; SSRF blocked on Refresh | Low | No | No | Any | No | Optional | No | S | Low |
| `insights-sync` not in `vercel.json` (route exists; service-role slot linking fixed Aug 13) | Low while unscheduled | No | Manual Refresh / optional schedule | All connected orgs sequentially | Keep unscheduled until you want background refresh | Optional schedule after smoke | Review before enabling | S | Low if left unscheduled |
| Graph `fetch` has **no timeout / 5xx retry** | Medium reliability | Rare | More Meta volume | ~50+ publishing orgs | Retry policy | After a short design note | **Yes — policy** | M | Medium (duplicate posts) |
| Cron routes have **no `maxDuration`** | Medium ops | No | Hang/timeout at backlog | ~100+ | No | **Yes** (set conservatively) | Confirm limits | S | Low |
| Legacy `status === "uploaded"` still counts as approved artwork in one helper | Low | Unlikely (legacy studio stubbed) | Low | Any leftover rows | Confirm ignore vs block | Yes if still reachable | No | S | Low |
| Historical public media URLs / public AI buckets | Accepted residual | No | Enterprise/RFP later | Any | No | No | No | L | High (URL rewrite) |
| CSP `unsafe-inline` | Accepted | No | Enterprise later | Any | No | No | No | L | High |
| Storage GB / history plan rows **not enforced** | Deferred | No | Honesty in marketing | ~50+ heavy Files | **Yes** if sold as a hard limit | After decision | No | L | Medium |
| 75 VU ~53ms over 1.5s; composer Lighthouse 88 | Roadmap | No | Monitor | Tens of concurrent readers | No | Later | No | M | Medium |
| External pen test | Recommended ≤30 days after open enrollment | No | Before enterprise claims | — | Vendor choice | No | Separate engagement | — | — |

**Ruled out / not a rebuild:** sharding, per-org Vercel crons, rewriting RLS into permission-key policies, Next 16/sharp solely for audit greens, 100 VU, write-path k6, nonce CSP, migrating all public buckets to signed URLs.

---

## 5. “Future rebuild” risks

Question: would today’s design force a **substantial rewrite** at 25 / 50 / 100 / 250 schools?

| Concern | Verdict |
|---------|---------|
| **Multi-tenancy** | New orgs are rows. No structural change to add schools. |
| **Database** | Org-scoped tables + `school_years` → events is stable. Indexes/RLS already used at 100-school fixture. Watch query shapes (`approval_scheduling_items` is a large share of DB time with ~100% cache hit). Not a rewrite. |
| **AuthZ** | Templates + membership scale. Do **not** push template keys into RLS. |
| **Billing** | One Stripe customer per org; entitlements in app. Storage limits not modeled — product/honesty issue, not a billing-platform rewrite. |
| **Storage** | Org/event path prefixes scale. Public vs private is a **product/security** choice, not a capacity wall. |
| **Background work** | **The real scale risk.** Global crons + 20-bundle Meta cap + sequential org loops. At ~100–250 *active publishers* this becomes ops-dangerous (delayed posts, Vercel timeouts) **without a job queue**. That is an additive worker/queue, not a product rebuild. |
| **AI** | Per-org credits + rate limits. Cost is OpenAI bill, not architecture. |
| **Meta** | Per-org OAuth connections. Dual path (native Graph schedule vs CampignOS cron) is the **correctness** risk, not school count. |
| **Email/newsletters** | Atomic claim RPC + production send gate. Volume is Resend/plan, not a redesign. Keep `NEWSLETTER_PRODUCTION_SEND_ENABLED` fail-closed until intended. |
| **Events/calendar/approvals** | Approvals page backfill was **scoped to the viewing org** (`46412001`) after a production 600s+ unscoped sweep. That class of “loop every event the session can see” is the anti-pattern to keep hunting. |
| **Infra vs rewrite** | Raise Supabase/Vercel tier to buy 25→100. Rewrite only if you need durable per-org job isolation or a second Meta publish architecture. |

**Checkpoint (not rebuild) at ~100 schools or when cron backlog / p95 dashboard reads degrade in production.**

---

## 6. Exact files worth reviewing

**Orientation (do not rewrite):**

- `src/middleware.ts` → `src/lib/supabase/middleware.ts`, `src/lib/auth/org-gate.ts`
- `src/lib/access-templates/effective-access.ts`, `src/lib/events/queries.ts` (`getEventById` / `requireEventAccess`)
- `src/lib/supabase/job-client.ts`, `src/lib/supabase/admin.ts`
- `src/lib/ai/credits.ts` + `ai_credit_*` migrations
- `src/lib/billing/stripe-sync.ts`, `src/app/api/stripe/webhook/route.ts`, `src/lib/billing/subscription-lockout.ts`

**Highest-value remaining review:**

- `src/lib/meta-publishing/publish-milestone.ts` (last-mile caption/artwork)
- `src/lib/meta-publishing/native-schedule.ts` (**residual caption status**)
- `src/lib/meta-publishing/actions.ts` (capacity gates; `bundleIsSchedulable`)
- `src/lib/meta-publishing/bundle-display.ts`, `bundles.ts`
- `src/lib/meta-publishing/publish-due.ts` + `src/app/api/cron/meta-publish/route.ts`
- `src/app/api/cron/meta-token-health/route.ts` + `src/lib/event-workspace/meta-approval-sync.ts` (creation still session-scoped)
- `src/lib/approvals-scheduling/actions.ts` (assignee gate — uncommitted)
- `src/lib/organizations/profile-actions.ts` (no `manage_people`)
- `src/lib/communications-calendar/planning-mutations.ts` (DnD now gated — spot-check)
- `src/lib/campaign-files/actions.ts` (update/delete now gated — spot-check)
- `src/app/api/cron/insights-sync/route.ts` + `src/lib/meta/insights-sync.ts` (service-role slot linking fixed; still **do not schedule** in `vercel.json` until you want org-wide background refresh — App Review can use interactive Refresh)

**Tests to run, not rewrite:**

```bash
npm run test:security
npm run test:team-access
npm run test:approvals-scheduling
npm run test:meta-publishing
npm run test:newsletter
```

Playwright (credentials in `.env.local`, not git): `07-upload-artwork-gate`, `08-assigned-event-access`, `09-artwork-generation-approval`, `16-launch-smoke`, `21-ai-credits-billing-phases`, `24-newsletter-approval-send`.

---

## 7. Architectural questions for the human (not Cursor)

1. **Dual Meta publish path.** CampignOS Graph publish now (uncommitted) requires approved captions. Native FB `scheduled_publish_time` still schedules from caption **text**. Should native schedule fail closed the same way? (Recommended: **yes**.)
2. **Canceled orgs.** Keep middleware-only lockout (documented), or add a shared server-action wrapper? Recommended: wrapper on **mutating** actions before commercial paid cancel is common; not a founding blocker.
3. **Cron approval creation.** Elevate the missing-request *creation* sweep with service role, or accept “fixed when someone opens `/approvals`”? At 50+ quiet orgs this becomes a support issue.
4. **Graph retry.** Timeouts yes; automatic retry on publish **no** without idempotency keys (duplicate posts).
5. **When to add a job queue.** Not at founding. Trigger: Meta due backlog exceeding 20 bundles for multiple consecutive cron runs, or cron durations approaching Vercel limits.

---

## 8. DO NOT PAY THE ENGINEER TO REDO THIS

| Already validated | Evidence |
|-------------------|----------|
| July 2026 25-finding audit | [audit-remediation.md](../security/audit-remediation.md) — all rows ✅ |
| Launch SSRF / CSRF / cron / rate-limit / CSP / flyer Zod | [launch-security-assessment-2026-08.md](../security/launch-security-assessment-2026-08.md); `src/lib/security/__tests__/*`; `npm run test:security` |
| Core platform Production approval | [production-readiness-verification-2026-08.md](../security/production-readiness-verification-2026-08.md) including calendar SSRF Refresh path |
| Membership RLS + Storage RLS | Migrations `064`–`067`; `membership-rls-phase-c.test.ts`; `storage-rls-phase-c3.test.ts` |
| IDOR / assigned-only page loads | `getEventById` / `requireEventAccess`; Playwright `08-assigned-event-access`; audit M1–M11 |
| AI credit lost-update / TOCTOU | Atomic `ai_credit_*` RPCs applied prod+staging |
| Stripe webhooks + Reserve idempotency | `constructEvent`; unique partial index; [stripe-integration.md](../engineering/stripe-integration.md) |
| k6 100-school / 20–75 VU program | [performance-engineering-phase1-complete.md](../qa/performance-engineering-phase1-complete.md) — do **not** re-run 100 VU |
| OWASP ZAP soft-launch | [owasp-zap.md](../security/owasp-zap.md) — not a substitute for a later pen test |

Also do not: rewrite RLS into permission-key policies; shard Postgres; migrate all public buckets; nonce CSP; storage GB gates; Next 16/sharp solely for `npm audit`; Meta App Review paperwork; deferred product (Gmail, SignUpGenius OAuth, Tasks Calendar/Timeline).

---

## 9. Current production risks (honest)

| Risk | Notes |
|------|--------|
| Uncommitted security WIP not deployed | Caption last-mile, assignee gate, bulk capacity, story-kit cron, artwork SSRF, roster gates, calendar DnD + file update/delete — **Production lacks these until merge** |
| Native-schedule caption residual | Even after WIP, FB native schedule can still send unapproved caption **text** |
| Meta/Google “pending final review” | Do not market as certified. Founding can use tester/dev roles or skip Meta |
| Service-role cron footguns | Cookie client + cron = silent zero-row success. Pattern is documented; creation path still open |
| Public historical media | Pre-`school-media` objects remain fetchable by URL |
| Compute | Prefer **Medium** if concurrent org-scoped readers can approach ~50–75 |

---

## 10. Recommended human-review priorities (10–15 hours)

**15 hours is enough** if this package is the starting point. **10 hours is enough** if the engineer trusts closed audits and only spot-checks plus the five questions in §7. More time is **not** required now; a later checkpoint is.

| Block | Hours | What to do |
|-------|------:|------------|
| Architecture orientation / evidence review | **1.5–2** | This doc + architecture.md + launch assessment §1–6. Do not re-read every k6 run report. |
| Security / tenant isolation **spot-check** | **2.5–3** | New surfaces only: newsletter org-scoped RLS, flyers, Events workspace `?event=`, uncommitted assignee/roster gates. Sample 3 mutating actions for `requireEventAccess` / `requirePermission`. |
| Unresolved architectural findings | **3–4** | Dual Meta publish path, cron service-role creation, canceled-lockout wrapper design. Produce a written recommend/defer for each. |
| Database / scale | **1.5–2** | Confirm org-scoped indexes and that hub queries are tenant-bounded. Do not redesign schema. Answer: “at what metric do we add a queue?” |
| Background jobs / integrations | **2** | `vercel.json` crons, `createJobClient` usage, Meta 20-bundle cap, newsletter claim RPC, “do not schedule insights-sync yet.” |
| Final recommendations / roadmap | **1–1.5** | Founding vs commercial vs 100-school checkpoint. Explicit do-not-build list. |

**Required now (this engagement):** items in the table above.

**Wait until revenue/growth:** pen test vendor, 75 VU dashboard lean, job queue implementation, storage quotas, CSP nonce, public-bucket migration.

---

## 11. Cursor vs human vs wait

### Cursor can safely complete before / during handoff

Contained, testable, low-risk (do these rather than paying the engineer to discover them):

1. Commit + deploy the 13 Aug uncommitted security set (caption tests already exist).
2. Native-schedule caption approval (same product rule as Graph publish).
3. Capacity check on cron `publish-due` **or** document that cron may complete already-scheduled Starter/Pro posts (product rule).
4. `manage_people` on `updateOrganizationProfileAction`.
5. Password-change `revokeUserSessions` (other sessions).
6. Calendar-import upload size cap; cron `maxDuration` on heavy routes.
7. Optional: reject private subscribe URLs at **save** time.

### Human engineer should review

Dual Meta publish correctness, cron elevation design for approval **creation**, canceled-org defense-in-depth, Graph retry/idempotency policy, “when to add a queue,” spot-check of **new** tenant surfaces. Not a greenfield architecture.

### Wait until growth justifies it

Job queue, 100 VU, write-path load, storage quotas, nonce CSP, historical media migration, npm breaking upgrades, sharding, per-org workers.

---

## 12. Founding vs commercial (short)

**Founding schools:** **YES WITH SPECIFIC FIXES** — land/deploy the uncommitted security WIP; if they will Schedule to Facebook, close native-schedule caption approval. Do not block on pen test, 75 VU, storage quotas, or Meta App Review **if** they can operate as Meta testers or without live Page publish.

**Commercial marketing / paying schools beyond founding:** land WIP; close native-schedule residual; decide canceled-org wrapper; do not market Meta as certified until App Review; keep insights-sync unscheduled; monitor Medium compute and cron backlog.

---

## Doc map for the engineer

| Need | Open |
|------|------|
| How the app is structured | [architecture.md](../engineering/architecture.md) |
| Images / buckets | [image-architecture.md](../engineering/image-architecture.md) · [storage-rls.md](../engineering/storage-rls.md) |
| Permissions history | [access-control.md](../engineering/access-control.md) |
| Closed security findings | [audit-remediation.md](../security/audit-remediation.md) |
| Core launch certification | [launch-security-assessment-2026-08.md](../security/launch-security-assessment-2026-08.md) |
| Production evidence | [production-readiness-verification-2026-08.md](../security/production-readiness-verification-2026-08.md) |
| Plans / credits / gaps | [billing-and-access.md](./billing-and-access.md) §11–12 |
| Crons | [cron-jobs.md](./cron-jobs.md) |
| Newsletter send/idempotency | [newsletter-composer.md](../engineering/newsletter-composer.md) |
| Load envelope | [performance-engineering-phase1-complete.md](../qa/performance-engineering-phase1-complete.md) |
| Feature shipped/deferred | [feature-list.md](../product/feature-list.md) |
| Archive (ignore as truth) | [docs/archive/](../archive/README.md) |
