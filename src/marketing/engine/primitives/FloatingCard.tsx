"use client";

import type { ReactNode } from "react";
import { motion, useTransform } from "motion/react";
import { useTimelineContext } from "../DemoTimeline";
import { useMotionConfig } from "../MotionProvider";
import type { PrimitiveBaseProps } from "../types";
import { clamp } from "../utils/interpolate";
import { resolveTiming } from "../utils/timeline";

export interface FloatingCardProps extends PrimitiveBaseProps {
  children?: ReactNode;
  floatAmplitude?: number;
  floatPeriod?: number;
  enterDistance?: number;
}

/**
 * Soft card entry with optional gentle float while active.
 */
export function FloatingCard({
  children,
  floatAmplitude = 4,
  floatPeriod = 3.2,
  enterDistance,
  at,
  until,
  cue,
  untilCue,
  delay,
  duration,
  className,
  style,
}: FloatingCardProps) {
  const timeline = useTimelineContext();
  const { defaults } = useMotionConfig();
  const timing = resolveTiming(
    { at, until, cue, untilCue, delay, duration },
    timeline.cueMap,
    timeline.duration,
  );
  const distance = enterDistance ?? defaults.enterDistance;

  const opacity = useTransform(timeline.time, (t) => {
    if (timeline.reducedMotion) {
      return t >= timing.at ? 1 : 0;
    }
    if (t < timing.at) return 0;
    const enter = timing.duration ?? defaults.duration;
    if (timing.until !== undefined && t >= timing.until) {
      return clamp(1 - (t - timing.until) / (defaults.duration * 0.8), 0, 1);
    }
    return clamp((t - timing.at) / enter, 0, 1);
  });

  const y = useTransform(timeline.time, (t) => {
    if (timeline.reducedMotion) return 0;
    if (t < timing.at) return distance;
    const enter = timing.duration ?? defaults.duration;
    const enterP = clamp((t - timing.at) / enter, 0, 1);
    const base = distance * (1 - enterP * enterP * (3 - 2 * enterP));
    if (timing.until !== undefined && t >= timing.until) return base;
    const local = Math.max(0, t - timing.at - enter);
    const float = Math.sin((local / floatPeriod) * Math.PI * 2) * floatAmplitude;
    return base + float;
  });

  return (
    <motion.div
      className={className}
      style={{
        ...style,
        opacity,
        y,
        willChange: "transform, opacity",
      }}
    >
      {children}
    </motion.div>
  );
}
