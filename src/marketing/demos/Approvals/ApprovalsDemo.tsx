"use client";

import {
  BadgeChange,
  Cursor,
  DemoPlayer,
  Highlight,
  MouseClick,
  Toast,
  useTimeline,
} from "@/marketing/engine";
import { MarketingDemoShell } from "@/marketing/demos/_shared/MarketingDemoShell";
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
          className="flex min-h-[24rem] items-center justify-center rounded-2xl border border-[var(--cos-border)] bg-[var(--cos-card)] text-sm text-[var(--cos-muted)]"
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
  const { item, filters, queue, labels, toast } = APPROVALS_DEMO;

  return (
    <MarketingDemoShell eyebrow={labels.workspace} title={labels.title}>
      <div className="relative flex h-full min-h-0 flex-col gap-3 p-3 sm:p-4">
        <div className="flex flex-wrap gap-2">
          {filters.map((filter, index) => (
            <span
              key={filter}
              className={
                index === 0
                  ? "rounded-full bg-[var(--cos-text)] px-3 py-1 text-xs text-[var(--cos-card)]"
                  : "rounded-full border border-[var(--cos-border)] bg-[var(--cos-card)] px-3 py-1 text-xs text-[var(--cos-muted)]"
              }
            >
              {filter}
            </span>
          ))}
        </div>

        <Highlight
          cue="focus"
          untilCue="done"
          className="rounded-xl border border-[var(--cos-border)] bg-[var(--cos-card)] p-3 sm:p-4"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-medium tracking-[0.12em] text-[var(--cos-muted)] uppercase">
                {item.milestone}
              </p>
              <p className="mt-1 font-serif text-lg text-[var(--cos-text)]">
                {item.event}
              </p>
              <p className="mt-1 text-sm text-[var(--cos-muted)]">
                Reviewer {item.assignee} · {item.schedule}
              </p>
            </div>
            <BadgeChange
              cue="done"
              fromLabel={item.statusStart}
              toLabel={item.statusEnd}
              className="rounded-full border border-[var(--cos-border)] px-2.5 py-1 text-xs"
            />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <span
              data-approve-cta
              className="rounded-md bg-[var(--cos-text)] px-3 py-1.5 text-sm text-[var(--cos-card)]"
            >
              Approve
            </span>
            <span className="rounded-md border border-[var(--cos-border)] px-3 py-1.5 text-sm text-[var(--cos-muted)]">
              Request changes
            </span>
          </div>
        </Highlight>

        <ul className="space-y-2">
          {queue.map((row) => (
            <li
              key={row.milestone}
              className="flex items-center justify-between gap-3 rounded-lg border border-[var(--cos-border)] bg-[var(--cos-card)]/70 px-3 py-2 text-sm"
            >
              <span className="text-[var(--cos-text)]">
                {row.milestone}
                <span className="text-[var(--cos-muted)]"> · {row.event}</span>
              </span>
              <span className="text-xs text-[var(--cos-muted)]">{row.status}</span>
            </li>
          ))}
        </ul>
      </div>

      <Cursor
        keyframes={[
          { at: 0, x: "50%", y: "40%", opacity: 0 },
          { at: 3.3, x: "50%", y: "40%", opacity: 0 },
          { at: 3.6, x: "40%", y: "38%", opacity: 1 },
          { at: 6.3, x: "40%", y: "38%", opacity: 1 },
          { at: 7.2, x: "22%", y: "52%", opacity: 1 },
          { at: 7.6, x: "22%", y: "52%", click: true, scale: 0.94 },
          { at: 9, x: "22%", y: "52%", opacity: 1 },
          { at: 10.5, x: "78%", y: "30%", opacity: 0 },
        ]}
      />
      <MouseClick
        cue="approve-click"
        x="22%"
        y="52%"
        showRipple
        rippleSize={36}
        duration={0.2}
      />
      <Toast
        cue="toast"
        title={toast.title}
        description={toast.description}
        status="success"
        announce={false}
        className="pointer-events-none absolute bottom-3 left-3 right-3 z-20 flex max-w-sm items-start gap-2 rounded-xl border border-[var(--cos-success)]/30 bg-[var(--cos-success-bg)] px-3 py-2.5 shadow-sm sm:left-auto sm:right-3"
      />
    </MarketingDemoShell>
  );
}
