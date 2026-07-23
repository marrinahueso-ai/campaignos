# Marketing demos

**Status:** Living  
**Owner:** Engineering  
**Last updated:** 2026-07-23

Isolated marketing product demonstrations powered by the [Motion Engine](../engine/) and authored through the [Demo Generator](../demo-generator/).

## Generator workflow

```
Cursor command → DemoSpec → demoData → timeline → components → demoRegistry → /dev/motion-engine
```

Start here: [demo-generator/README.md](../demo-generator/README.md)  
Pasteable commands: [CURSOR_DEMO_COMMAND.md](../demo-generator/authoring/CURSOR_DEMO_COMMAND.md)

## Standard folder structure

```
src/marketing/demos/[DemoName]/
  [DemoName]Demo.tsx
  [demoName]Spec.ts
  [demoName]Timeline.ts
  demoData.ts
  index.ts
  README.md
  components/          # only what the demo needs
```

## Rules

1. **Static data only** — no live organization or user data
2. **No product state or APIs** — no Supabase, server actions, dashboard stores
3. **Shared timeline** — `defineTimeline` + `DemoPlayer` from `@/marketing/engine`
4. **Lazy-load** — register with `lazyDemo` in `demo-generator/demoRegistry.ts`
5. **Private until intentional** — demos remain harness-only until a separate public integration PR
6. **DemoSpec first** — never invent animations without a validated spec

## Current demos

| Demo | Path | Spec | Preview |
|------|------|------|---------|
| Create with AI | [`CreateAI/`](./CreateAI/) | `createAISpec.ts` | `/dev/motion-engine` → Marketing demos |

## Private preview

`/dev/motion-engine` — production returns 404. Not in site navigation.
