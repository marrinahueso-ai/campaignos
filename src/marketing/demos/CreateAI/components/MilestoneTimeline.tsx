"use client";

import { FadeSlide } from "@/marketing/engine";
import { CREATE_AI_DEMO } from "../demoData";

const MILESTONE_CUES = ["milestones", "milestone-2", "milestone-3"] as const;

/**
 * Staggered campaign milestones — each enters on its own cue.
 */
export function MilestoneTimeline() {
  const { milestones, labels } = CREATE_AI_DEMO;

  return (
    <section className="space-y-2">
      <h3 className="text-[10px] font-medium uppercase tracking-[0.12em] text-[var(--cos-muted)] sm:text-xs">
        {labels.milestones}
      </h3>
      <ul className="overflow-hidden border border-[var(--cos-border)] bg-[var(--cos-card)]">
        {milestones.map((milestone, index) => (
          <li key={milestone.id}>
            <FadeSlide
              cue={MILESTONE_CUES[index] ?? "milestones"}
              direction="up"
              distance={8}
              holdAfter
              className={
                index < milestones.length - 1
                  ? "border-b border-[var(--cos-border)]"
                  : undefined
              }
            >
              <div className="flex items-center justify-between gap-3 px-3 py-2.5">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[var(--cos-border)] bg-[var(--cos-success-bg)] text-[10px] font-semibold text-[var(--cos-success-text)]"
                    aria-hidden
                  >
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[var(--cos-text)]">
                      {milestone.label}
                    </p>
                    <p className="truncate text-xs text-[var(--cos-muted)]">
                      {milestone.timing}
                    </p>
                  </div>
                </div>
                <span className="shrink-0 bg-[var(--cos-success-bg)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--cos-success-text)]">
                  Ready
                </span>
              </div>
            </FadeSlide>
          </li>
        ))}
      </ul>
    </section>
  );
}
