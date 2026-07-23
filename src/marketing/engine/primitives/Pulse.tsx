"use client";

import type { ReactNode } from "react";
import { motion, useTransform } from "motion/react";
import { useTimelineContext } from "../DemoTimeline";
import { useMotionConfig } from "../MotionProvider";
import type { PrimitiveBaseProps } from "../types";
import { resolveTiming } from "../utils/timeline";

export interface PulseProps extends PrimitiveBaseProps {
  children?: ReactNode;
  /** Peak scale (keep subtle, e.g. 1.03). */
  scale?: number;
  /** Peak opacity boost for an optional ring. */
  opacity?: number;
  /** Seconds per pulse cycle while active. */
  period?: number;
  /** Max pulses while in window; Infinity for continuous within window. */
  maxPulses?: number;
}

/**
 * Subtle pulse. Disabled under reduced motion.
 */
export function Pulse({
  children,
  scale,
  opacity = 1,
  period = 1.4,
  maxPulses = 2,
  at,
  until,
  cue,
  untilCue,
  delay,
  duration,
  className,
  style,
}: PulseProps) {
  const timeline = useTimelineContext();
  const { defaults } = useMotionConfig();
  const timing = resolveTiming(
    { at, until, cue, untilCue, delay, duration },
    timeline.cueMap,
    timeline.duration,
  );
  const peak = scale ?? defaults.pulseScale;

  const mvScale = useTransform(timeline.time, (t) => {
    if (timeline.reducedMotion) return 1;
    if (t < timing.at) return 1;
    if (timing.until !== undefined && t >= timing.until) return 1;
    const local = t - timing.at;
    const pulseIndex = Math.floor(local / period);
    if (Number.isFinite(maxPulses) && pulseIndex >= maxPulses) return 1;
    const p = (local % period) / period;
    const wave = Math.sin(p * Math.PI);
    return 1 + (peak - 1) * wave;
  });

  const mvOpacity = useTransform(timeline.time, (t) => {
    if (timeline.reducedMotion) return opacity;
    if (t < timing.at) return opacity;
    if (timing.until !== undefined && t >= timing.until) return opacity;
    const local = t - timing.at;
    const pulseIndex = Math.floor(local / period);
    if (Number.isFinite(maxPulses) && pulseIndex >= maxPulses) return opacity;
    const p = (local % period) / period;
    const wave = Math.sin(p * Math.PI);
    return opacity * (0.92 + 0.08 * wave);
  });

  return (
    <motion.div
      className={className}
      style={{ ...style, scale: mvScale, opacity: mvOpacity }}
    >
      {children}
    </motion.div>
  );
}
