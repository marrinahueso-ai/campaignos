# AI credits — plans, usage, COGS, net matrix

**Status:** Living  
**Owner:** Product  
**Last updated:** July 24, 2026  
**Related:** [Billing and access](./billing-and-access.md) · [AI and APIs](../product/ai-and-apis.md) · [Feature list](../product/feature-list.md)

Commercial source of truth for Hey Ralli plans, AI credits, AI Reserve, trial, and artwork regen caps.  
**Engine status:** Phases 1–6 shipped (metering, widget, Owner Credits/grants, billing surfaces, Stripe Checkout/Portal/webhooks + trial + core gates, hard-block AI at 0). Configure `STRIPE_*` env to enable Checkout.

---

## 0) How to read this

| Label | Meaning |
|-------|---------|
| **Monthly plan credits** | Reset 1st of month UTC. **No rollover.** |
| **AI Reserve** | Prepaid bucket. **Rolls over** and **stacks**. Burn after monthly allowance. |
| **NOI** | Gross − ops (OpenAI + Stripe + platform share + other) unless noted as price − COGS only. |

All amounts are **config-driven** and can change later without schema rewrites.

---

## 1) Unit economics

| Item | Value |
|------|------:|
| Artwork image gen | **8 credits** |
| Text AI (caption, Ask Ralli, inbox, tasks, calendar parse, insights, briefs) | **1 credit** |
| Failed AI / non-AI APIs | **0** |
| OpenAI $ per credit (campaign-blended) | **~$0.01** |
| Full 7-milestone campaign | **~119 credits** · **~$1.20** |
| 2-milestone reminder | **~34 credits** · **~$0.34** |

Burn order: **period allowance → Reserve**.

---

## 2) Trial (locked)

| | Rule |
|--|------|
| Length | **14 days free** |
| Entitlements | Professional features during trial |
| Trial AI budget | **600 credits** total for the window |
| Artwork caps | Same as Starter |
| After day 14 | Choose Starter / Professional / Premium |

**Stripe:** First Checkout on an eligible org sends `subscription_data.trial_period_days` (remaining app-trial days, or 14). Webhooks sync `subscription_status=trialing` and `trial_ends_at` from Stripe `trial_end`. Card is collected up front; billing starts when the trial ends. Expired app trials and orgs that already had a Stripe subscription skip the free trial.

---

## 3) Artwork regeneration caps (anti-runaway)

| Cap | Starter | Professional | Premium ⭐ | Trial |
|-----|--------:|-------------:|----------:|------:|
| Confirm credit cost before regen | ✅ | ✅ | ✅ | ✅ |
| Max regens **per artwork item / milestone** | **2** | **3** | **5** | **2** |
| Max Generate-all **per event / 24h** | **1** | **2** | **3** | **1** |

(UX enforcement = Phase 2+; credits still burn per image in Phase 1.)

---

## 4) Plan feature matrix (drive to Premium)

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

### AI Reserve (add-on)

| Reserve | Price | Credits | COGS @ full burn | NOI (price − COGS) |
|---------|------:|--------:|-----------------:|-------------------:|
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

## 5) Reference school usage (unconstrained)

Assumptions: **96 events**/year; mix ~45% reminder / 35% full / 15% regen / 5% no AI; Create with AI quick/medium/1 version.

| | Credits / year | OpenAI $ / year | ≈ $ / mo (÷10) |
|--|---------------:|----------------:|---------------:|
| Typical | ~8,940 | ~$90 | ~$9 |
| High | ~18,000–22,000 | ~$180–250 | ~$18–25 |

Average month ~**894** credits. Pro **1,200** covers a solid month; peak months → Reserve or Premium.

---

## 6) Full-stack NOI @ 100 schools (expected month)

Platform share ~$2.30/school (shared stack ~$226/mo). Other ≈ email + storage + support.

| Plan | Gross | Credits (expected) | OpenAI | Stripe | Platform | Other | Total ops | **NOI** | **NOI %** |
|------|------:|-------------------:|-------:|-------:|---------:|------:|----------:|--------:|----------:|
| Starter | $49 | ~400 | $4.00 | ~$1.72 | $2.30 | $2.15 | ~$10.20 | **~$38.80** | ~79% |
| Professional | $79 | ~1,000 | $10.00 | ~$2.59 | $2.30 | $2.15 | ~$17.00 | **~$62.00** | ~78% |
| Premium | $129 | ~2,000 | $20.00 | ~$4.04 | $2.30 | $2.20 | ~$28.50 | **~$100.50** | ~78% |

---

## 7) Implementation phases

| Phase | Ships |
|------:|-------|
| **1** | Metering engine (schema, weighted burn, docs) — **shipped** |
| **2** | Sidebar credits widget + soft warn — **shipped** |
| **3** | Owner `/ops/ai-apis?tab=credits` per-org monitoring — **shipped** |
| **4** | Owner Reserve / bonus grant UI — **shipped** |
| **4.5** | Billing surfaces sync (catalog) — **shipped** |
| **5** | Stripe + feature/capacity gates + 14-day trial — **shipped** (env required for Checkout) |
| **6** | Hard-block AI at 0 — **shipped** (`assertAiCreditsAvailable` before text + artwork generation) |

Founding / `billing_exempt_at` → **unlimited** credits (log usage, no burn).

Pre-Stripe default paid tier for metering: **Professional (1,200)**.

---

## 8) Credit weight map (`action_type`)

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
