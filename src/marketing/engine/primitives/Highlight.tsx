"use client";

import type { ReactNode } from "react";
import { motion, useTransform } from "motion/react";
import { useTimelineContext } from "../DemoTimeline";
import type { PrimitiveBaseProps } from "../types";
import { clamp } from "../utils/interpolate";
import { resolveTiming } from "../utils/timeline";

export interface HighlightProps extends PrimitiveBaseProps {
  children?: ReactNode;
  intensity?: number;
  variant?: "outline" | "tint" | "underlay" | "border";
}

/**
 * Calm emphasis for buttons / targets. No neon glow.
 */
export function Highlight({
  children,
  intensity = 1,
  variant = "outline",
  at,
  until,
  cue,
  untilCue,
  delay,
  duration,
  className,
  style,
}: HighlightProps) {
  const timeline = useTimelineContext();
  const timing = resolveTiming(
    { at, until, cue, untilCue, delay, duration },
    timeline.cueMap,
    timeline.duration,
  );

  const active = useTransform(timeline.time, (t) => {
    if (timeline.reducedMotion) {
      return t >= timing.at && (timing.until === undefined || t < timing.until)
        ? 1
        : 0;
    }
    if (t < timing.at) return 0;
    if (timing.until !== undefined && t >= timing.until) {
      const fade = 0.25;
      return clamp(1 - (t - timing.until) / fade, 0, 1);
    }
    const enter = timing.duration ?? 0.25;
    return clamp((t - timing.at) / enter, 0, 1) * intensity;
  });

  const boxShadow = useTransform(active, (a) => {
    if (variant !== "outline" || a <= 0) return "none";
    return `0 0 0 ${1.5 * a}px color-mix(in srgb, var(--cos-accent) ${Math.round(55 * a)}%, transparent)`;
  });

  const backgroundColor = useTransform(active, (a) => {
    if ((variant !== "tint" && variant !== "underlay") || a <= 0) {
      return "transparent";
    }
    return `color-mix(in srgb, var(--cos-accent-soft) ${Math.round(70 * a)}%, transparent)`;
  });

  const borderColor = useTransform(active, (a) => {
    if (variant !== "border" || a <= 0) return "transparent";
    return `color-mix(in srgb, var(--cos-accent) ${Math.round(80 * a)}%, var(--cos-border))`;
  });

  return (
    <motion.div
      className={className}
      style={{
        ...style,
        position: "relative",
        boxShadow,
        backgroundColor,
        borderColor,
        borderWidth: variant === "border" ? 1 : undefined,
        borderStyle: variant === "border" ? "solid" : undefined,
        borderRadius: "inherit",
      }}
    >
      {children}
    </motion.div>
  );
}
