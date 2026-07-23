"use client";

import type { ReactNode } from "react";
import { motion, useTransform } from "motion/react";
import { useTimelineContext } from "../DemoTimeline";
import { useMotionConfig } from "../MotionProvider";
import type { PrimitiveBaseProps, SlideDirection } from "../types";
import { clamp } from "../utils/interpolate";
import { resolveTiming } from "../utils/timeline";

export interface FadeSlideProps extends PrimitiveBaseProps {
  children?: ReactNode;
  direction?: SlideDirection;
  distance?: number;
  /** Keep visible after until (no exit). */
  holdAfter?: boolean;
}

export function FadeSlide({
  children,
  direction = "up",
  distance,
  holdAfter = false,
  at,
  until,
  cue,
  untilCue,
  delay,
  duration,
  className,
  style,
}: FadeSlideProps) {
  const timeline = useTimelineContext();
  const { defaults } = useMotionConfig();
  const timing = resolveTiming(
    { at, until, cue, untilCue, delay, duration },
    timeline.cueMap,
    timeline.duration,
  );
  const dist = distance ?? defaults.enterDistance;
  const enter = timing.duration ?? defaults.duration;

  const offset = (axis: "x" | "y") => {
    if (axis === "x") {
      if (direction === "left") return dist;
      if (direction === "right") return -dist;
      return 0;
    }
    if (direction === "up") return dist;
    if (direction === "down") return -dist;
    return 0;
  };

  const opacity = useTransform(timeline.time, (t) => {
    if (timeline.reducedMotion) {
      if (holdAfter) return t >= timing.at ? 1 : 0;
      return t >= timing.at && (timing.until === undefined || t < timing.until)
        ? 1
        : 0;
    }
    if (t < timing.at) return 0;
    if (t < timing.at + enter) return clamp((t - timing.at) / enter, 0, 1);
    if (timing.until !== undefined && t >= timing.until && !holdAfter) {
      return clamp(1 - (t - timing.until) / (defaults.duration * 0.75), 0, 1);
    }
    return 1;
  });

  const x = useTransform(timeline.time, (t) => {
    if (timeline.reducedMotion) return 0;
    const from = offset("x");
    if (t < timing.at) return from;
    if (t < timing.at + enter) {
      const p = clamp((t - timing.at) / enter, 0, 1);
      return from * (1 - p);
    }
    return 0;
  });

  const y = useTransform(timeline.time, (t) => {
    if (timeline.reducedMotion) return 0;
    const from = offset("y");
    if (t < timing.at) return from;
    if (t < timing.at + enter) {
      const p = clamp((t - timing.at) / enter, 0, 1);
      return from * (1 - p);
    }
    return 0;
  });

  return (
    <motion.div className={className} style={{ ...style, opacity, x, y }}>
      {children}
    </motion.div>
  );
}
