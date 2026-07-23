"use client";

import {
  AutoScroll,
  FadeSlide,
  ProgressBar,
  Scene,
  Skeleton,
} from "@/marketing/engine";
import { CREATE_AI_DEMO } from "../demoData";
import { ArtworkPreview } from "./ArtworkPreview";
import { CaptionPreview } from "./CaptionPreview";
import { MilestoneTimeline } from "./MilestoneTimeline";

/**
 * Create with AI workspace panel — preparation, then campaign outputs.
 */
export function CreateAIPanel() {
  return (
    <aside
      className="flex h-full min-h-0 flex-col border-t border-[var(--cos-border)] bg-[var(--cos-card)] md:border-l md:border-t-0"
      aria-label={CREATE_AI_DEMO.labels.panel}
    >
      <div className="border-b border-[var(--cos-border)] px-3 py-2.5 sm:px-4">
        <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-[var(--cos-muted)] sm:text-xs">
          {CREATE_AI_DEMO.labels.panel}
        </p>
        <p className="text-sm font-medium text-[var(--cos-text)]">
          Campaign draft
        </p>
      </div>

      <AutoScroll
        cue="milestones"
        target="[data-create-ai-milestones]"
        duration={1.1}
        className="min-h-0 flex-1 space-y-4 p-3 sm:p-4"
      >
        <Scene cue="preparing" untilCue="artwork" unmountOnExit>
          <div className="space-y-3 rounded border border-[var(--cos-border)] bg-[var(--cos-bg)]/40 p-3">
            <p className="text-sm text-[var(--cos-text)]">
              {CREATE_AI_DEMO.preparing}
            </p>
            <ProgressBar
              cue="preparing"
              untilCue="artwork"
              value={1}
              from={0.08}
              duration={2.2}
              height={6}
            />
            <Skeleton cue="preparing" untilCue="artwork" rows={3} shimmer />
          </div>
        </Scene>

        <FadeSlide cue="artwork" direction="up" distance={10} holdAfter>
          <ArtworkPreview />
        </FadeSlide>

        <FadeSlide cue="caption" direction="up" distance={8} holdAfter>
          <CaptionPreview />
        </FadeSlide>

        <FadeSlide
          cue="milestones"
          direction="up"
          distance={8}
          holdAfter
          className="pb-2"
        >
          <div data-create-ai-milestones>
            <MilestoneTimeline />
          </div>
        </FadeSlide>
      </AutoScroll>
    </aside>
  );
}
