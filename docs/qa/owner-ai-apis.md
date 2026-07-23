# QA — Owner AI & APIs

**Status:** Living  
**Owner:** Engineering / QA  
**Last updated:** July 23, 2026  
**Related:** [Product contract](../product/ai-and-apis.md) · [Feature list](../product/feature-list.md) · [Developer agreements / Owner ops](./developer-agreements.md) · [Pre-handoff readiness](./pre-handoff-readiness.md)

Pass/fail criteria for the Platform Owner **AI & APIs** page (`/ops/ai-apis`). Phase 0 locks access, honesty, and launch gates. Phase 2 fills the instrumentation trigger matrix below.

**Do not invite customer QA against this page until Phase 5 soak + reconciliation pass.**

---

## Preconditions

| Need | Detail |
|------|--------|
| Owner account | Email on `HEY_RALLI_OWNER_EMAILS` **and** org `campaign_role = admin` |
| Control account | Signed-in member **without** Owner gate (org Admin without allowlist, or allowlist without admin seat) |
| Instrumentation deploy | Phases 1–2 live in the environment under test; note **collecting since** date |
| Admin client | `SUPABASE_SERVICE_ROLE_KEY` configured so writers can insert |
| OpenAI dashboard access | Owner can compare a sample day of usage (Phase 5) |

---

## A — Access (must pass before any number QA)

| ID | Case | Pass |
|----|------|------|
| A1 | Owner opens `/ops/ai-apis` | Page loads; title/tabs visible |
| A2 | Owner opens `/ops` | Classic Ops still works (not removed) |
| A3 | Sidebar Owner group | **Ops** and **AI & APIs** both reachable; AI & APIs active on `/ops/ai-apis` |
| A4 | Non-owner opens `/ops/ai-apis` | Redirect to `/dashboard` (no data leak) |
| A5 | Org Admin, not on allowlist | Redirect to `/dashboard` |
| A6 | Allowlist email, not admin seat | Redirect to `/dashboard` |

---

## B — Honesty / empty states (must pass before customer QA)

| ID | Case | Pass |
|----|------|------|
| B1 | Date range with zero `ai_usage_log` rows | Empty copy; **no** demo KPIs, fake charts, or hardcoded costs |
| B2 | Connected provider with no writer / zero rows | “No data yet” or “Not instrumented yet” — **not** green “Operational” |
| B3 | Health labels | Only from real signals (e.g. Meta token/sync); never static success |
| B4 | Pre-instrumentation history | UI does not claim data before collecting-since date |

---

## C — AI APIs tab (after Phase 3 + data)

| ID | Case | Pass |
|----|------|------|
| C1 | Summary cards | Values match SQL aggregates for selected range (± rounding) |
| C2 | Compare-to previous | Deltas correct when both periods have data; sensible empty when prior is empty |
| C3 | Filters | Org / feature / model / provider / status / search narrow the table and cards consistently |
| C4 | Sort + pagination | Columns sort; page size stable; no full-table load hang on large ranges |
| C5 | Request drawer | Opens for a row; shows model, tokens/cost, status/error; **no** full prompt/completion body |
| C6 | CSV export | Respects filters and documented row cap |
| C7 | Tabs URL | `?tab=` (or equivalent) deep-link opens the correct tab |

---

## D — Connected APIs tab (after Phase 4 + data)

| ID | Case | Pass |
|----|------|------|
| D1 | Provider list | Meta, Resend, Google, Microsoft, SignupGenius, Stripe, Supabase listed |
| D2 | Instrumented provider with traffic | Counts / failures / latency / cost (if priced) match logs for range |
| D3 | Uninstrumented provider | Honest empty — not fake health (Microsoft, Stripe until wired) |
| D4 | Meta health | Reflects token/sync signals when available |
| D5 | API request drawer | Row detail for `api_usage_log` without secrets in UI |

---

## E — Instrumentation trigger matrix (Phase 2)

Verify rows in Supabase (`ai_usage_log` / `api_usage_log`) within ~1 minute of the trigger. Prefer service-role SQL or Owner page once Phase 3 ships.

### AI (`ai_usage_log` via `generateText` `usage` or artwork loggers)

| ID | Surface | Trigger | Expected `action_type` / `feature` | Verified |
|----|---------|---------|--------------------------------------|----------|
| E1 | Create with AI draft | Draft a communication | `draft_communication` / `create_with_ai_draft` | ☐ |
| E2 | Create with AI caption | Generate caption in Campaign Builder | `meta_social_caption` / `create_with_ai_caption` | ☐ |
| E3 | Artwork | Generate artwork concept | `generate_artwork` / `artwork` | ☐ |
| E4 | Event / creative brief | Generate event or creative brief | `generate_event_brief` or `generate_creative_brief` | ☐ |
| E5 | Ask Ralli | Ask a product / ops / org / insights / content question that hits AI | `ask_ralli` | ☐ |
| E6 | Inbox AI | Generate AI reply with sources | `inbox_ai` / `inbox_ai_reply` | ☐ |
| E7 | Calendar import | Parse ICS/text with AI | `calendar_import_parse` | ☐ |
| E8 | Tasks generate | AI task suggestions on an event | `tasks_generate` | ☐ |
| E9 | Playbook insights | Generate playbook insights | `playbook_insights` | ☐ |

### Connected APIs (`api_usage_log`)

| ID | Provider | Trigger | Expected `operation` (contains) | Verified |
|----|----------|---------|----------------------------------|----------|
| E10 | Meta | Publish / schedule / inbox Graph / insights sync | `GET` or `POST` Graph path | ☐ |
| E11 | Resend | Send any app email (invite, approval, etc.) | `email.send` or `email.send_template` | ☐ |
| E12 | Google | Sync Google Calendar | `calendar.events.list` | ☐ |
| E13 | SignupGenius | Connect/refresh public signup | `signup.read` | ☐ |
| E14 | Microsoft | — | Not instrumented (no live client) | n/a |
| E15 | Stripe | — | Not instrumented (billing deferred) | n/a |

