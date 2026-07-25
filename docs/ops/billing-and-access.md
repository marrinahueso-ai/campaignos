# Billing, access & AI credits

**Status:** Living  
**Owner:** Product  
**Last updated:** July 25, 2026  
**Related:** [Ops](./README.md) · [AI and APIs](../product/ai-and-apis.md) · [Feature list](../product/feature-list.md) · [Env & secrets](./env-and-secrets.md) · [Documentation home](../README.md)

## Purpose

Single source of truth for how orgs get access to Hey Ralli and how AI credits/billing work commercially: founding codes, invites, `billing_exempt_at`, the 14-day trial, Stripe Checkout/Portal/webhooks, the plan/credits/Reserve matrix, and which plan gates are actually enforced in code today.

**UI plan copy:** [`src/lib/billing/plan-catalog.ts`](../../src/lib/billing/plan-catalog.ts).  
**Entitlements / capacity:** [`src/lib/billing/entitlements.ts`](../../src/lib/billing/entitlements.ts) + [`gates.ts`](../../src/lib/billing/gates.ts).

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
2. **Trial** — New non-exempt org starts `plan_tier=trial`, `trial_ends_at` +14d, 600-credit pool, Professional entitlements. After expiry without Checkout → Starter entitlements until they subscribe (no second free trial).
3. **Paid** — Stripe Checkout (plans + Reserve) → webhook updates `organizations.plan_tier` / `subscription_status` / `trial_ends_at` / subscription ids; Customer Portal for card / invoices / cancel.
4. **Soft warn → hard block** — Soft warn when low; AI generation refuses when period + Reserve cannot cover the action cost (founding / exempt unlimited).

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
| Standard Analytics | ✅ | ✅ | ✅ |
| Basic Approval Workflow | ✅ | ✅ | ✅ |
| Communication Hub | — | ✅ | ✅ |
| Meta Publishing | 10 posts/mo | **40 posts/mo** | **Unlimited** |
| AI Inbox Replies | — | — | ✅ |
| Social Analytics | — | — | ✅ |
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

| `action_type` | Credits |
|---------------|--------:|
| `generate_artwork` | 8 |
| `orchestrate_artwork` | 8 |
| `meta_social_caption` | 1 |
| `ask_ralli` | 1 |
| `inbox_ai` | 1 |
| `tasks_generate` | 1 |
| `calendar_import_parse` | 1 |
| `playbook_insights` | 1 |
| `draft_communication` | 1 |
| `generate_event_brief` | 1 |
| `generate_creative_brief` | 1 |
| Failed / non-AI | 0 |

---

## 9) Stripe setup (ops)

**Account:** Hey Ralli (`acct_1TtXrAP91P40Btyw`) — **live** mode. `STRIPE_SECRET_KEY` and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` are set in Production — Checkout is live.

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

| Gate | Type | Where |
|------|------|-------|
| `ask_ralli` | Feature | Ask Ralli action |
| `inbox_ai` | Feature | Inbox AI draft action |
| `volunteer_center` | Feature | `connectVolunteerSourceAction` (event-volunteers) |
| `communication_hub` | Feature | `requireInboxPermission` + `syncInboxNowAction` (inbox) |
| `social_analytics` | Feature | Insights page + `syncInsightsAction` |
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

- **Storage limits not modeled** — "File Storage" / "File History" rows exist only in the plan matrix table above; there's no `PlanCapacityKey` or enforcement code for them. File sizes are tracked per-row across at least 3 separate tables (`campaign_files`, vendor directory uploads, `organization_stickers`) with no per-org rollup today, so this is a bigger lift (new capacity key + usage accounting across sources) — explicitly deferred, not scheduled.
- **`priority_support`** — defined in `PlanFeatureKey` but is a support-process/SLA distinction, not an app feature toggle. No code gate applies; Premium orgs get priority support operationally, not via a UI lock.
- **Dead doc line** — `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is documented as required in [env-and-secrets.md](./env-and-secrets.md), but Checkout is a server-side redirect and never reads it client-side. Harmless, just unused.
- **Cross-doc staleness (flagged, not fixed here)** — `feature-list.md` and some QA docs still describe Stripe/plan gates as "deferred (Phase E)," which conflicts with Phase 5 above being shipped. Needs a cleanup pass through `feature-list.md`.

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
- [ ] Clean up stale "Phase E deferred" language in `feature-list.md` / QA docs
