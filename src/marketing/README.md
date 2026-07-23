# Hey Ralli Marketing Module

**Status:** Living  
**Owner:** Engineering  
**Last updated:** 2026-07-23

Isolated home for marketing-site animation infrastructure and future product demos.

## Purpose

This module powers polished, reusable product demonstrations for Hey Ralli marketing pages (Homepage, Features, Pricing, AI, Volunteers, and more) — without coupling to the authenticated product application.

## Layout

```
src/marketing/
  engine/           # Reusable Marketing Motion Engine (Motion for React)
  demo-generator/   # Cursor DemoSpec contract + private demo registry
  demos/            # Isolated demos (CreateAI, …) — harness-private until wired
  README.md         # This file
```

Authoring entry: [demo-generator/README.md](./demo-generator/README.md) · [CURSOR_DEMO_COMMAND.md](./demo-generator/authoring/CURSOR_DEMO_COMMAND.md)

## Engine vs demos

| Area | Responsibility |
|------|----------------|
| **engine/** | Shared clock, timeline, scenes, primitives, controls, docs |
| **demos/** | Product-story compositions that *use* the engine with static fixtures |

Demos must not reimplement animation timers. They compose engine primitives on a shared timeline.

## Scope boundaries

**In scope**

- Motion engine and its documentation
- Future lazy-loaded marketing demos
- Dev-only harness at `/dev/motion-engine`

**Out of scope**

- Dashboard / product workflows
- Supabase, auth, application state, product APIs
- Live Studio marketing pages under `src/components/marketing`
- Marketing data under `src/lib/marketing`

## Why it stays separate

- Live marketing UI (`src/components/marketing`) already ships to production and must keep working unchanged until demos are intentionally wired.
- Product bundles (`src/app/(dashboard)`, `src/components/*` product domains) must not import this module.
- Tree-shaking and `next/dynamic` keep Motion + demos out of dashboard JavaScript.

## How future marketing pages should use it

1. Build a demo under `src/marketing/demos/<Name>/` using `defineTimeline` + `DemoPlayer`.
2. Lazy-load it with `lazyDemo(() => import("…"))` or `next/dynamic`.
3. Mount the demo inside a marketing page section only after product/design review.
4. Pass static fixture data only — never live org/user data.

See [engine/README.md](./engine/README.md) for the full authoring guide.

## Development harness

- **URL (local):** [/dev/motion-engine](http://localhost:3000/dev/motion-engine)
- **Production:** returns `404` (`NODE_ENV === "production"`)
- Not linked from site navigation
