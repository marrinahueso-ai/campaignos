"use client";

import type { ReactNode } from "react";
import { motion, useTransform } from "motion/react";
import { useTimelineContext } from "../DemoTimeline";
import type { PrimitiveBaseProps } from "../types";
import { clamp } from "../utils/interpolate";
import { resolveTiming } from "../utils/timeline";

export interface SectionSpotlightProps extends PrimitiveBaseProps {
  children?: ReactNode;
  /** CSS inset for the clear spotlight hole, e.g. "12% 18% 40% 18%". */
  inset?: string | number;
  dimOpacity?: number;
  radius?: number;
}

/**
 * Dim surrounding content and emphasize a rectangular region.
 * Implemented with a four-edge veil (no canvas) for simplicity and performance.
 */
export function SectionSpotlight({
  children,
  inset = "18% 14% 28% 14%",
  dimOpacity = 0.34,
  radius = 16,
  at,
  until,
  cue,
  untilCue,
  delay,
  duration,
  className,
  style,
}: SectionSpotlightProps) {
  const timeline = useTimelineContext();
  const timing = resolveTiming(
    { at, until, cue, untilCue, delay, duration },
    timeline.cueMap,
    timeline.duration,
  );

  const strength = useTransform(timeline.time, (t) => {
    if (timeline.reducedMotion) {
      return t >= timing.at && (timing.until === undefined || t < timing.until)
        ? 1
        : 0;
    }
    if (t < timing.at) return 0;
    if (timing.until !== undefined && t >= timing.until) {
      return clamp(1 - (t - timing.until) / 0.3, 0, 1);
    }
    const enter = timing.duration ?? 0.35;
    return clamp((t - timing.at) / enter, 0, 1);
  });

  const veilOpacity = useTransform(strength, (s) => s * dimOpacity);

  const insets = normalizeInset(inset);

  return (
    <div
      className={className}
      style={{ ...style, position: "relative" }}
      data-marketing-spotlight
    >
      {children}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ opacity: veilOpacity }}
      >
        {/* Top */}
        <div
          className="absolute left-0 right-0 top-0 bg-[var(--cos-text)]"
          style={{ height: insets.top }}
        />
        {/* Bottom */}
        <div
          className="absolute bottom-0 left-0 right-0 bg-[var(--cos-text)]"
          style={{ height: insets.bottom }}
        />
        {/* Left */}
        <div
          className="absolute bg-[var(--cos-text)]"
          style={{
            top: insets.top,
            bottom: insets.bottom,
            left: 0,
            width: insets.left,
          }}
        />
        {/* Right */}
        <div
          className="absolute bg-[var(--cos-text)]"
          style={{
            top: insets.top,
            bottom: insets.bottom,
            right: 0,
            width: insets.right,
          }}
        />
        {/* Soft ring around clear region */}
        <div
          className="absolute border border-[color-mix(in_srgb,var(--cos-card)_55%,transparent)]"
          style={{
            top: insets.top,
            right: insets.right,
            bottom: insets.bottom,
            left: insets.left,
            borderRadius: radius,
            boxShadow: "0 0 0 1px color-mix(in srgb, var(--cos-card) 25%, transparent)",
          }}
        />
      </motion.div>
    </div>
  );
}

function normalizeInset(inset: string | number): {
  top: string;
  right: string;
  bottom: string;
  left: string;
} {
  if (typeof inset === "number") {
    const v = `${inset}px`;
    return { top: v, right: v, bottom: v, left: v };
  }
  const parts = inset.trim().split(/\s+/);
  if (parts.length === 1) {
    return { top: parts[0], right: parts[0], bottom: parts[0], left: parts[0] };
  }
  if (parts.length === 2) {
    return { top: parts[0], right: parts[1], bottom: parts[0], left: parts[1] };
  }
  if (parts.length === 3) {
    return { top: parts[0], right: parts[1], bottom: parts[2], left: parts[1] };
  }
  return {
    top: parts[0],
    right: parts[1],
    bottom: parts[2],
    left: parts[3],
  };
}
