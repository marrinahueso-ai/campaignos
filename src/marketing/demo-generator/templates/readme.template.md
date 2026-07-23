# [Demo name] — marketing demo

**Status:** Living  
**Owner:** Engineering  
**Last updated:** YYYY-MM-DD

Private animated product story. Static fixtures + Marketing Motion Engine.

## Preview

`/dev/motion-engine` → Marketing demos → **[Demo name]**

Unavailable in production.

## Story

1. [Starting state]
2. [Key actions]
3. [Final result]

Duration: **[N]s**, looping.

## Rules

- No live APIs / dashboard imports
- Not wired to public marketing pages until approved
- Spec: `[demoName]Spec.ts`

## Lazy load (future public use only)

```tsx
import { lazyDemo, DemoLoadingFallback } from "@/marketing/engine";

const Demo = lazyDemo(() => import("@/marketing/demos/[DemoName]"), {
  loading: () => <DemoLoadingFallback />,
});
```
