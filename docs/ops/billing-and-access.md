# Billing, access & AI credits

**Status:** Living  
**Owner:** Product  
**Last updated:** July 26, 2026  
**Related:** [Ops](./README.md) · [Stripe integration (eng)](../engineering/stripe-integration.md) · [AI and APIs](../product/ai-and-apis.md) · [Feature list](../product/feature-list.md) · [Env & secrets](./env-and-secrets.md) · [Documentation home](../README.md)

## Purpose

Single source of truth for how orgs get access to Hey Ralli and how AI credits/billing work commercially: founding codes, invites, `billing_exempt_at`, the 14-day trial, Stripe Checkout/Portal/webhooks, the plan/credits/Reserve matrix, and which plan gates are actually enforced in code today.

**UI plan copy:** [`src/lib/billing/plan-catalog.ts`](../../src/lib/billing/plan-catalog.ts).  
**Entitlements / capacity:** [`src/lib/billing/entitlements.ts`](../../src/lib/billing/entitlements.ts) + [`gates.ts`](../../src/lib/billing/gates.ts).  
**Settings UI:** `/settings/billing-plan` — Ease soft pills (`?view=usage|plans|payment`; legacy `?tab=` still accepted); old per-page routes (`manage-plan`, `upgrade-downgrade`, `payment-method`, `billing-history`, `cancel-plan`) redirect to the matching view. [`BillingPlanContent.tsx`](../../src/components/settings-v2/BillingPlanContent.tsx) / [`SettingsEaseBilling.tsx`](../../src/components/settings-v2/SettingsEaseBilling.tsx) (dense [`BillingPlanPanels.tsx`](../../src/components/settings-v2/BillingPlanPanels.tsx) kept for reference). Usage shows **Period snapshot** meters (AI credits · Reserve · seats · Meta posts) with a **Buy more Reserve** CTA into the Reserve SKU grid, plus capacity limits and category breakdown. Founding / `billing_exempt_at` orgs keep unlimited credits and waived billing copy, but the plan catalog and manage CTAs (Change plan, View invoices, Buy Reserve, Update card, Stripe portal) stay visible — `billing_exempt` is an entitlement flag, not a UI permission. Also:

- **Usage by member** — ranks org members by AI credits burned this period (credit-weighted, not raw action count, so one 8-credit artwork generation outranks eight 1-credit text actions), clearly flagging the top user. Rows with no attributed `user_id` (historical data — see caveat below) roll up under "Unknown member." Admin-client-backed, org-scoped, and only runs after `assertActiveMembershipInOrganization` confirms the caller belongs to the org — see [`usage-breakdown.ts`](../../src/lib/ai/usage-breakdown.ts) (pure aggregation math in [`usage-breakdown-pure.ts`](../../src/lib/ai/usage-breakdown-pure.ts), unit-tested independent of the DB).
- **Usage by category** — every `action_type` this period, bucketed into the friendly categories in the credit weight map below (`generate_artwork`/`orchestrate_artwork` further split into "Artwork Generation" vs. "Artwork Regeneration" via `ai_usage_log.metadata.isRegeneration`), each with a count and credits-burned total. All categories always render (0 if unused) so the list reads as the complete map of "everywhere Hey Ralli calls OpenAI," not just whatever fired this period.
- **Recent activity** — `organization_ai_credit_ledger` rows (member-readable via RLS), one line per entry: badge, date, acting member, category, and (for artwork rows) the event + milestone it was generated for, plus the signed credit amount — enriched via an admin-client join to `ai_usage_log` (by `ai_usage_log_id`) and `events`, gated the same way as the breakdowns above. Queried/enriched in [`credit-ledger.ts`](../../src/lib/ai/credit-ledger.ts).

**Data-completeness caveat:** `user_id` attribution and `metadata` (regeneration flag, milestone label) on artwork actions (`generate_artwork` / `orchestrate_artwork`) only exist for rows logged *after* this attribution work shipped. Historical rows have `user_id = null` and `metadata = {}`, so they show as "Unknown member," always classify as "Artwork Generation" (never "Regeneration"), and carry no milestone — expected, not a bug.

**Billing History tab** lists the org's real Stripe invoices (date, amount, status, "View invoice" / "Download PDF" links to Stripe-hosted URLs), server-fetched via `stripe.invoices.list` in [`stripe-invoices.ts`](../../src/lib/billing/stripe-invoices.ts) (pure mapping in [`stripe-invoices-pure.ts`](../../src/lib/billing/stripe-invoices-pure.ts), unit-tested independent of Stripe) and only queried once the org has a `stripe_customer_id`; the Stripe Customer Portal button remains below the list as the "manage everything in Stripe" fallback. Stripe API failures return `[]` (logged server-side) rather than breaking the page.

