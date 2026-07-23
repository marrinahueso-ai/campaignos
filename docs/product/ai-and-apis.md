# AI & APIs (Owner)

**Status:** Living  
**Owner:** Product / Engineering  
**Last updated:** July 23, 2026  
**Related:** [Feature list](./feature-list.md) · [Access & onboarding](../security/access-and-onboarding.md) · [QA: Owner AI & APIs](../qa/owner-ai-apis.md) · [Owner Ops](../engineering/developer-agreements.md)

Platform Owner page for monitoring **AI usage**, **connected API usage**, **operating costs**, and **customer consumption**. Internal ops only — not org-member Insights.

**Implementation status:** Phases 0–5 eng complete. UI + warehouse + reconcile CLI/tests ship. Feature-list stays **partial** until Owner completes QA § F sign-off (soak + OpenAI reconcile). Production warehouse was empty as of Phase 5 lock (collecting since 2026-07-23).

---

## Audience & access

| Rule | Detail |
|------|--------|
| Who | Platform Owner only |
| Gate | Same as Owner Ops: `canAccessOwnerOps()` — email on `HEY_RALLI_OWNER_EMAILS` (fallback `REPORT_A_PROBLEM_OWNER_EMAILS`) **and** active membership `campaign_role = admin` |
| Non-owners | Redirect to `/dashboard` (no soft “hidden” empty page) |
| Org Admin alone | **Not** enough |
| Allowlist without Admin seat | **Not** enough |

---

## Navigation & IA

| Surface | Detail |
|---------|--------|
| Route | `/ops/ai-apis` |
| Sidebar | Expandable **Owner** group (visible when `showOwnerOps`): **Ops** → `/ops`, **AI & APIs** → `/ops/ai-apis` |
| Existing Ops | Keep `/ops` (metrics, Developers signed, agreements). Do **not** replace it in v1 |
| Future | This hub may absorb classic Ops metrics later; out of scope until AI & APIs numbers are trusted |

Do not redesign global layout or primary member navigation.

---

## Tabs

| Tab | Focus |
|-----|--------|
| **AI APIs** | AI requests, models, tokens, costs, latency, failures, usage by organization and user |
| **Connected APIs** | Integrations (Meta, Resend, Google, Microsoft, SignupGenius, Stripe, Supabase): request counts, health, failures, latency, estimated operating costs |

Tab state: URL query preferred (e.g. `?tab=ai` / `?tab=connected`) so links and QA deep-links are stable.

---

## AI APIs tab — v1 contract

### Summary cards

| Card | Meaning |
|------|---------|
| AI Requests | Count of logged AI calls in range |
| Total AI Cost | Sum of `estimated_cost_usd` in range |
| Total Tokens | Sum of `total_tokens` (nulls excluded from sum; images may omit tokens) |
| Success Rate | `success` true / all requests in range |
| Avg. Response Time | Mean `latency_ms` |
| Failed Requests | Count where `success` is false |
| Orgs Near Limit | Orgs over a **documented stub threshold** (config constant; not billed plan limits until billing ships) |
| Est. Monthly Cost | Projection from current-period run rate (formula documented in eng when implemented) |

Compare-to previous period (delta %) is in scope for v1 when both ranges have data.

### Charts (v1)

- AI requests over time (this period vs previous)
- Requests by feature (distribution)
- AI cost by organization (ranked)

### Table & drawer

- Searchable, sortable, paginated request table
- Columns (v1): date/time, organization, user, feature, model, tokens, cost, status, response time, actions
- Row opens **Request details** drawer: identity, model/provider/environment, token/cost breakdown, status/error (truncated). **Do not** store or show full prompts/completions in v1
- Export: CSV of filtered set with a documented row cap (not unbounded)

### Filters (v1)

Date range, compare-to, search (org, user, feature, model, request id), organization, feature, model, provider, status. “Save view” / “More filters” deferred.

---

## Connected APIs tab — v1 contract

### Providers in scope

Meta · Resend · Google · Microsoft · SignupGenius · Stripe · Supabase

