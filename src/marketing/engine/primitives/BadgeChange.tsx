"use client";

import { motion, useTransform } from "motion/react";
import { useTimelineContext } from "../DemoTimeline";
import { useMotionConfig } from "../MotionProvider";
import type { PrimitiveBaseProps } from "../types";
import { clamp } from "../utils/interpolate";
import { resolveTiming } from "../utils/timeline";

export interface BadgeChangeProps extends PrimitiveBaseProps {
  fromLabel: string;
  toLabel: string;
  fromClassName?: string;
  toClassName?: string;
}

/**
 * Cross-fade badge label change. Meaning must not rely on color alone —
 * labels themselves convey status.
 */
export function BadgeChange({
  fromLabel,
  toLabel,
  fromClassName,
  toClassName,
  at,
  until,
  cue,
  untilCue,
  delay,
  duration,
  className,
  style,
}: BadgeChangeProps) {
  const timeline = useTimelineContext();
  const { defaults } = useMotionConfig();
  const timing = resolveTiming(
    { at, until, cue, untilCue, delay, duration },
    timeline.cueMap,
    timeline.duration,
  );
  const enter = timing.duration ?? defaults.duration;

  const progress = useTransform(timeline.time, (t) => {
    if (timeline.reducedMotion) return t >= timing.at ? 1 : 0;
    if (t < timing.at) return 0;
    return clamp((t - timing.at) / enter, 0, 1);
  });

  const fromOpacity = useTransform(progress, (p) => 1 - p);
  const toOpacity = useTransform(progress, (p) => p);
  const fromY = useTransform(progress, (p) => (timeline.reducedMotion ? 0 : -4 * p));
  const toY = useTransform(progress, (p) => (timeline.reducedMotion ? 0 : 4 * (1 - p)));

  const showingTo =
    timeline.reducedMotion
      ? timeline.currentTime >= timing.at
      : timeline.currentTime >= timing.at + enter * 0.5;

  return (
    <span
      className={
        className ??
        "relative inline-flex min-w-[4.5rem] items-center justify-center overflow-hidden rounded-full px-2.5 py-0.5 text-xs font-medium"
      }
      style={style}
      aria-label={showingTo ? toLabel : fromLabel}
    >
      <motion.span
        className={
          fromClassName ??
          "absolute inset-0 flex items-center justify-center bg-[var(--cos-bg-alt)] text-[var(--cos-muted)]"
        }
        style={{ opacity: fromOpacity, y: fromY }}
        aria-hidden
      >
        {fromLabel}
      </motion.span>
      <motion.span
        className={
          toClassName ??
          "absolute inset-0 flex items-center justify-center bg-[var(--cos-success-bg)] text-[var(--cos-success-text)]"
        }
        style={{ opacity: toOpacity, y: toY }}
        aria-hidden
      >
        {toLabel}
      </motion.span>
      <span className="invisible">{toLabel.length >= fromLabel.length ? toLabel : fromLabel}</span>
    </span>
  );
}
