"use client";

import {
  Cursor,
  DemoPlayer,
  FadeSlide,
  Highlight,
  MouseClick,
  Toast,
  TypingAnimation,
  useTimeline,
} from "@/marketing/engine";
import { MarketingDemoShell } from "@/marketing/demos/_shared/MarketingDemoShell";
import { COMMUNICATIONS_HUB_DEMO } from "./demoData";
import { COMMUNICATIONS_HUB_TIMELINE } from "./communicationsHubTimeline";

export interface CommunicationsHubDemoProps {
  showControls?: boolean;
  forceReducedMotion?: boolean;
  className?: string;
}

export function CommunicationsHubDemo({
  showControls = false,
  forceReducedMotion = false,
  className,
}: CommunicationsHubDemoProps) {
  return (
    <DemoPlayer
      key={forceReducedMotion ? "comms-reduced" : "comms-motion"}
      timeline={COMMUNICATIONS_HUB_TIMELINE}
      loop
      autoPlay
      showControls={showControls}
      forceReducedMotion={forceReducedMotion}
      className={className}
      aria-label="Communications Hub product demonstration"
      fallback={
        <div
          className="flex min-h-[24rem] items-center justify-center rounded-2xl border border-[var(--cos-border)] bg-[var(--cos-card)] text-sm text-[var(--cos-muted)]"
          aria-hidden
        >
          Preparing demo…
        </div>
      }
    >
      <CommunicationsStage />
    </DemoPlayer>
  );
}

export default CommunicationsHubDemo;

function CommunicationsStage() {
  useTimeline();
  const { labels, queues, conversation, toast } = COMMUNICATIONS_HUB_DEMO;

  return (
    <MarketingDemoShell eyebrow={labels.workspace} title={labels.title}>
      <div className="relative flex h-full min-h-0 flex-col gap-3 p-3 sm:flex-row sm:p-4">
        <div className="w-full shrink-0 space-y-2 sm:w-[38%]">
          <div className="flex flex-wrap gap-1.5">
            {queues.map((queue, index) => (
              <span
                key={queue}
                className={
                  index === 0
                    ? "rounded-full bg-[var(--cos-text)] px-2.5 py-1 text-[11px] text-[var(--cos-card)]"
                    : "rounded-full border border-[var(--cos-border)] px-2.5 py-1 text-[11px] text-[var(--cos-muted)]"
                }
              >
                {queue}
              </span>
            ))}
          </div>
          <Highlight
            cue="open"
            untilCue="draft"
            className="rounded-xl border border-[var(--cos-border)] bg-[var(--cos-card)] p-3"
          >
            <p className="text-[10px] font-medium tracking-[0.12em] text-[var(--cos-muted)] uppercase">
              {labels.thread}
            </p>
            <p className="mt-1 text-sm font-medium text-[var(--cos-text)]">
              {conversation.from}
            </p>
            <p className="mt-1 text-sm text-[var(--cos-muted)]">
              {conversation.preview}
            </p>
          </Highlight>
        </div>

        <div className="min-w-0 flex-1 rounded-xl border border-[var(--cos-border)] bg-[var(--cos-card)] p-3 sm:p-4">
          <p className="text-xs text-[var(--cos-muted)]">{conversation.parent}</p>
          <div className="mt-3 max-w-[90%] rounded-2xl rounded-tl-md bg-[var(--cos-bg-alt)] px-3 py-2 text-sm text-[var(--cos-text)]">
            {conversation.preview}
          </div>

          <FadeSlide cue="draft" direction="up" distance={8} holdAfter>
            <div className="mt-4 space-y-2">
              <p className="text-[10px] font-medium tracking-[0.12em] text-[var(--cos-muted)] uppercase">
                AI draft
              </p>
              <div className="rounded-xl border border-[var(--cos-border)] bg-[var(--cos-bg)] px-3 py-2.5 text-sm leading-relaxed text-[var(--cos-text)]">
                <TypingAnimation
                  cue="draft"
                  text={conversation.draft}
                  charsPerSecond={28}
                />
              </div>
              <span
                data-send-cta
                className="inline-flex rounded-md bg-[var(--cos-text)] px-3 py-1.5 text-sm text-[var(--cos-card)]"
              >
                Approve & send
              </span>
            </div>
          </FadeSlide>
        </div>
      </div>

      <Cursor
        keyframes={[
          { at: 0, x: "20%", y: "35%", opacity: 0 },
          { at: 3.3, x: "20%", y: "35%", opacity: 0 },
          { at: 3.7, x: "22%", y: "42%", opacity: 1 },
          { at: 6, x: "22%", y: "42%", opacity: 1 },
          { at: 12.8, x: "62%", y: "78%", opacity: 1 },
          { at: 13.4, x: "62%", y: "78%", click: true, scale: 0.94 },
          { at: 14.5, x: "62%", y: "78%", opacity: 1 },
          { at: 15.5, x: "80%", y: "40%", opacity: 0 },
        ]}
      />
      <MouseClick
        cue="send-click"
        x="62%"
        y="78%"
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
