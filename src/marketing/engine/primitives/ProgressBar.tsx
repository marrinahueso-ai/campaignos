"use client";

import { useState } from "react";
import { motion, useMotionValueEvent, useTransform } from "motion/react";
import { useTimelineContext } from "../DemoTimeline";
import type { PrimitiveBaseProps } from "../types";
import { clamp } from "../utils/interpolate";
import { resolveTiming } from "../utils/timeline";

export interface ProgressBarProps extends PrimitiveBaseProps {
  value?: number;
  from?: number;
  valueMax?: number;
  label?: string;
  trackClassName?: string;
  fillClassName?: string;
  height?: number;
}

/**
 * Progress bar animated via scaleX (transform) to avoid layout thrashing.
 */
export function ProgressBar({
  value = 1,
  from = 0,
  valueMax = 1,
  label,
  trackClassName,
  fillClassName,
  height = 8,
  at,
  until,
  cue,
  untilCue,
  delay,
  duration,
  className,
  style,
}: ProgressBarProps) {
  const timeline = useTimelineContext();
  const timing = resolveTiming(
    { at, until, cue, untilCue, delay, duration },
    timeline.cueMap,
    timeline.duration,
  );

  const animDuration =
    timing.duration ??
    (timing.until !== undefined
      ? Math.max(0.01, timing.until - timing.at)
      : 1);

  const progress = useTransform(timeline.time, (t) => {
    const start = from / valueMax;
    const end = value / valueMax;
    if (timeline.reducedMotion) return clamp(end, 0, 1);
    if (t < timing.at) return clamp(start, 0, 1);
    const p = clamp((t - timing.at) / animDuration, 0, 1);
    const eased = p * p * (3 - 2 * p);
    return clamp(start + (end - start) * eased, 0, 1);
  });

  const [percent, setPercent] = useState(
    Math.round(((timeline.reducedMotion ? value : from) / valueMax) * 100),
  );
  useMotionValueEvent(progress, "change", (p) => setPercent(Math.round(p * 100)));

  return (
    <div
      className={className}
      style={style}
      role="progressbar"
      aria-label={label ?? "Progress"}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
    >
      <div
        className={
          trackClassName ??
          "w-full overflow-hidden rounded-full bg-[var(--cos-border)]"
        }
        style={{ height }}
      >
        <motion.div
          className={
            fillClassName ??
            "h-full origin-left rounded-full bg-[var(--cos-accent)]"
          }
          style={{ scaleX: progress }}
        />
      </div>
    </div>
  );
}
