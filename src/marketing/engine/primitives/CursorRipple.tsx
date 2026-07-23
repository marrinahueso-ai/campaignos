"use client";

import { motion, useTransform } from "motion/react";
import { useTimelineContext } from "../DemoTimeline";
import type { PrimitiveBaseProps } from "../types";
import { clamp, resolveCoordinate } from "../utils/interpolate";
import { resolveTiming } from "../utils/timeline";

export interface CursorRippleProps extends PrimitiveBaseProps {
  x?: number | string;
  y?: number | string;
  size?: number;
  color?: string;
  maxOpacity?: number;
}

/**
 * Click ripple. Timeline-driven; no independent timers.
 */
export function CursorRipple({
  x = "50%",
  y = "50%",
  size = 48,
  color = "var(--cos-accent)",
  maxOpacity = 0.35,
  at,
  until,
  cue,
  untilCue,
  delay,
  duration = 0.55,
  className,
  style,
}: CursorRippleProps) {
  const timeline = useTimelineContext();
  const timing = resolveTiming(
    { at, until, cue, untilCue, delay, duration },
    timeline.cueMap,
    timeline.duration,
  );

  const progress = useTransform(timeline.time, (t) => {
    if (timeline.reducedMotion) return 0;
    return clamp((t - timing.at) / (timing.duration ?? duration), 0, 1);
  });

  const opacity = useTransform(progress, (p) => {
    if (p <= 0 || p >= 1) return 0;
    return maxOpacity * (1 - p);
  });

  const scale = useTransform(progress, (p) => 0.35 + p * 0.9);

  const left =
    typeof x === "number" ? x : undefined;
  const top =
    typeof y === "number" ? y : undefined;

  return (
    <motion.div
      aria-hidden
      className={className}
      style={{
        ...style,
        position: "absolute",
        left: left ?? x,
        top: top ?? y,
        width: size,
        height: size,
        marginLeft: -size / 2,
        marginTop: -size / 2,
        borderRadius: 9999,
        border: `2px solid ${color}`,
        opacity,
        scale,
        pointerEvents: "none",
      }}
    />
  );
}

/** Helper for percentage positioning when parent size is known. */
export function rippleOffset(
  value: number | string,
  axisSize: number,
): number {
  return resolveCoordinate(value, axisSize, axisSize / 2);
}