All commercial amounts below are **config-driven** and can change later without schema rewrites.

---

## 1) Plans at a glance (locked pricing)

| Plan | Price | AI credits / mo | Role |
|------|------:|----------------:|------|
| Starter | $49 | 400 | Limited school year |
| Professional | $79 | 1,200 | Run the school (snug) |
| Premium ⭐ | $129 | 2,500 + included $250 Reserve/yr | Recommended destination |
| Trial | — | **600** (14-day pool) | Pro features while active |
| Founding / exempt | — | Unlimited | `billing_exempt_at` set |

---

## 2) How credits work

| Item | Value |
|------|------:|
| Artwork image gen | **8 credits** |
| Text AI (caption, Ask Ralli, inbox, tasks, calendar parse, insights, briefs) | **1 credit** |
| Failed AI / non-AI APIs | **0** |
| OpenAI $ per credit (campaign-blended) | **~$0.01** |
| Full 7-milestone campaign | **~119 credits** · **~$1.20** |
| 2-milestone reminder | **~34 credits** · **~$0.34** |

Burn order: **period allowance → Reserve**. **AI Reserve** is a prepaid bucket that **rolls over** and **stacks**, unlike monthly plan credits which reset 1st of month UTC with **no rollover**.

Founding / `billing_exempt_at` → **unlimited** credits (usage still logged, no burn).

---

## 3) Trial (locked)

| | Rule |
|--|------|
| Length | **14 days free** |
| Entitlements | Professional features during trial |
| Trial AI budget | **600 credits** total for the window |
| Artwork caps | Same as Starter |
| After day 14 | Choose Starter / Professional / Premium |

**Stripe:** First Checkout on an eligible org sends `subscription_data.trial_period_days` (remaining app-trial days, or 14). Webhooks sync `subscription_status=trialing` and `trial_ends_at` from Stripe `trial_end`. Card is collected up front; billing starts when the trial ends. Expired app trials and orgs that already had a Stripe subscription skip the free trial.

---

## 4) Member billing journeys

