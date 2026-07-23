# Create with AI — marketing demo

**Status:** Living  
**Owner:** Engineering  
**Last updated:** 2026-07-23

Private animated product story for Hey Ralli’s Create with AI flow. Built on the Marketing Motion Engine with **static fixtures only**.

## Preview

- **Public:** `/features` → Create with AI product story (no development controls).
  Uses a fixed-height flex shell so the campaign panel is not clipped in the Features column.
- **Private harness:** `/dev/motion-engine` → Marketing demos → Create with AI  
  (`notFound()` when `NODE_ENV === "production"`)

## Story

1. Event workspace shows Back to School Fair (Planning)
2. Cursor selects **Create with AI**
3. Panel opens and prepares the campaign
4. Artwork appears
5. Caption types in
6. Milestones stagger in
7. Status becomes **Ready for Review** + toast

Duration: **25.5s**, looping.

## Rules

- No Supabase, auth, dashboard, or live event imports
- No public marketing page wiring yet
- Prefer engine primitives + `Scene` / cues
- Reduced motion jumps to the completed campaign state

## Lazy load (future marketing page)

```tsx
import { lazyDemo, DemoLoadingFallback } from "@/marketing/engine";

const CreateAIDemo = lazyDemo(() => import("@/marketing/demos/CreateAI"), {
  loading: () => <DemoLoadingFallback />,
});
```

## Files

| File | Role |
|------|------|
| `CreateAIDemo.tsx` | DemoPlayer composition |
| `createAITimeline.ts` | `defineTimeline` cues |
| `demoData.ts` | All copy + asset paths |
| `components/*` | Static product chrome |
| `index.ts` | Public exports + default for lazy load |
