# Stripe integration (Engineering)

**Status:** Living  
**Owner:** Engineering (Hey Ralli)  
**Last updated:** July 26, 2026  
**Related:** [Billing, access & AI credits](../ops/billing-and-access.md) · [Env & secrets](../ops/env-and-secrets.md) · [Feature list](../product/feature-list.md) · [Architecture](./architecture.md) · [Access & onboarding](../security/access-and-onboarding.md)

How Stripe is wired in the app: Customer → Checkout → Subscription sync → Customer Portal → webhooks. Commercial plans, credit economics, and which feature/capacity gates are enforced live in [billing-and-access.md](../ops/billing-and-access.md) — do not duplicate that matrix here.

---

## Purpose

Engineering source of truth for:

- Stripe Checkout (paid plans + AI Reserve)
- Customer Portal sessions
- Webhook verification and handlers that exist today
- Org columns synced from Stripe (`stripe_*`, `plan_tier`, `subscription_status`, `trial_ends_at`)
- Ease Billing UI wiring (`/settings/billing-plan`)
- Founding / `billing_exempt` interaction with Checkout (waive, do not hide CTAs)
- Env var **names** and failure / verify checklist

---

## Architecture

```
Org member (manage_billing, or any member if canceled lockout)
  → ensure Stripe Customer (organizations.stripe_customer_id)
  → Checkout Session
       • mode=subscription  → Starter / Professional / Premium
       • mode=payment       → AI Reserve SKU (one-time)
  → Stripe redirects back to /settings/billing-plan?…=success|canceled
  → POST /api/stripe/webhook (signed)
       → stripe-sync updates org + grants Reserve
  → Customer Portal (card / invoices / cancel)
       → subscription.updated|deleted → same sync path
```

| Concept | Behavior |
|---------|----------|
| **Customer** | Created on first Checkout if missing; metadata `organizationId`; stored on `organizations.stripe_customer_id` |
| **Subscription** | Plan Checkout `mode: "subscription"`; optional `trial_period_days` when app trial still eligible |
| **Checkout** | Server action creates session URL; browser redirects (no client Stripe.js / Elements today) |
| **Portal** | `billingPortal.sessions.create` → return to `/settings/billing-plan` |
| **Webhooks** | Only handler: `POST /api/stripe/webhook` — signature via `STRIPE_WEBHOOK_SECRET` |

Base URL for success/cancel/return: `NEXT_PUBLIC_SITE_URL` or `VERCEL_URL`, else `http://localhost:3000` (`appBaseUrl()`).

---

## Key files

| Path | Role |
|------|------|
| `src/lib/billing/stripe.ts` | Client, `isStripeBillingConfigured()`, plan/Reserve price ID maps |
| `src/lib/billing/actions.ts` | `createPlanCheckoutSession`, `createReserveCheckoutSession`, `createBillingPortalSession` |
| `src/lib/billing/stripe-sync.ts` | Webhook → org patch + `grantAiReserve` |
| `src/app/api/stripe/webhook/route.ts` | Signature verify + event switch |
| `src/lib/billing/plan-catalog.ts` | UI catalog (Starter / Professional / Premium + Reserve) |
| `src/lib/billing/org-billing.ts` / `org-billing-pure.ts` | Snapshot incl. exempt + Stripe ids |
| `src/lib/billing/trial.ts` | App trial + Stripe `trial_period_days` helpers |
| `src/lib/billing/subscription-lockout.ts` | Pure canceled-lockout predicates |
| `src/lib/billing/stripe-invoices.ts` | `stripe.invoices.list` for Payment view |
| `src/lib/billing/stripe-payment-summary.ts` | Card / renewal display for Payment view |
| `src/lib/billing/settings-billing.ts` | Server context for billing settings page |
| `src/lib/billing/settings-ease-billing-view.ts` | `?view=` / legacy `?tab=` → `usage` \| `plans` \| `payment` |
| `src/components/settings-v2/SettingsEaseBilling.tsx` | Ease Billing UI |
| `src/components/settings-v2/BillingPlanContent.tsx` | Page shell |
| `src/app/(dashboard)/settings/billing-plan/page.tsx` | Route |
| `src/app/billing/canceled/page.tsx` | Canceled-subscription lockout surface |

---

## Plans & Reserve (Stripe SKUs)

Paid plan ids: `starter` · `professional` · `premium`.  
Reserve SKUs: `reserve` · `reserve_star` · `reserve_max`.

