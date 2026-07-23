"use client";

import type { ReactNode } from "react";
import { motion, useTransform } from "motion/react";
import { useTimelineContext } from "../DemoTimeline";
import { useMotionConfig } from "../MotionProvider";
import type { PrimitiveBaseProps } from "../types";
import { clamp } from "../utils/interpolate";
import { resolveTiming } from "../utils/timeline";

export interface GlowProps extends PrimitiveBaseProps {
  children?: ReactNode;
  /** Set false to disable entirely. */
  enabled?: boolean;
  opacity?: number;
  color?: string;
  blur?: number;
}

/**
 * Very restrained accent glow. Disabled under reduced motion.
 */
export function Glow({
  children,
  enabled = true,
  opacity,
  color = "var(--cos-accent)",
  blur = 18,
  at,
  until,
  cue,
  untilCue,
  delay,
  duration,
  className,
  style,
}: GlowProps) {
  const timeline = useTimelineContext();
  const { defaults, reducedMotion } = useMotionConfig();
  const timing = resolveTiming(
    { at, until, cue, untilCue, delay, duration },
    timeline.cueMap,
    timeline.duration,
  );

  const strength = opacity ?? defaults.glowOpacity;

  const glowOpacity = useTransform(timeline.time, (t) => {
    if (!enabled || reducedMotion || timeline.reducedMotion) return 0;
    if (t < timing.at) return 0;
    if (timing.until !== undefined && t >= timing.until) return 0;
    const enter = timing.duration ?? 0.35;
    return clamp((t - timing.at) / enter, 0, 1) * strength;
  });

  const boxShadow = useTransform(glowOpacity, (o) =>
    o <= 0 ? "none" : `0 0 ${blur}px 0 color-mix(in srgb, ${color} ${Math.round(o * 100)}%, transparent)`,
  );

  return (
    <motion.div className={className} style={{ ...style, boxShadow }}>
      {children}
    </motion.div>
  );
}
