"use client";

import {
  Cursor,
  DemoPlayer,
  MouseClick,
  Scene,
  Toast,
  useTimeline,
} from "@/marketing/engine";
import { CREATE_AI_TIMELINE } from "./createAITimeline";
import { CREATE_AI_DEMO } from "./demoData";
import { CreateAIPanel } from "./components/CreateAIPanel";
import { DemoShell } from "./components/DemoShell";
import { EventSummary } from "./components/EventSummary";

export interface CreateAIDemoProps {
  /** Show authoring controls under the demo. Default false. */
  showControls?: boolean;
  /** Force reduced motion for harness testing. */
  forceReducedMotion?: boolean;
  className?: string;
}

/**
 * Create with AI marketing demo — static fixtures + Marketing Motion Engine.
 * Not wired to live product data or dashboard components.
 */
export function CreateAIDemo({
  showControls = false,
  forceReducedMotion = false,
  className,
}: CreateAIDemoProps) {
  return (
    <DemoPlayer
      key={forceReducedMotion ? "create-ai-reduced" : "create-ai-motion"}
      timeline={CREATE_AI_TIMELINE}
      loop
      autoPlay
      showControls={showControls}
      forceReducedMotion={forceReducedMotion}
      className={className}
      aria-label="Create with AI product demonstration"
      fallback={
        <div
          className="flex min-h-[22rem] items-center justify-center rounded-2xl border border-[var(--cos-border)] bg-[var(--cos-card)] text-sm text-[var(--cos-muted)] md:aspect-[16/10] md:min-h-0"
          aria-hidden
        >
          Preparing demo…
        </div>
      }
    >
      <CreateAIDemoStage />
    </DemoPlayer>
  );
}

export default CreateAIDemo;

function CreateAIDemoStage() {
  // Ensure we are inside the player timeline (throws clearly if mis-mounted).
  useTimeline();

  return (
    <DemoShell>
      <div className="relative h-full min-h-0">
        <div className="h-full min-h-0 md:max-w-[48%]">
          <EventSummary ctaId="create-ai-cta" />
        </div>

        <Cursor
          keyframes={[
            { at: 0, x: "14%", y: "70%", opacity: 0, scale: 0.96 },
            { at: 2.3, x: "14%", y: "70%", opacity: 0 },
            { at: 2.55, x: "18%", y: "78%", opacity: 1, scale: 1 },
            { at: 3.5, x: "22%", y: "86%", opacity: 1 },
            { at: 3.6, x: "22%", y: "86%", click: true, scale: 0.94 },
            { at: 4.2, x: "22%", y: "86%", opacity: 1 },
            { at: 4.8, x: "62%", y: "42%", opacity: 0 },
          ]}
        />
        <MouseClick
          cue="create-click"
          x="22%"
          y="86%"
          showRipple
          rippleSize={40}
          duration={0.22}
        />

        <Scene
          cue="panel-open"
          holdAfter
          enterDirection="up"
          enterDuration={0.45}
          className="absolute inset-x-0 bottom-0 top-[32%] z-10 min-h-0 md:inset-y-0 md:left-[46%] md:right-0 md:top-0"
        >
          <CreateAIPanel />
        </Scene>
      </div>

      <Toast
        cue="toast"
        title={CREATE_AI_DEMO.toast.title}
        description={CREATE_AI_DEMO.toast.description}
        status="success"
        announce={false}
        className="pointer-events-none absolute bottom-3 left-3 right-3 z-20 flex max-w-sm items-start gap-2 rounded-xl border border-[var(--cos-success)]/30 bg-[var(--cos-success-bg)] px-3 py-2.5 shadow-sm sm:left-auto sm:right-3"
      />
    </DemoShell>
  );
}