| Flow | Checkout mode | Price env | On success (webhook) |
|------|---------------|-----------|----------------------|
| Plan subscribe / change | `subscription` | `STRIPE_PRICE_STARTER` / `_PROFESSIONAL` / `_PREMIUM` | Sync `plan_tier`, `subscription_status`, Stripe ids, trial fields |
| Buy AI Reserve | `payment` | `STRIPE_PRICE_RESERVE` / `_RESERVE_STAR` / `_RESERVE_MAX` | `grantAiReserve` + ensure `stripe_customer_id` |

`isStripeBillingConfigured()` requires secret key **and all three plan** price IDs. Reserve prices are required only when starting a Reserve Checkout (missing SKU → action error).

Live product/price IDs and Dashboard webhook URL: [billing-and-access.md §9](../ops/billing-and-access.md#9-stripe-setup-ops). Pricing / credits / gates: same doc §§1–8, §11.

---

## Founding access & `billing_exempt`

Valid founding access code at org bootstrap sets `organizations.billing_exempt_at` (see `createSchoolProfile` / founding access helpers). That flag means:

- **Unlimited AI credits** (usage still logged; no burn)
- **Plan / Reserve Checkout refused** in `actions.ts` with a clear error (founding partners do not need a paid subscription / Reserve)
- **UI still shows** plan catalog and manage CTAs (Change plan, Buy Reserve, invoices, portal) — exempt is an entitlement flag, **not** a permission to hide billing chrome

Canceled-subscription lockout never applies to exempt orgs (`subscription-lockout.ts` / org gate). Product journeys: [billing-and-access.md §4](../ops/billing-and-access.md#4-member-billing-journeys).

---

## Ease Billing UI

| Item | Detail |
|------|--------|
| Route | `/settings/billing-plan` |
| Views | Soft pills: **Usage** · **Plans** · **Payment** via `?view=` (`usage` default; `plans` / `plan`; `payment` / `history`). Legacy `?tab=` still accepted. |
| Component | `SettingsEaseBilling` — calls plan / Reserve Checkout and Portal server actions |
| Usage | Period meters (AI · Reserve · seats · Meta posts), category breakdown, Buy more Reserve |
| Plans | Catalog + Checkout CTAs |
| Payment | Card / renewals summary, Stripe invoice list (hosted URL / PDF), Customer Portal button |
| Flash | `checkout=success\|canceled`, `reserve=success\|canceled` query params |
| Permission | `manage_billing` for Checkout/Portal — **except** canceled lockout: any active member may resubscribe from `/billing/canceled` |

Legacy per-page billing routes redirect into the matching Ease view (see product/ops billing doc).

---

## Signup: plan-first → founding code

Marketing signup is **not** Stripe Checkout:

1. `/signup` — plan chooser (Starter / Professional / Premium from catalog)
2. `/signup?plan=…` — “checkout” step: founding access code + email
3. Magic-link → org setup / onboarding; founding code waives billing at bootstrap (`billing_exempt_at`)

Paid Stripe Checkout happens later from Settings (or `/billing/canceled`) for non-exempt orgs. Auth welcome details: [auth-welcome-email.md](./auth-welcome-email.md).

---

## Webhook events handled

**Endpoint:** `POST /api/stripe/webhook` (`runtime = "nodejs"`).  
**Verify:** raw body + `stripe-signature` + `STRIPE_WEBHOOK_SECRET` via `constructEvent`. Missing secret → `503`; bad/missing signature → `400`.

| Event | Handler | Effect |
|-------|---------|--------|
| `checkout.session.completed` | `handleStripeCheckoutCompleted` | Subscription: retrieve sub → `applyStripeSubscription` (or metadata fallback). Payment: map Reserve SKU → `grantAiReserve` |
| `customer.subscription.created` | `handleStripeSubscriptionUpdated` | Same as updated — sync plan / status / trial / Stripe ids |
| `customer.subscription.updated` | `handleStripeSubscriptionUpdated` | Sync plan / status / trial / Stripe ids |
| `customer.subscription.deleted` | `handleStripeSubscriptionDeleted` | `subscription_status=canceled`, clear sub/price ids, `plan_tier=starter`, clear trial → org-wide lockout to `/billing/canceled` |

Any other event type is ignored (`default: break`) and still returns `{ received: true }`.

Org resolution: session/subscription `metadata.organizationId`, else lookup by `stripe_customer_id`.

Status mapping (Stripe → app): `active`, `trialing`, `past_due`, `canceled`, `incomplete` (and aliases like `unpaid` → `past_due`, `incomplete_expired` / `paused` → `canceled`). See `mapStripeSubscriptionStatus` in `stripe-sync.ts`.

There is **no** invoice.*, payment_intent.*, or customer.* handler beyond the events above.

---

## Env / secrets (names only)

| Variable | Used for |
|----------|----------|
| `STRIPE_SECRET_KEY` | Server SDK (Checkout, Portal, invoices, webhook construct) |
| `STRIPE_WEBHOOK_SECRET` | Webhook signature verification |
| `STRIPE_PRICE_STARTER` | Monthly Starter price |
| `STRIPE_PRICE_PROFESSIONAL` | Monthly Professional price |
| `STRIPE_PRICE_PREMIUM` | Monthly Premium price |
| `STRIPE_PRICE_RESERVE` | One-time Reserve |
| `STRIPE_PRICE_RESERVE_STAR` | One-time Reserve Star |
| `STRIPE_PRICE_RESERVE_MAX` | One-time Reserve Max |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Listed / optional — **unused** today (Checkout is server redirect) |
| `NEXT_PUBLIC_SITE_URL` | Preferred success/cancel/return base URL |

Placeholders ending in `...` are treated as unset (`isStripeBillingConfigured`). See [env-and-secrets.md](../ops/env-and-secrets.md) and `.env.local.example`.

---

## Failure modes

| Symptom | Likely cause |
|---------|----------------|
| Checkout/Portal CTAs disabled or “Stripe is not configured” | Missing `STRIPE_SECRET_KEY` or any plan price ID |
| Reserve Checkout fails; plans work | Missing that Reserve price env |
| Webhook `503` | `STRIPE_WEBHOOK_SECRET` unset |
| Webhook `400` Invalid signature | Wrong secret, or body parsed before signature (must use raw text) |
| Checkout succeeds but plan/credits unchanged | Webhook not delivered / wrong URL / handler error (`500`); check Vercel + Stripe Dashboard logs |
| Org not found in sync logs | Missing `metadata.organizationId` and no `stripe_customer_id` match |
| Exempt org cannot Checkout | Expected — founding partners are refused in actions |
| Invoice list empty | No `stripe_customer_id`, Stripe API error (returns `[]`), or never invoiced |
| Portal “No Stripe customer yet” | Org never completed a Checkout that created a customer |
| Locked to `/billing/canceled` | `customer.subscription.deleted` synced `canceled` — resubscribe via Checkout/Portal |

---

## QA / verify

### Engineering

- [ ] Local: set Stripe test keys + price IDs; `isStripeBillingConfigured()` true
- [ ] Plan Checkout → webhook → `plan_tier` / `subscription_status` / Stripe ids on org
- [ ] Eligible trial attaches `trial_period_days`; status `trialing` + `trial_ends_at`
- [ ] Reserve Checkout → Reserve balance increases (`grantAiReserve`)
- [ ] Portal opens and returns to `/settings/billing-plan`
- [ ] `subscription.deleted` → members redirected to `/billing/canceled`; resubscribe restores access
- [ ] Founding-exempt org: unlimited credits copy; Checkout actions refuse; CTAs still visible
- [ ] Webhook rejects unsigned / wrong-signature POSTs; GET is not a success path (security smoke)

### Owner / QA (product smoke)

- [ ] Settings → Billing & Plan: Usage / Plans / Payment pills work (`?view=`)
- [ ] Non-exempt: Change plan → Stripe Checkout → return with success flash; plan label updates after webhook
- [ ] Buy Reserve from Usage → Checkout → credits/Reserve meter updates
- [ ] Payment: invoices list (when customer exists) + portal button
- [ ] Canceled org: only `/billing/canceled` + resubscribe/portal/sign-out
- [ ] Signup plan-first → founding code still creates waived org (no Stripe required)

Playwright touchpoints: `tests/hey-ralli/smoke/21-ai-credits-billing-phases.spec.ts`, `tests/hey-ralli/helpers/security.ts` (webhook signature / secret leakage).

---

## Related

| Doc | Owns |
|-----|------|
| [ops/billing-and-access.md](../ops/billing-and-access.md) | Plans, credits, COGS, gates, ops Stripe setup (account / price ids / webhook URL) |
| [ops/env-and-secrets.md](../ops/env-and-secrets.md) | Env inventory |
| [product/feature-list.md](../product/feature-list.md) | Shipped status |
| [engineering/architecture.md](./architecture.md) | Stack + org gate |
| [security/access-and-onboarding.md](../security/access-and-onboarding.md) | Founding / invite / multi-org |
| [product/ai-and-apis.md](../product/ai-and-apis.md) | Owner AI / credits ops |
