"use client";

import { TypingAnimation } from "@/marketing/engine";
import { CREATE_AI_DEMO } from "../demoData";

/**
 * Caption preview — typing is timeline-driven via TypingAnimation.
 */
export function CaptionPreview() {
  const { caption, labels } = CREATE_AI_DEMO;

  return (
    <section className="space-y-2">
      <h3 className="text-[10px] font-medium uppercase tracking-[0.12em] text-[var(--cos-muted)] sm:text-xs">
        {labels.caption}
      </h3>
      <div className="rounded border border-[var(--cos-border)] bg-[var(--cos-bg)]/60 p-3 text-sm leading-relaxed text-[var(--cos-text)]">
        <TypingAnimation
          cue="caption"
          untilCue="milestones"
          text={caption}
          duration={3.8}
          charsPerSecond={32}
          showCursor
          blinkCursor
          className="text-sm leading-relaxed"
          as="p"
        />
      </div>
    </section>
  );
}
