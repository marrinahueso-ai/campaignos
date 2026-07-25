# Billing and access

**Status:** Living (partial — Stripe deferred)  
**Owner:** Product  
**Last updated:** July 24, 2026  
**Related:** [Ops](./README.md) · [AI credits matrix](./ai-credits-matrix.md) · [Feature list](../product/feature-list.md) · [Documentation home](../README.md)

## Purpose

Access today: founding codes, invites, `billing_exempt_at`. Paid plan gates and Checkout ship later (credits Phase 5).

**Full plan / credits / Reserve / trial matrix:** **[ai-credits-matrix.md](./ai-credits-matrix.md)**.

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

## Credits engine status

| Phase | Status |
|------:|--------|
| 1 Metering (burn on `ai_usage_log`) | **Shipped** |
| 2 Sidebar widget + billing blurb | **Shipped** |
| 3 Owner per-org monitoring | **Shipped** (`/ops/ai-apis?tab=credits`) |
| 4 Owner grant UI | Pending |
| 5 Stripe + gates + trial | Pending |
| 6 Hard-block at 0 | Pending |

Pre-Stripe metering default: **Professional (1,200)** unless founding/exempt.

## TODO

- [x] Point to locked credit / plan matrix
- [ ] Stripe Checkout + webhooks (Phase 5)
- [ ] Enforce feature/capacity gates (Phase 5)
- [ ] 14-day trial product wiring (Phase 5)
