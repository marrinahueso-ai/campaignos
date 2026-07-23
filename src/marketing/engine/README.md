# Marketing Motion Engine

**Status:** Living  
**Owner:** Engineering  
**Last updated:** 2026-07-23

Reusable animation system for Hey Ralli marketing product demos. Built with **Motion for React** (`motion/react`), Next.js, React, and Tailwind.

## Architecture

```
MotionProvider
  └─ DemoPlayer          ← owns the single rAF clock
       └─ DemoTimeline   ← context: time, cues, helpers
            ├─ Scene
            ├─ primitives (Cursor, Typing, …)
            └─ DemoControls (optional)
```

### Shared clock model

- **One** `requestAnimationFrame` loop per active `DemoPlayer`
- Primitives subscribe to a shared `MotionValue` time — they must **not** create their own rAF / `setInterval` loops
- Playback uses wall-clock deltas so a hidden tab does not jump time on resume
- Offscreen and hidden-tab states pause the clock (no wasted frames)

## Core pieces

### MotionProvider

Root configuration: brand-safe defaults, easing, reduced-motion detection, optional `forceReducedMotion` for tests/harness.

`DemoPlayer` wraps a provider automatically. Pass `forceReducedMotion` / `reducedMotion` on `DemoPlayer` when needed.

### DemoPlayer

Owns duration, loop, autoplay, playback rate, seek/restart, controls, offscreen pause, tab-hidden pause, and the first-frame-stable mount.

Animated `children` render only after client mount (optional `fallback` until then). This avoids Motion transform/opacity hydration mismatches under the App Router.

### DemoTimeline

Exposes `currentTime`, `progress`, `play` / `pause` / `seek` / `restart`, `isActive`, `segmentProgress`, `hasReached`, cue lookup helpers.

### Scene

Time-windowed container (`at` / `until` / `cue` / `untilCue`) with transform + opacity enter/exit.

### Primitives

Configurable building blocks: Cursor, CursorRipple, MouseClick, TypingAnimation, CountUp, ProgressRing, ProgressBar, Highlight, Glow, Pulse, FloatingCard, FadeSlide, Drawer, Toast, BadgeChange, Skeleton, Confetti, AutoScroll, SectionSpotlight.

## Timeline definitions

```ts
import { defineTimeline, DemoPlayer, Scene, Cursor } from "@/marketing/engine";

const timeline = defineTimeline({
  id: "example",
  duration: 20,
  loop: true,
  cues: [
    { at: 0, id: "cursor-appear" },
    { at: 2, id: "cursor-move" },
    { at: 4, id: "button-highlight" },
    { at: 6, id: "drawer-open" },
    { at: 8, id: "typing-start" },
    { at: 12, id: "cards-fade" },
    { at: 16, id: "counter-start" },
  ],
});

export function ExampleDemo() {
  return (
    <DemoPlayer timeline={timeline} loop autoPlay>
      <Cursor
        keyframes={[
          { at: 0, x: "10%", y: "40%", opacity: 0 },
          { at: 0.4, opacity: 1 },
          { at: 2, x: "40%", y: "35%" },
        ]}
      />
      <Scene cue="cards-fade">
        {/* static fixture UI */}
      </Scene>
    </DemoPlayer>
  );
}
```

### Cue usage

- Prefer `cue` / `untilCue` over magic numbers scattered in JSX
- Absolute `at` / `until` still work for one-off timing
- `delay` and `duration` adjust local animation windows after the cue

## How to create a new demo

1. Add `src/marketing/demos/<DemoName>/index.tsx` (client component).
2. Define a timeline with `defineTimeline`.
3. Compose static fixture UI + engine `Scene`s / primitives.
4. Export a single default component.
5. Lazy-load from a marketing page only when ready (see below).
6. Do **not** import dashboard components, Supabase, or live org data.

## How to add scenes

```tsx
<Scene cue="drawer-open" untilCue="typing-start" enterDirection="right">
  <YourPanel />
</Scene>
```

Options: `enterDuration`, `exitDuration`, `enterScale`, `unmountOnExit`, `holdAfter`, `className`.

## How to add animations

Bind any primitive to the shared clock:

```tsx
<TypingAnimation cue="typing-start" untilCue="cards-fade" text="…" />
<CountUp cue="counter-start" from={0} to={128} duration={1.5} />
<ProgressBar cue="progress" value={0.8} />
```

## How to create a new primitive

1. Add `src/marketing/engine/primitives/YourPrimitive.tsx` with `"use client"`.
2. Read time via `useTimelineContext()` or `useTiming()`.
3. Drive visuals with `useTransform(timeline.time, …)` — no private rAF.
4. Honor `timeline.reducedMotion` (show completed / static state).
5. Animate `transform` / `opacity` only when possible.
6. Export from `primitives/index.ts` and `engine/index.ts`.

## Reduced motion

When `prefers-reduced-motion: reduce` is set (or `forceReducedMotion`):

- Player seeks to the end state and stays paused
- No cursor travel, typing, pulse, shimmer, or confetti
- Scenes/primitives show the informative completed frame

## Lazy-load a demo

```tsx
import { lazyDemo, DemoLoadingFallback } from "@/marketing/engine";

const CreateAIDemo = lazyDemo(() => import("@/marketing/demos/CreateAI"), {
  loading: () => <DemoLoadingFallback />,
  ssr: false,
});
```

Or use `next/dynamic` directly. Keep demos out of the dashboard import graph.

## Performance rules

- One clock per player
- Pause when offscreen / tab hidden
- Prefer transform + opacity
- Avoid animating `top` / `left` / `width` / `height`
- Named exports only; import primitives directly when optimizing bundles
- Clean up observers and rAF on unmount

## Accessibility rules

- Keyboard-accessible `DemoControls`
- Decorative cursor `aria-hidden`
- Progress bars/rings expose `aria-valuenow`
- Toasts default `announce={false}` so loops do not spam screen readers
- Do not convey meaning by color alone (badge labels must change)
- Respect reduced motion

## Development harness

- Local: `/dev/motion-engine`
- Production: `notFound()` when `NODE_ENV === "production"`
- Added to public middleware allowlist for local unauthenticated access
- Not in site navigation

## Common mistakes to avoid

1. Creating a `setInterval` / rAF inside a primitive
2. Importing the engine from dashboard routes
3. Wiring demos to live Supabase data
4. Animating layout properties
5. Enabling toast `announce` inside a looping demo
6. Forgetting `cue` ids and scattering magic timestamps
7. Shipping the harness as a public marketing page
