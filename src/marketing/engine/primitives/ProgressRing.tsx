"use client";

import { useState } from "react";
import { motion, useMotionValueEvent, useTransform } from "motion/react";
import { useTimelineContext } from "../DemoTimeline";
import type { PrimitiveBaseProps } from "../types";
import { clamp } from "../utils/interpolate";
import { resolveTiming } from "../utils/timeline";

export interface ProgressRingProps extends PrimitiveBaseProps {
  /** End progress (normalized against valueMax). */
  value?: number;
  from?: number;
  valueMax?: number;
  size?: number;
  strokeWidth?: number;
  trackColor?: string;
  fillColor?: string;
  label?: string;
  showLabel?: boolean;
}

export function ProgressRing({
  value = 1,
  from = 0,
  valueMax = 1,
  size = 72,
  strokeWidth = 6,
  trackColor = "var(--cos-border)",
  fillColor = "var(--cos-accent)",
  label,
  showLabel = true,
  at,
  until,
  cue,
  untilCue,
  delay,
  duration,
  className,
  style,
}: ProgressRingProps) {
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

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const progress = useTransform(timeline.time, (t) => {
    const start = from / valueMax;
    const end = value / valueMax;
    if (timeline.reducedMotion) return clamp(end, 0, 1);
    if (t < timing.at) return clamp(start, 0, 1);
    const p = clamp((t - timing.at) / animDuration, 0, 1);
    const eased = p * p * (3 - 2 * p);
    return clamp(start + (end - start) * eased, 0, 1);
  });

  const dashOffset = useTransform(progress, (p) => circumference * (1 - p));
  const [percent, setPercent] = useState(
    Math.round((timeline.reducedMotion ? value : from) / valueMax * 100),
  );

  useMotionValueEvent(progress, "change", (p) => {
    setPercent(Math.round(p * 100));
  });

  return (
    <div
      className={className}
      style={{ ...style, width: size, height: size, position: "relative" }}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      aria-label={label ?? "Progress"}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={fillColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          style={{ strokeDashoffset: dashOffset }}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      {showLabel ? (
        <span
          className="absolute inset-0 flex items-center justify-center text-xs font-medium tabular-nums text-[var(--cos-text)]"
          aria-hidden
        >
          {percent}%
        </span>
      ) : null}
    </div>
  );
}