| Provider | Volume source | Health source (examples) |
|----------|---------------|---------------------------|
| Meta | `api_usage_log` when instrumented | Token expiry, last insights/publish sync |
| Resend | `api_usage_log` from send paths | Configured + send success/fail |
| Google | Calendar (and related) sync callers | Last sync / error |
| Microsoft | Only if wired; else empty | Same |
| SignupGenius | Import/scrape paths | Last import outcome |
| Stripe | Only when real calls exist | Empty until billing ships |
| Supabase | **Not** every DB query — connection/config or selected admin ops only | Config / no fake green |

### Metrics per provider (v1)

Request counts, successes/failures, latency (avg or p50/p95 when volume allows), estimated operating cost where a rate is defined, health label from **real signals only**.

---

## Accuracy rules (non-negotiable)

1. **No fabricated KPIs.** Never hardcode “Operational”, sample charts, or demo costs in production Owner UI.
2. **Empty is honest.** If there are no rows in range, show empty state: “No usage recorded in this range” and, when known, “Collecting since {instrumentation_start_date}”.
3. **Not instrumented yet.** Providers or features without writers show “No data yet” / “Not instrumented yet” — not green health.
4. **No historical backfill claim.** Pre-instrumentation traffic cannot be reconstructed from `activity_log` / console. Numbers are valid **from instrumentation deploy forward**.
5. **Privacy.** Warehouse stores metadata and usage units, not full prompt/completion bodies or secrets.
6. **Admin client only.** Aggregates and tables use the same Owner/admin data path pattern as `/ops` (not member RLS).

---

## Data foundations

| Artifact | Status | Purpose |
|----------|--------|---------|
| `ai_usage_log` | **Phase 1 shipped** (migration `20260723220241_ai_api_usage_logs.sql`) | Durable AI request rows (org, user, feature, model, tokens, cost, latency, success) |
| `api_usage_log` | **Phase 1 shipped** | Durable connected-API request rows |
| Pricing config | **Phase 1 shipped** — [`src/lib/ops/ai-pricing.ts`](../../src/lib/ops/ai-pricing.ts) (`AI_PRICING_VERSION`) | Per-model / unit `$` for `estimated_cost_usd` |
| `logAiUsage` / `generateText.usage` | **Phase 2** | Text AI via provider boundary; Ask Ralli, Inbox, calendar, tasks, playbook covered |
| `logApiUsage` | **Phase 2** | Meta Graph (publish/insights/inbox), Resend send, Google Calendar list, SignupGenius read |
| Microsoft / Stripe | Empty until wired | Honest “not instrumented” on Connected tab |

**Access:** RLS enabled, no JWT policies; `anon`/`authenticated` revoked; service role only (`createAdminClient`).

**Apply migration** before relying on Production numbers: `supabase db push` (or SQL Editor) for `20260723220241_ai_api_usage_logs.sql`.

UI is **Phase 3–4 shipped** (AI + Connected tabs). Phase 5 tooling: Owner accuracy strip on `/ops/ai-apis`, `npm run reconcile:ai-usage`, tolerances in [`ai-apis-constants.ts`](../../src/lib/ops/ai-apis-constants.ts), tests via `npm run test:ops-usage`. Customer QA on numbers still requires Owner § F sign-off in [owner-ai-apis.md](../qa/owner-ai-apis.md).

---

## Explicit non-goals (v1)

- Replacing `/ops` Developers signed / agreements workflow
- Multi-LLM gateway routing UI
- Storing full AI prompts/completions
- Charging or invoicing customers from this page
- Saved filter views
- Pixel-perfect parity with every exploratory mock control

---

## Launch readiness (definition of done for “accurate enough for QA”)

See [QA: Owner AI & APIs](../qa/owner-ai-apis.md). Summary:

- Access gate pass/fail
- Instrumentation coverage matrix green for AI + priority connected APIs
- Empty states correct when no data
- Spot-check: trigger features → rows appear with plausible cost/tokens
- Manual reconcile sample day vs OpenAI usage dashboard (Owner checklist)
- No fake health / demo numbers in Production
