"use client";

import {
  Cursor,
  DemoPlayer,
  MouseClick,
  Toast,
  useTimeline,
} from "@/marketing/engine";
import { MarketingDemoShell } from "@/marketing/demos/_shared/MarketingDemoShell";
import { ApprovalsHub } from "./components/ApprovalsHub";
import { APPROVALS_DEMO } from "./demoData";
import { APPROVALS_TIMELINE } from "./approvalsTimeline";

export interface ApprovalsDemoProps {
  showControls?: boolean;
  forceReducedMotion?: boolean;
  className?: string;
}

export function ApprovalsDemo({
  showControls = false,
  forceReducedMotion = false,
  className,
}: ApprovalsDemoProps) {
  return (
    <DemoPlayer
      key={forceReducedMotion ? "approvals-reduced" : "approvals-motion"}
      timeline={APPROVALS_TIMELINE}
      loop
      autoPlay
      showControls={showControls}
      forceReducedMotion={forceReducedMotion}
      className={className}
      aria-label="Approvals product demonstration"
      fallback={
        <div
          className="flex h-[28rem] items-center justify-center rounded-2xl border border-[var(--cos-border)] bg-[var(--cos-card)] text-sm text-[var(--cos-muted)] sm:h-[30rem] lg:h-[32rem]"
          aria-hidden
        >
          Preparing demo…
        </div>
      }
    >
      <ApprovalsStage />
    </DemoPlayer>
  );
}

export default ApprovalsDemo;

function ApprovalsStage() {
  useTimeline();

  return (
    <MarketingDemoShell
      eyebrow={APPROVALS_DEMO.labels.workspace}
      title={APPROVALS_DEMO.labels.title}
    >
      <ApprovalsHub />
      <Cursor
        keyframes={[
          { at: 0, x: "50%", y: "40%", opacity: 0 },
          { at: 3.2, x: "50%", y: "40%", opacity: 0 },
          { at: 3.6, x: "45%", y: "42%", opacity: 1 },
          { at: 6.3, x: "45%", y: "42%", opacity: 1 },
          { at: 7.2, x: "88%", y: "44%", opacity: 1 },
          { at: 7.6, x: "88%", y: "44%", click: true, scale: 0.94 },
          { at: 9.5, x: "88%", y: "44%", opacity: 0 },
          { at: 13.8, x: "70%", y: "88%", opacity: 0 },
          { at: 14.3, x: "62%", y: "90%", opacity: 1 },
          { at: 15.2, x: "62%", y: "90%", click: true, scale: 0.94 },
          { at: 16.5, x: "62%", y: "90%", opacity: 1 },
          { at: 17.5, x: "80%", y: "40%", opacity: 0 },
        ]}
      />
      <MouseClick
        cue="view-click"
        x="88%"
        y="44%"
        showRipple
        rippleSize={36}
        duration={0.2}
      />
      <MouseClick
        cue="approve-click"
        x="62%"
        y="90%"
        showRipple
        rippleSize={36}
        duration={0.2}
      />
      <Toast
        cue="toast"
        title={APPROVALS_DEMO.toast.title}
        description={APPROVALS_DEMO.toast.description}
        status="success"
        announce={false}
        className="pointer-events-none absolute bottom-3 left-3 right-3 z-30 flex max-w-sm items-start gap-2 rounded-xl border border-[var(--cos-success)]/30 bg-[var(--cos-success-bg)] px-3 py-2.5 shadow-sm sm:left-auto sm:right-3"
      />
    </MarketingDemoShell>
  );
}