1. **Founding / invite** — Valid founding code → waived billing + unlimited AI credits.
2. **Trial** — New non-exempt org starts `plan_tier=trial`, `trial_ends_at` +14d, 600-credit pool, Professional entitlements. After expiry without Checkout → Starter entitlements until they subscribe (no second free trial). This "never subscribed" org keeps normal app access forever on Starter — it is **not** locked out (see #5).
3. **Paid** — Stripe Checkout (plans + Reserve) → webhook updates `organizations.plan_tier` / `subscription_status` / `trial_ends_at` / subscription ids; Customer Portal for card / invoices / cancel.
4. **Soft warn → hard block** — Soft warn when low; AI generation refuses when period + Reserve cannot cover the action cost (founding / exempt unlimited).
5. **Actually canceled → full lockout** — When Stripe fires `customer.subscription.deleted` for an org that had a real subscription, the webhook sets `subscription_status="canceled"` (see #3). Unlike the old "graceful downgrade to Starter," every member of that org is now redirected to `/billing/canceled` for **every** app route/dashboard page until the org resubscribes — regardless of role (this is org-level, not permission-level: any member may resubscribe). That page offers Checkout (any paid plan), the Stripe Customer Portal, and sign-out; it is the only non-public route a canceled org can still reach. A user's *other* org memberships are unaffected — only the canceled org itself is gated (resolved via the active-organization cookie + membership, same as the org switcher). Founding/`billing_exempt_at` orgs and orgs that never had a Stripe subscription (trial, expired-trial Starter fallback — #2) are never affected, because `subscription_status="canceled"` is only ever written by this one webhook code path (`handleStripeSubscriptionDeleted` / `applyStripeSubscription` in `src/lib/billing/stripe-sync.ts`) — see `src/lib/billing/subscription-lockout.ts` for the full safety proof. Gate lives in `src/lib/auth/org-gate.ts` (called from `src/lib/supabase/middleware.ts`).

---

## 5) Plan feature matrix (drive to Premium)

**ICP:** Public elementary (~500 kids), active PTO.  
**Starter** = limited trial. **Professional** = run the school (snug). **Premium ⭐** = recommended destination.

### Features

| Feature | Starter $49/mo | Professional $79/mo | Premium ⭐ $129/mo |
|---------|:--------------:|:-------------------:|:-----------------:|
| Calendar & Planning | ✅ | ✅ | ✅ |
| Event Workspace | ✅ | ✅ | ✅ |
| Create with AI | ✅ | ✅ | ✅ |
| Ask Ralli AI Assistant | — | ✅ | ✅ |
| Volunteer Center | — | ✅ | ✅ |
| Files & Documents | ✅ | ✅ | ✅ |
| Vendor Directory | ✅ | ✅ | ✅ |
| Notes & Activity | ✅ | ✅ | ✅ |
| Dashboard Widgets (default) | ✅ | ✅ | ✅ |
| Custom Dashboard | — | — | ✅ |
| Standard Analytics / Social Analytics (Org + Event Insights) | ✅ | ✅ | ✅ |
| Basic Approval Workflow | ✅ | ✅ | ✅ |
| Communication Hub | — | ✅ | ✅ |
| Meta Publishing | 10 posts/mo | **40 posts/mo** | **Unlimited** |
| AI Inbox Replies | — | — | ✅ |
| Change Requests & Reapproval | — | ✅ | ✅ |
| Custom Roles & Permissions | — | ✅ | ✅ |
| Approval Routing | — | ✅ | ✅ |
| Two-Level Approval Chains | — | ✅ | ✅ |
| Advanced Permission Controls | — | ✅ | ✅ |
| Priority Support | — | — | ✅ |
| AI Credits Included | **400/mo** | **1,200/mo** | **2,500/mo** |
| AI Reserve included | — | — | **$250 Reserve (18k)/yr** |

### Capacity & usage limits

| Capacity | Starter | Professional | Premium ⭐ |
|----------|---------|--------------|-----------|
| Events / school year | **15** | Unlimited | Unlimited |
| Team Members | **5** | **15** | **Unlimited** |
| Committee Chairs | **2** | **8** | Unlimited |
| Custom Roles | — | **8** | Unlimited |
| File Storage | **5 GB** | **40 GB** | **500 GB** |
| File History | **90 days** | **2 years** | Unlimited |
| Social Accounts | **1** | **1** | **Unlimited** |
| Scheduled Posts / Month | **10** | **40** | Unlimited |
| AI Credits | **400** | **1,200** | **2,500** |
| Artwork regens / milestone | **2** | **3** | **5** |
| Generate-all / event / 24h | **1** | **2** | **3** |
| AI Reserve Purchase | ✅ | ✅ | ✅ (+ included) |

---

## 6) Artwork regeneration caps (anti-runaway)

| Cap | Starter | Professional | Premium ⭐ | Trial |
|-----|--------:|-------------:|----------:|------:|
| Confirm credit cost before regen | ✅ | ✅ | ✅ | ✅ |
| Max regens **per artwork item / milestone** | **2** | **3** | **5** | **2** |
| Max Generate-all **per event / 24h** | **1** | **2** | **3** | **1** |

(UX enforcement = Phase 2+; credits still burn per image in Phase 1.)

---

## 7) AI Reserve (add-on)

| Reserve | Price | Credits | COGS @ full burn | NOI (price − COGS) |
|---------|------:|--------:|-----------------:|--------------------:|
| AI Reserve | $250 | 18,000 | $180 | ~$70 |
| AI Reserve ⭐ | $500 | 40,000 | $400 | ~$100 |
| AI Reserve Max | $1,000 | 85,000 | $850 | ~$150 |

### Price vs Membership Toolkit (~$1,100/yr, no AI)

| | / year | AI? |
|--|-------:|-----|
| Membership Toolkit | ~$1,100 | No |
| Hey Ralli Professional | **$948** | Yes (1,200 cr/mo) |
| Hey Ralli Premium ⭐ | **$1,548** | Yes (2,500 + Reserve) |

---

## 8) Reference usage & full-stack economics

### Reference school usage (unconstrained)

Assumptions: **96 events**/year; mix ~45% reminder / 35% full / 15% regen / 5% no AI; Create with AI quick/medium/1 version.

| | Credits / year | OpenAI $ / year | ≈ $ / mo (÷10) |
|--|---------------:|-----------------:|----------------:|
| Typical | ~8,940 | ~$90 | ~$9 |
| High | ~18,000–22,000 | ~$180–250 | ~$18–25 |

Average month ~**894** credits. Pro **1,200** covers a solid month; peak months → Reserve or Premium.

### Full-stack NOI @ 100 schools (expected month)

Platform share ~$2.30/school (shared stack ~$226/mo). Other ≈ email + storage + support.

| Plan | Gross | Credits (expected) | OpenAI | Stripe | Platform | Other | Total ops | **NOI** | **NOI %** |
|------|------:|--------------------:|-------:|-------:|---------:|------:|-----------:|--------:|-----------:|
| Starter | $49 | ~400 | $4.00 | ~$1.72 | $2.30 | $2.15 | ~$10.20 | **~$38.80** | ~79% |
| Professional | $79 | ~1,000 | $10.00 | ~$2.59 | $2.30 | $2.15 | ~$17.00 | **~$62.00** | ~78% |
| Premium | $129 | ~2,000 | $20.00 | ~$4.04 | $2.30 | $2.20 | ~$28.50 | **~$100.50** | ~78% |

Pre-Stripe default paid tier for metering: **Professional (1,200)**.

### Credit weight map (`action_type`)

| `action_type` | Credits | Usage-tab category |
|---------------|--------:|---------------------|
| `generate_artwork` (first-time) | 8 | Artwork Generation |
| `generate_artwork` (`metadata.isRegeneration = true`) | 8 | Artwork Regeneration |
| `orchestrate_artwork` | 8 | Artwork Generation (prompt-orchestration sub-step of the same pipeline; grouped with generation regardless of regen flag) |
| `meta_social_caption` | 1 | Caption Count |
| `ask_ralli` | 1 | Ask Ralli |
| `tasks_generate` | 1 | Task Assistant |
| `inbox_ai` | 1 | Inbox AI |
| `calendar_import_parse` | 1 | Calendar Import |
| `playbook_insights` | 1 | Playbook Insights |
| `draft_communication` | 1 | Communication Draft |
| `generate_event_brief` | 1 | Event Brief |
| `generate_creative_brief` | 1 | Creative Brief |
| anything else / unmapped | — | Etc |
| Failed / non-AI | 0 | — |

Category mapping lives in [`usage-breakdown-pure.ts`](../../src/lib/ai/usage-breakdown-pure.ts) (`AI_USAGE_CATEGORY_LABELS` / `categoryKeyForRow`) — update it there if a new `action_type` is added.

`ai_usage_log` also has a `metadata jsonb not null default '{}'` column (added in `20260725150000_ai_usage_log_metadata.sql`, mirrors `api_usage_log`'s existing column). For artwork actions it carries `{ isRegeneration, milestoneLabel, relativeDay }`, populated at the regenerate/generate entry points (`regenerateArtworkAction`, `regenerateMilestoneArtworkAction`, `regenerateArtworkConceptAction`, `generateMilestoneArtworkAction`, etc.) and threaded down through `runArtworkV2Generation` / `generateArtworkV2ImageNative` as an optional `usageAttribution` param — every param is optional with safe defaults, so any call site that doesn't pass it just logs with no milestone/regen info instead of failing.

---

## 9) Stripe setup (ops)

**Account:** Hey Ralli (`acct_1TtXrAP91P40Btyw`) — **live** mode. `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and the plan/Reserve price IDs are set in Production — Checkout is live. (`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is optional and currently unused — see §12.)

### Products created (July 24, 2026)

| Catalog id | Stripe product | Default price | Amount |
|------------|----------------|---------------|-------:|
| `starter` | Hey Ralli Starter | `price_1TwwQvP91P40BtywPt8LMkzU` | $49/mo |
| `professional` | Hey Ralli Professional | `price_1TwwQzP91P40Btywcch0XG1A` | $79/mo |
| `premium` | Hey Ralli Premium | `price_1TwwR0P91P40BtywnjdjDK9y` | $129/mo |
| `reserve` | Hey Ralli AI Reserve | `price_1TwwR1P91P40BtywhURMOzOE` | $250 one-time |
| `reserve_star` | Hey Ralli AI Reserve Star | `price_1TwwR1P91P40BtywMeKPycqf` | $500 one-time |
| `reserve_max` | Hey Ralli AI Reserve Max | `price_1TwwR3P91P40BtywfnOrHteZ` | $1,000 one-time |

### Webhook

- URL: `https://heyralli.com/api/stripe/webhook`
- Events: `checkout.session.completed`, `customer.subscription.created|updated|deleted`
- Signing secret stored as `STRIPE_WEBHOOK_SECRET` (local + Vercel Production)

---

## 10) Engine status (implementation phases)

| Phase | Ships | Status |
|------:|-------|--------|
| 1 | Metering engine (schema, weighted burn, docs) | **Shipped** |
| 2 | Sidebar credits widget + soft warn | **Shipped** |
| 3 | Owner `/ops/ai-apis?tab=credits` per-org monitoring | **Shipped** |
| 4 | Owner Reserve / bonus grant UI | **Shipped** |
| 4.5 | Billing surfaces sync (catalog) | **Shipped** |
| 5 | Stripe + feature/capacity gates + 14-day trial | **Shipped** (Checkout live in Production) |
| 6 | Hard-block AI at 0 (`assertAiCreditsAvailable` before text + artwork generation) | **Shipped** |

---

## 11) Gates enforced today

All follow the same pattern: resolve org → `assertOrgFeature`/`assertOrgCapacity` (`src/lib/billing/gates.ts`) → on denial, surface `${message} ${upgradeHint}` as the action's error.

One additional gate is **access-level**, not feature/capacity — it blocks the whole org rather than one action; it is listed first, then the 13 feature/capacity gates:

| Gate | Type | Where |
|------|------|-------|
| Canceled-subscription lockout | Access (org-wide) | `resolveOrgGateRedirect` (`src/lib/auth/org-gate.ts`) via middleware → redirects to `/billing/canceled`; billing actions in `src/lib/billing/actions.ts` bypass `manage_billing` permission for a canceled org so any member can resubscribe |
| `ask_ralli` | Feature | Ask Ralli action |
| `inbox_ai` | Feature | Inbox AI draft action |
| `volunteer_center` | Feature | `connectVolunteerSourceAction` (event-volunteers) |
| `communication_hub` | Feature | `requireInboxPermission` + `syncInboxNowAction` (inbox) |
| `social_analytics` | Feature | Insights page + `syncInsightsAction` (all plans — aligns with Standard Analytics; required for Meta App Review Connect/Insights surfaces) |
| `custom_dashboard` | Feature | `saveDashboardLayoutAction` (today) |
| `custom_roles` | Feature | `createOrganizationAccessTemplateAction` (access-templates) |
| `change_requests` | Feature | `requestUnifiedChangesAction` (approvals-scheduling) |
| `eventsPerSchoolYear` | Capacity | Create event |
| `teamMembers` | Capacity | Invite team member |
| `committeeChairs` | Capacity | Invite team member, when role = committee chair |
| `metaPostsPerMonth` | Capacity | Meta schedule/publish actions |
| `socialAccounts` | Capacity | Meta connection save (first connect only) |

---

## 12) Known gaps / remaining work

- **Canceled-org lockout is a middleware/page gate, not a per-action gate** — `resolveOrgGateRedirect` blocks every dashboard *page* route once an org's subscription is actually canceled, and the resubscribe/portal actions check the same signal. Individual server actions/API routes elsewhere do **not** independently re-check "is my org canceled?" before mutating data — they rely on the page-level redirect meaning a canceled org's members never load a page that could call them. This is the same enforcement shape as the pre-existing deactivated-member and developer-agreements gates. If a deeper defense-in-depth pass is wanted (e.g. a shared server-action wrapper that re-checks org billing status), it is not scheduled.
- **Storage limits not modeled** — "File Storage" / "File History" rows exist only in the plan matrix table above; there's no `PlanCapacityKey` or enforcement code for them. File sizes are tracked per-row across at least 3 separate tables (`campaign_files`, vendor directory uploads, `organization_stickers`) with no per-org rollup today, so this is a bigger lift (new capacity key + usage accounting across sources) — explicitly deferred, not scheduled.
- **`priority_support`** — defined in `PlanFeatureKey` but is a support-process/SLA distinction, not an app feature toggle. No code gate applies; Premium orgs get priority support operationally, not via a UI lock.
- **Unused optional key** — `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is listed as optional in [env-and-secrets.md](./env-and-secrets.md), but Checkout is a server-side redirect and never reads it client-side. Harmless, just unused — no action needed.
- **Cross-doc staleness — fixed (July 25, 2026)** — `feature-list.md`, `access-control.md`, `architecture.md`, `access-and-onboarding.md`, and the QA docs (`pre-handoff-readiness.md`, `architecture-overview.md`, `launch-checklist.md`, `owner-ai-apis.md`) no longer describe Stripe/plan gates as "deferred (Phase E)"; they now point here. `docs/archive/**` intentionally left as-is (frozen historical record).

## TODO

- [x] Locked credit / plan matrix
- [x] Marketing + Settings billing copy sync (Phase 4.5)
- [x] Org billing columns + Stripe Checkout/Portal/webhooks
- [x] Trial on new non-exempt orgs
- [x] Stripe Checkout `trial_period_days` + webhook `trialing` / `trial_ends_at` sync
- [x] Core feature/capacity gates (Phase 5) + remaining feature/capacity gates (§12 exceptions aside)
- [x] Stripe products + prices + webhook created (live account)
- [x] `STRIPE_SECRET_KEY` + publishable key on local + Vercel + Production redeploy
- [x] Hard-block AI at 0 (Phase 6)
- [ ] Storage capacity gate (deferred — see Known gaps)
- [x] Clean up stale "Phase E deferred" language in `feature-list.md` / QA docs
