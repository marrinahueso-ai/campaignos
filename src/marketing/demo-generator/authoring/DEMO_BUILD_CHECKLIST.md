# Demo Build Checklist

**Status:** Living  
**Last updated:** 2026-07-23

Cursor must complete these steps in order for every new marketing demo.

## STEP 1 — Discovery

- [ ] Read `src/marketing/demo-generator/README.md`
- [ ] Read `src/marketing/engine/README.md`
- [ ] Read `src/marketing/demo-generator/authoring/CURSOR_DEMO_COMMAND.md`
- [ ] Review `src/marketing/demos/CreateAI/` reference
- [ ] Inspect product UI for visual reference only
- [ ] Do **not** import product state, Supabase, auth, or dashboard components

## STEP 2 — Specification

- [ ] Create `[demoName]Spec.ts` with `defineDemoSpec(...)`
- [ ] Starting / final / reduced-motion states filled
- [ ] Story beats with timings inside duration
- [ ] Static content listed
- [ ] Responsive primary story listed
- [ ] Restrictions listed
- [ ] Spec validates with no errors

## STEP 3 — Data

- [ ] `demoData.ts` centralizes all copy
- [ ] Realistic static fixtures only
- [ ] No live APIs / customer data / invented public claims

## STEP 4 — Timeline

- [ ] `defineTimeline` matches beat structure
- [ ] Shared `DemoPlayer` clock only
- [ ] Final hold ≥ ~2s
- [ ] Clean loop reset
- [ ] Duration typically 18–28s

## STEP 5 — Components

- [ ] Root `[DemoName]Demo.tsx`
- [ ] Only necessary local components
- [ ] Engine primitives + `Scene` (no duplicated clock)
- [ ] Warm Hey Ralli visual language
- [ ] Product UI is the focal point

## STEP 6 — Registry and preview

- [ ] Export default from `index.ts` for `lazyDemo`
- [ ] Register in `src/marketing/demo-generator/demoRegistry.ts`
- [ ] Appears in `/dev/motion-engine` selector
- [ ] Production `notFound()` guard unchanged
- [ ] **Not** added to live marketing pages

## STEP 7 — Validation

- [ ] Typecheck
- [ ] Lint
- [ ] Relevant tests
- [ ] Production build
- [ ] Normal motion sequence
- [ ] Reduced motion completed state
- [ ] Desktop / tablet / ~390px mobile
- [ ] No horizontal overflow
- [ ] Offscreen pause
- [ ] Hidden-tab pause
- [ ] Loop stability
- [ ] Accessibility (toast announce off for loops, labels not color-only)
- [ ] No network / backend / dashboard imports

## STEP 8 — Final report

- [ ] Files created / modified
- [ ] Timeline summary
- [ ] Primitives used
- [ ] Preview URL
- [ ] Validation results
- [ ] Confirmation: no public page changed
