"use client";

import { useMemo } from "react";
import { useTimelineContext } from "../DemoTimeline";
import type { TimingProps } from "../types";
import {
  resolveTiming,
  timingIsActive,
  timingSegmentProgress,
  type ResolvedTiming,
} from "../utils/timeline";

export {
  useTimelineContext as useTimeline,
  useTimelineContextOptional,
} from "../DemoTimeline";

export interface UseTimingResult extends ResolvedTiming {
  active: boolean;
  progress: number;
  reducedMotion: boolean;
  currentTime: number;
}

/**
 * Resolve `at` / `until` / cue timing against the shared demo clock.
 */
export function useTiming(props: TimingProps): UseTimingResult {
  const timeline = useTimelineContext();
  const { at, until, cue, untilCue, duration, delay } = props;
  const timing = useMemo(
    () =>
      resolveTiming(
        { at, until, cue, untilCue, duration, delay },
        timeline.cueMap,
        timeline.duration,
      ),
    [at, until, cue, untilCue, duration, delay, timeline.cueMap, timeline.duration],
  );

  return {
    ...timing,
    active: timingIsActive(timeline.currentTime, timing),
    progress: timingSegmentProgress(timeline.currentTime, timing),
    reducedMotion: timeline.reducedMotion,
    currentTime: timeline.currentTime,
  };
}
