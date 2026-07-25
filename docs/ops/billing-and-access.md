# Billing and access

**Status:** Living (Phase 5 eng — Stripe + gates + trial; configure Stripe env to go live)  
**Owner:** Product  
**Last updated:** July 24, 2026  
**Related:** [Ops](./README.md) · [AI credits matrix](./ai-credits-matrix.md) · [Feature list](../product/feature-list.md) · [Env & secrets](./env-and-secrets.md) · [Documentation home](../README.md)

## Purpose

Access today: founding codes, invites, `billing_exempt_at`, **14-day trial** for new non-exempt orgs, and Stripe Checkout when `STRIPE_*` is configured.

**Full plan / credits / Reserve / trial matrix:** **[ai-credits-matrix.md](./ai-credits-matrix.md)**.

**UI plan copy:** [`src/lib/billing/plan-catalog.ts`](../../src/lib/billing/plan-catalog.ts).  
**Entitlements / capacity:** [`src/lib/billing/entitlements.ts`](../../src/lib/billing/entitlements.ts) + [`gates.ts`](../../src/lib/billing/gates.ts).

## Plans (locked pricing)

| Plan | Price | AI credits / mo | Role |
|------|------:|----------------:|------|
| Starter | $49 | 400 | Limited school year |
| Professional | $79 | 1,200 | Run the school (snug) |
| Premium ⭐ | $129 | 2,500 + included $250 Reserve/yr | Recommended destination |
| Trial | — | **600** (14-day pool) | Pro features while active |
| Founding / exempt | — | Unlimited | `billing_exempt_at` set |

## Member billing journeys

1. **Founding / invite** — Valid founding code → waived billing + unlimited AI credits.
2. **Trial** — New non-exempt org starts `plan_tier=trial`, `trial_ends_at` +14d, 600-credit pool, Professional entitlements. After expiry → Starter entitlements until Checkout.
3. **Paid** — Stripe Checkout (plans + Reserve) → webhook updates `organizations.plan_tier` / subscription ids; Customer Portal for card / invoices / cancel.
4. **Soft warn → hard block (Phase 6)** — Soft warn today; hard-block AI at 0 later.

## Stripe setup (ops)

**Account:** Hey Ralli (`acct_1TtXrAP91P40Btyw`) — **live** mode.

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

### Remaining secrets (Dashboard)

Price IDs + webhook secret are set. Still required on local + Vercel Production:

1. `STRIPE_SECRET_KEY` — [API keys](https://dashboard.stripe.com/acct_1TtXrAP91P40Btyw/apikeys) (Secret key)
2. `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — same page (Publishable key)

Then redeploy Production so Checkout buttons activate.

Without `STRIPE_SECRET_KEY`, UI stays honest (“coming soon”) but trial + feature/capacity gates still apply.

## Credits engine status

| Phase | Status |
|------:|--------|
| 1 Metering | **Shipped** |
| 2 Sidebar widget | **Shipped** |
| 3 Owner monitoring | **Shipped** |
| 4 Owner grants | **Shipped** |
| 4.5 Billing surfaces sync | **Shipped** |
| 5 Stripe + gates + trial | **Shipped** (needs Stripe env for Checkout) |
| 6 Hard-block at 0 | Pending |

## Gates enforced in Phase 5

| Gate | Where |
|------|--------|
| `ask_ralli` | Ask Ralli action |
| `inbox_ai` | Inbox AI draft action |
| `eventsPerSchoolYear` | Create event |
| `teamMembers` | Invite team member |

Other matrix rows are defined in `entitlements.ts` for follow-on wiring.

## TODO

- [x] Locked credit / plan matrix
- [x] Marketing + Settings billing copy sync (Phase 4.5)
- [x] Org billing columns + Stripe Checkout/Portal/webhooks
- [x] Trial on new non-exempt orgs
- [x] Core feature/capacity gates
- [x] Stripe products + prices + webhook created (live account)
- [x] `STRIPE_SECRET_KEY` + publishable key on local + Vercel + Production redeploy
- [ ] Wire remaining capacity gates (Meta posts/mo, social accounts, storage)
- [ ] Hard-block AI at 0 (Phase 6)
