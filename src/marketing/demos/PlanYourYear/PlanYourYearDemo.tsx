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
          className="flex h-[28rem] items-center justify-center rounded-2xl border border-[var(--cos-border)] bg-[var(--cos-card)] text-sm text-[var(--cos-muted)] sm:h-[30rem] lg:h-[32rem]"
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
          { at: 0, x: "44%", y: "40%", opacity: 0 },
          { at: 2.3, x: "44%", y: "40%", opacity: 0 },
          { at: 2.7, x: "46%", y: "42%", opacity: 1 },
          { at: 3.5, x: "44%", y: "40%", opacity: 1 },
          { at: 3.6, x: "44%", y: "40%", click: true, scale: 0.94 },
          { at: 4.2, x: "44%", y: "38%", opacity: 1 },
          { at: 6.0, x: "56%", y: "32%", opacity: 1 },
          { at: 8.0, x: "70%", y: "38%", opacity: 1 },
          { at: 8.3, x: "70%", y: "38%", click: true, scale: 0.94 },
          { at: 9.0, x: "70%", y: "38%", opacity: 1 },
          { at: 9.5, x: "42%", y: "34%", opacity: 1 },
          { at: 10.4, x: "42%", y: "34%", click: true, scale: 0.94 },
          { at: 11.2, x: "42%", y: "34%", opacity: 1 },
          { at: 12.0, x: "78%", y: "50%", opacity: 0.35 },
          { at: 15.6, x: "78%", y: "78%", opacity: 0 },
          { at: 16.2, x: "72%", y: "86%", opacity: 1 },
          { at: 17.0, x: "72%", y: "86%", click: true, scale: 0.94 },
          { at: 18.2, x: "72%", y: "86%", opacity: 1 },
          { at: 19.2, x: "88%", y: "40%", opacity: 0 },
        ]}
      />
      <MouseClick
        cue="grab-click"
        x="44%"
        y="40%"
        showRipple
        rippleSize={28}
        duration={0.18}
      />
      <MouseClick
        cue="drop-click"
        x="70%"
        y="38%"
        showRipple
        rippleSize={28}
        duration={0.18}
      />
      <MouseClick
        cue="event-click"
        x="42%"
        y="34%"
        showRipple
        rippleSize={30}
        duration={0.18}
      />
      <MouseClick
        cue="hub-click"
        x="72%"
        y="86%"
        showRipple
        rippleSize={34}
        duration={0.2}
      />
      <Toast
        cue="toast"
        title={PLAN_YOUR_YEAR_DEMO.toast.title}
        description={PLAN_YOUR_YEAR_DEMO.toast.description}
        status="success"
        announce={false}
        className="pointer-events-none absolute bottom-3 left-3 right-3 z-40 flex max-w-sm items-start gap-2 rounded-xl border border-[var(--cos-success)]/30 bg-[var(--cos-success-bg)] px-3 py-2.5 shadow-sm sm:left-auto sm:right-3"
      />
    </MarketingDemoShell>
  );
}
