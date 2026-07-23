"use client";

import type { ReactNode } from "react";
import { motion, useTransform } from "motion/react";
import { useTimelineContext } from "../DemoTimeline";
import { CursorRipple } from "./CursorRipple";
import type { PrimitiveBaseProps } from "../types";
import { clamp } from "../utils/interpolate";
import { resolveTiming } from "../utils/timeline";

export interface MouseClickProps extends PrimitiveBaseProps {
  x?: number | string;
  y?: number | string;
  showRipple?: boolean;
  rippleSize?: number;
  children?: ReactNode;
}

/**
 * Visual click accent — cursor compression window + optional ripple.
 */
export function MouseClick({
  x = "50%",
  y = "50%",
  showRipple = true,
  rippleSize = 44,
  at,
  until,
  cue,
  untilCue,
  delay,
  duration = 0.2,
  className,
  style,
  children,
}: MouseClickProps) {
  const timeline = useTimelineContext();
  const timing = resolveTiming(
    { at, until, cue, untilCue, delay, duration },
    timeline.cueMap,
    timeline.duration,
  );

  const scale = useTransform(timeline.time, (t) => {
    if (timeline.reducedMotion) return 1;
    const p = clamp((t - timing.at) / (timing.duration ?? duration), 0, 1);
    if (p <= 0 || p >= 1) return 1;
    // Soft down-up press.
    const press = p < 0.5 ? p * 2 : (1 - p) * 2;
    return 1 - 0.1 * press;
  });

  const opacity = useTransform(timeline.time, (t) => {
    if (timeline.reducedMotion) return 0;
    const active =
      t >= timing.at &&
      t <= timing.at + (timing.duration ?? duration) + 0.35;
    return active ? 1 : 0;
  });

  return (
    <div
      className={className}
      style={{ ...style, position: "absolute", inset: 0, pointerEvents: "none" }}
      aria-hidden
    >
      <motion.div
        style={{
          position: "absolute",
          left: x,
          top: y,
          scale,
          opacity,
          transform: "translate(-50%, -50%)",
        }}
      >
        {children}
      </motion.div>
      {showRipple ? (
        <CursorRipple
          x={x}
          y={y}
          size={rippleSize}
          at={timing.at}
          duration={0.5}
        />
      ) : null}
    </div>
  );
}
