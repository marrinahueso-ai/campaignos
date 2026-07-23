/**
 * TEMPLATE — root demo composition pattern.
 * Copy into src/marketing/demos/[DemoName]/[DemoName]Demo.tsx
 */

"use client";

import { DemoPlayer, Scene } from "@/marketing/engine";
// import { DEMO_TIMELINE } from "./[demoName]Timeline";
// import { DEMO_DATA } from "./demoData";

export interface ExampleDemoProps {
  showControls?: boolean;
  forceReducedMotion?: boolean;
  className?: string;
}

export function ExampleDemo({
  showControls = false,
  forceReducedMotion = false,
  className,
}: ExampleDemoProps) {
  return (
    <DemoPlayer
      // timeline={DEMO_TIMELINE}
      loop
      autoPlay
      showControls={showControls}
      forceReducedMotion={forceReducedMotion}
      className={className}
      aria-label="[Demo name] product demonstration"
      fallback={
        <div
          className="flex min-h-[22rem] items-center justify-center rounded-2xl border border-[var(--cos-border)] bg-[var(--cos-card)] text-sm text-[var(--cos-muted)]"
          aria-hidden
        >
          Preparing demo…
        </div>
      }
    >
      <Scene cue="start" holdAfter>
        {/* Static product chrome + engine primitives */}
      </Scene>
    </DemoPlayer>
  );
}

export default ExampleDemo;
