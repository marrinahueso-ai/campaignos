"use client";

import { motion, useTransform } from "motion/react";
import { useTimelineContext } from "../DemoTimeline";
import type { PrimitiveBaseProps } from "../types";
import { resolveTiming } from "../utils/timeline";

export interface SkeletonProps extends PrimitiveBaseProps {
  rows?: number;
  /** Enable subtle shimmer. Auto-disabled for reduced motion / off-playing. */
  shimmer?: boolean;
  radius?: number;
}

/**
 * Placeholder skeleton. Shimmer is CSS-transform based and pauses when not playing.
 */
export function Skeleton({
  rows = 3,
  shimmer = true,
  radius = 8,
  at,
  until,
  cue,
  untilCue,
  delay,
  duration,
  className,
  style,
}: SkeletonProps) {
  const timeline = useTimelineContext();
  const timing = resolveTiming(
    { at, until, cue, untilCue, delay, duration },
    timeline.cueMap,
    timeline.duration,
  );

  const visible = useTransform(timeline.time, (t) => {
    if (t < timing.at) return 0;
    if (timing.until !== undefined && t >= timing.until) return 0;
    return 1;
  });

  const shimmerX = useTransform(timeline.time, (t) => {
    if (
      !shimmer ||
      timeline.reducedMotion ||
      !timeline.isPlaying ||
      t < timing.at ||
      (timing.until !== undefined && t >= timing.until)
    ) {
      return "-100%";
    }
    const local = t - timing.at;
    const cycle = 1.6;
    const p = (local % cycle) / cycle;
    return `${-100 + p * 200}%`;
  });

  return (
    <motion.div
      className={className ?? "space-y-2"}
      style={{ ...style, opacity: visible }}
      aria-hidden
    >
      {Array.from({ length: rows }, (_, index) => (
        <div
          key={index}
          className="relative overflow-hidden bg-[var(--cos-bg-alt)]"
          style={{
            height: index === rows - 1 ? 10 : 12,
            width: index === rows - 1 ? "70%" : "100%",
            borderRadius: radius,
          }}
        >
          {shimmer && !timeline.reducedMotion ? (
            <motion.div
              className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-[color-mix(in_srgb,var(--cos-card)_65%,transparent)] to-transparent"
              style={{ x: shimmerX }}
            />
          ) : null}
        </div>
      ))}
    </motion.div>
  );
}
