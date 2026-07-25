# Billing and access

**Status:** Living (partial — Stripe deferred; billing surfaces synced)  
**Owner:** Product  
**Last updated:** July 24, 2026  
**Related:** [Ops](./README.md) · [AI credits matrix](./ai-credits-matrix.md) · [Feature list](../product/feature-list.md) · [Documentation home](../README.md)

## Purpose

Access today: founding codes, invites, `billing_exempt_at`. Paid plan gates and Checkout ship in credits Phase 5.

**Full plan / credits / Reserve / trial matrix:** **[ai-credits-matrix.md](./ai-credits-matrix.md)**.

**UI plan copy** (marketing + Settings): [`src/lib/billing/plan-catalog.ts`](../../src/lib/billing/plan-catalog.ts) — mirrors the locked matrix. Do not invent a third price set in components.

## Plans (locked pricing)

| Plan | Price | AI credits / mo | Role |
|------|------:|----------------:|------|
| Starter | $49 | 400 | Limited trial school year |
| Professional | $79 | 1,200 | Run the school (snug) |
| Premium ⭐ | $129 | 2,500 + included $250 Reserve/yr | Recommended destination |
| Founding / exempt | — | Unlimited | `billing_exempt_at` set |

- Monthly credits: **no rollover** (UTC month).  
- **AI Reserve** ($250 / $500 / $1,000): rolls over + stacks.  
- **14-day free trial** (Professional features, 600 trial credits) — Stripe Phase 5.  
- Feature + capacity gates (events, posts, seats, etc.): matrix doc; enforce Phase 5.

## Member billing journeys

These are the paths UI should tell honestly today; Phase 5/6 wire the paid steps.

1. **Founding / invite** — Valid founding code or invite → workspace. If `billing_exempt_at`, billing waived + unlimited AI credits. No Checkout required.
2. **Trial (Phase 5)** — 14-day trial with Professional entitlements and **600** trial credits → choose Starter / Professional / Premium (or lose paid features).
3. **Paid** — Stripe Checkout for plans + Reserve; Customer Portal for payment method / invoices / cancel; webhooks update `plan_tier` and Reserve balance.
4. **Soft warn → hard block (Phase 6)** — Sidebar/Billing soft warn today; at 0 credits hard-block billable AI with CTAs to upgrade or buy Reserve (paths from journey 3).

**Pre-Stripe default metering:** non-exempt orgs are treated as **Professional (1,200)** for credits until Checkout assigns a real plan.

## Surfaces (Phase 4.5 synced)

| Surface | Role |
|---------|------|
| `/pricing` + home CTA | Locked $49 / $79 / $129; Premium highlighted; honest founding/setup CTAs (no fake Buy) |
| `/settings/billing-plan` (+ subpages) | Same catalog; founding vs metered Professional; stubs say checkout coming soon |
| Sidebar AI credits widget | Real balance → Billing hub |

## Credits engine status

| Phase | Status |
|------:|--------|
| 1 Metering (burn on `ai_usage_log`) | **Shipped** |
| 2 Sidebar widget + billing blurb | **Shipped** |
| 3 Owner per-org monitoring | **Shipped** (`/ops/ai-apis?tab=credits`) |
| 4 Owner grant UI | **Shipped** (Credits tab → Reserve SKU / bonus / adjust) |
| 4.5 Billing surfaces sync | **Shipped** (one commercial story in marketing + Settings) |
| 5 Stripe + gates + trial | Pending |
| 6 Hard-block at 0 | Pending |

## TODO

- [x] Point to locked credit / plan matrix
- [x] Sync marketing + Settings billing copy to locked prices (Phase 4.5)
- [ ] Stripe Checkout + webhooks (Phase 5)
- [ ] Enforce feature/capacity gates (Phase 5)
- [ ] 14-day trial product wiring (Phase 5)
