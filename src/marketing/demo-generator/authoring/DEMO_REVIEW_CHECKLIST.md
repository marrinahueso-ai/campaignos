# Demo Review Checklist (before public integration)

**Status:** Living  
**Last updated:** 2026-07-23

Use this only after the private harness demo is approved. Public wiring is a separate intentional change.

## Story

- [ ] Visitor understands the workflow without clicking
- [ ] Starting → action → result is clear in one loop
- [ ] Final hold is long enough to read the outcome
- [ ] Reduced-motion still communicates the full value

## Product fidelity

- [ ] Feels like Hey Ralli (warm, calm, premium)
- [ ] Simplified chrome — not a full dashboard recreation
- [ ] Static data is realistic and school-appropriate
- [ ] No unsupported claims / competitor digs / fake testimonials

## Motion quality

- [ ] Restrained — no bounce spam, neon, or purple SaaS look
- [ ] No harsh flash on loop reset
- [ ] Loading states are short
- [ ] ≤7 major story beats preferred

## Technical

- [ ] Registered via `MARKETING_DEMO_REGISTRY` only for private preview so far
- [ ] Lazy-loadable (`lazyDemo`)
- [ ] No dashboard / Supabase / auth imports
- [ ] Production build clean
- [ ] Accessibility reviewed (focus, labels, toast announce policy)

## Public integration (separate PR)

- [ ] Explicit product/design approval
- [ ] Lazy-loaded into a marketing section intentionally
- [ ] Surrounding page copy written
- [ ] Feature list / docs updated per governance
- [ ] Still not required on every marketing page
