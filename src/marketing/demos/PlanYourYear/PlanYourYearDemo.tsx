"use client";

import {
  Cursor,
  DemoPlayer,
  MouseClick,
  Toast,
  useTimeline,
} from "@/marketing/engine";
import { MarketingDemoShell } from "@/marketing/demos/_shared/MarketingDemoShell";
import { CalendarStage } from "./components/CalendarStage";
import { PLAN_YOUR_YEAR_DEMO } from "./demoData";
import { PLAN_YOUR_YEAR_TIMELINE } from "./planYourYearTimeline";

export interface PlanYourYearDemoProps {
  showControls?: boolean;
  forceReducedMotion?: boolean;
  className?: string;
}

export function PlanYourYearDemo({
  showControls = false,
  forceReducedMotion = false,
  className,
}: PlanYourYearDemoProps) {
  return (
    <DemoPlayer
      key={forceReducedMotion ? "plan-year-reduced" : "plan-year-motion"}
      timeline={PLAN_YOUR_YEAR_TIMELINE}
      loop
      autoPlay
      showControls={showControls}
      forceReducedMotion={forceReducedMotion}
      className={className}
      aria-label="Plan Your Year product demonstration"
      fallback={
        <div
          className="flex min-h-[24rem] items-center justify-center rounded-2xl border border-[var(--cos-border)] bg-[var(--cos-card)] text-sm text-[var(--cos-muted)]"
          aria-hidden
        >
          Preparing demo…
        </div>
      }
    >
      <PlanYourYearStage />
    </DemoPlayer>
  );
}

export default PlanYourYearDemo;

function PlanYourYearStage() {
  useTimeline();

  return (
    <MarketingDemoShell
      eyebrow={PLAN_YOUR_YEAR_DEMO.labels.workspace}
      title={PLAN_YOUR_YEAR_DEMO.labels.month}
    >
      <CalendarStage />
      <Cursor
        keyframes={[
          { at: 0, x: "18%", y: "40%", opacity: 0 },
          { at: 2.8, x: "18%", y: "40%", opacity: 0 },
          { at: 3.1, x: "22%", y: "38%", opacity: 1 },
          { at: 4.1, x: "28%", y: "42%", opacity: 1 },
          { at: 4.2, x: "28%", y: "42%", click: true, scale: 0.94 },
          { at: 5.2, x: "28%", y: "42%", opacity: 1 },
          { at: 6.2, x: "72%", y: "36%", opacity: 0 },
        ]}
      />
      <MouseClick
        cue="select-click"
        x="28%"
        y="42%"
        showRipple
        rippleSize={36}
        duration={0.2}
      />
      <Toast
        cue="toast"
        title={PLAN_YOUR_YEAR_DEMO.toast.title}
        description={PLAN_YOUR_YEAR_DEMO.toast.description}
        status="success"
        announce={false}
        className="pointer-events-none absolute bottom-3 left-3 right-3 z-20 flex max-w-sm items-start gap-2 rounded-xl border border-[var(--cos-success)]/30 bg-[var(--cos-success-bg)] px-3 py-2.5 shadow-sm sm:left-auto sm:right-3"
      />
    </MarketingDemoShell>
  );
}