**Writer entry points (eng):**

- AI text: [`src/lib/ai/provider.ts`](../../src/lib/ai/provider.ts) `generateText` + `usage` context on callers
- AI artwork: existing `logAiUsage` in artwork actions/orchestrator + inspiration analyze
- Meta: [`graph-api.ts`](../../src/lib/meta-publishing/graph-api.ts), [`insights-graph.ts`](../../src/lib/meta/insights-graph.ts), [`inbox/sync/graph-client.ts`](../../src/lib/inbox/sync/graph-client.ts)
- Resend: [`src/lib/email/send.ts`](../../src/lib/email/send.ts)
- Google: [`src/lib/google-calendar/api.ts`](../../src/lib/google-calendar/api.ts)
- SignupGenius: [`src/lib/event-volunteers/signupgenius-reader.ts`](../../src/lib/event-volunteers/signupgenius-reader.ts)

Do not mark Phase 5 complete while critical shipped AI surfaces (E1–E6 at minimum) are unchecked.

**Playwright smoke (artwork → warehouse):**  
`HEY_RALLI_SKIP_ARTWORK_GENERATION=false npm run test:hey-ralli -- tests/hey-ralli/smoke/20-owner-ai-apis-artwork-usage.spec.ts`  
Requires test user + `HEY_RALLI_TEST_EVENT_ID` + `SUPABASE_SERVICE_ROLE_KEY`. Asserts `ai_usage_log` increases after Create with AI artwork regenerate, then opens `/ops/ai-apis` when the user passes the Owner gate.

**One-time OpenAI history import (Owner monitoring):**  
1. Create an **Admin API key** with `api.usage.read` at [OpenAI Admin keys](https://platform.openai.com/settings/organization/admin-keys).  
2. Set `OPENAI_ADMIN_KEY` in `.env.local` and Vercel Production.  
3. Click **Import OpenAI history** on `/ops/ai-apis` (AI tab), or run `node --env-file=.env.local scripts/import-openai-usage-history.mjs`.  
4. Import covers up to 90 days **before** collecting-since (does not re-pull going forward). Rows use feature `openai_account_history`, attributed to **Edmondson Elementary**. **School B** stays listed at $0 until live app usage exists.

---

## F — Accuracy lock (Phase 5 — required before customer QA)

| ID | Case | Pass |
|----|------|------|
| F1 | Soak | Environment has instrumentation for the agreed window (or scripted smoke covering E-matrix) |
| F2 | Spot-check | Owner triggers Create with AI + Ask Ralli → rows appear within ~1 minute with correct org/user/feature |
| F3 | OpenAI reconcile | Sample calendar day: app `estimated_cost_usd` / tokens vs OpenAI usage dashboard within agreed tolerance |
| F4 | Performance | Owner date range ≤ 31 days loads without loading unbounded row sets into the browser |
| F5 | Privacy | DB sample has no full prompts/completions; export has no API keys |
| F6 | Feature list | Status moves to **shipped** only after F1–F5 |

### Tolerances & tooling (F3)

| Item | Value |
|------|--------|
| Token band | ±15% (`AI_APIS_RECONCILE_TOKEN_TOLERANCE_PCT`) |
| Cost band | ±25% (`AI_APIS_RECONCILE_COST_TOLERANCE_PCT`) — pricing lag / image units expected |
| Soak target | 3 calendar days (`AI_APIS_SOAK_DAYS_TARGET`) with real traffic, or E-matrix smoke |
| CLI | `npm run reconcile:ai-usage -- YYYY-MM-DD` (UTC day) → compare to OpenAI Usage |
| Unit tests | `npm run test:ops-usage` (includes Phase 5 privacy/perf/reconcile helpers) |

### Eng pre-checks (automated / static — July 23, 2026)

| Check | Result |
|-------|--------|
| Schema has no prompt/completion **body** columns | Pass (`prompt_tokens` / `completion_tokens` only) |
| Metadata scrub drops token/secret/api_key keys | Pass (`scrubApiUsageMetadata`) |
| Aggregate cap + page size bounded | Pass (8k / 25 / CSV 2k) |
| Access gate same as `/ops` | Pass (`canAccessOwnerOps`) |
| Warehouse row count on linked Supabase project | **0 AI / 0 API** — soak not started; F1–F3 Owner-owned |
| Critical writers present in code (E1–E13) | Pass (static); runtime E-matrix still ☐ until Owner triggers |

### Owner sign-off (do not mark feature-list **shipped** until complete)

| ID | Owner action | Date | Initials | Pass |
|----|--------------|------|----------|------|
| F1 | Confirm ≥ soak target **or** E-matrix smoke for E1–E6 + E10–E11 | | | ☐ |
| F2 | Create with AI + Ask Ralli → rows on `/ops/ai-apis` within ~1 min | | | ☐ |
| F3 | `npm run reconcile:ai-usage -- <day>` vs OpenAI Usage within bands | | | ☐ |
| A1–A6 | Access cases | | | ☐ |
| F6 | Flip feature-list to **shipped** only after all above | | | ☐ |

---

## Fail = do not launch to customer QA

- Any fabricated or demo KPI in Production
- Access leak (A4–A6 fail)
- Critical AI paths not writing logs (E-matrix incomplete for shipped AI surfaces)
- Cost/token cards disagree with underlying logs for the same filter
- Health shown as healthy with no backing signal

---

## Out of scope for this QA doc

- Member-facing Insights (Meta social)
- Billing / Stripe customer invoices
- Replacing classic `/ops` agreements workflow
