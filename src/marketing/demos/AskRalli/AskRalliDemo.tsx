"use client";

import {
  DemoPlayer,
  FadeSlide,
  Toast,
  TypingAnimation,
  useTimeline,
} from "@/marketing/engine";
import { MarketingDemoShell } from "@/marketing/demos/_shared/MarketingDemoShell";
import { ASK_RALLI_DEMO } from "./demoData";
import { ASK_RALLI_TIMELINE } from "./askRalliTimeline";

export interface AskRalliDemoProps {
  showControls?: boolean;
  forceReducedMotion?: boolean;
  className?: string;
}

export function AskRalliDemo({
  showControls = false,
  forceReducedMotion = false,
  className,
}: AskRalliDemoProps) {
  return (
    <DemoPlayer
      key={forceReducedMotion ? "ask-reduced" : "ask-motion"}
      timeline={ASK_RALLI_TIMELINE}
      loop
      autoPlay
      showControls={showControls}
      forceReducedMotion={forceReducedMotion}
      className={className}
      aria-label="Ask Ralli product demonstration"
      fallback={
        <div
          className="flex min-h-[24rem] items-center justify-center rounded-2xl border border-[var(--cos-border)] bg-[var(--cos-card)] text-sm text-[var(--cos-muted)]"
          aria-hidden
        >
          Preparing demo…
        </div>
      }
    >
      <AskRalliStage />
    </DemoPlayer>
  );
}

export default AskRalliDemo;

function AskRalliStage() {
  useTimeline();
  const { labels, question, answer, chips, toast } = ASK_RALLI_DEMO;

  return (
    <MarketingDemoShell eyebrow={labels.workspace} title={labels.title}>
      <div className="flex h-full min-h-0 flex-col gap-3 p-3 sm:p-4">
        <div className="rounded-xl border border-[var(--cos-border)] bg-[var(--cos-card)] p-3 sm:p-4">
          <p className="text-[10px] font-medium tracking-[0.12em] text-[var(--cos-muted)] uppercase">
            You
          </p>
          <div className="mt-2 min-h-[3rem] text-sm leading-relaxed text-[var(--cos-text)] sm:text-base">
            <TypingAnimation
              cue="question"
              text={question}
              charsPerSecond={26}
              as="p"
            />
          </div>
        </div>

        <FadeSlide cue="answer" direction="up" distance={10} holdAfter>
          <div className="rounded-xl border border-[var(--cos-border)] bg-[var(--cos-bg)] p-3 sm:p-4">
            <p className="text-[10px] font-medium tracking-[0.12em] text-[var(--cos-muted)] uppercase">
              Ask Ralli
            </p>
            <div className="mt-2 text-sm leading-relaxed text-[var(--cos-text)] sm:text-base">
              <TypingAnimation
                cue="answer"
                text={answer}
                charsPerSecond={32}
                as="p"
              />
            </div>
            <FadeSlide cue="chips" direction="up" distance={6} holdAfter>
              <div className="mt-4 flex flex-wrap gap-2">
                {chips.map((chip, index) => (
                  <span
                    key={chip}
                    className={
                      index === 0
                        ? "rounded-full bg-[var(--cos-text)] px-3 py-1.5 text-xs text-[var(--cos-card)]"
                        : "rounded-full border border-[var(--cos-border)] bg-[var(--cos-card)] px-3 py-1.5 text-xs text-[var(--cos-text)]"
                    }
                  >
                    {chip}
                  </span>
                ))}
              </div>
            </FadeSlide>
          </div>
        </FadeSlide>
      </div>

      <Toast
        cue="toast"
        title={toast.title}
        description={toast.description}
        status="info"
        announce={false}
        className="pointer-events-none absolute bottom-3 left-3 right-3 z-20 flex max-w-sm items-start gap-2 rounded-xl border border-[var(--cos-border)] bg-[var(--cos-card)] px-3 py-2.5 shadow-sm sm:left-auto sm:right-3"
      />
    </MarketingDemoShell>
  );
}
