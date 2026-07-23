"use client";

import { type ReactNode } from "react";
import { motion, useTransform } from "motion/react";
import { useTimelineContext } from "./DemoTimeline";
import { useMotionConfig } from "./MotionProvider";
import type { PrimitiveBaseProps, SlideDirection } from "./types";
import { resolveTiming } from "./utils/timeline";
import { clamp } from "./utils/interpolate";

export interface SceneProps extends PrimitiveBaseProps {
  children?: ReactNode;
  /** Enter transition length in seconds (within the active window). */
  enterDuration?: number;
  /** Exit transition length in seconds. */
  exitDuration?: number;
  enterDirection?: SlideDirection | "none";
  exitDirection?: SlideDirection | "none";
  /** Subtle scale on enter (default 1 — set e.g. 0.98 for soft pop). */
  enterScale?: number;
  /** Unmount children when fully inactive. Default false (keeps layout stable). */
  unmountOnExit?: boolean;
  /** Keep content visible after `until` (completed state). Default false. */
  holdAfter?: boolean;
}

function directionOffset(
  direction: SlideDirection | "none" | undefined,
  distance: number,
): { x: number; y: number } {
  switch (direction) {
    case "up":
      return { x: 0, y: distance };
    case "down":
      return { x: 0, y: -distance };
    case "left":
      return { x: distance, y: 0 };
    case "right":
      return { x: -distance, y: 0 };
    default:
      return { x: 0, y: 0 };
  }
}

/**
 * Time-windowed scene. Animates with transform + opacity only.
 */
export function Scene({
  at,
  until,
  cue,
  untilCue,
  delay,
  duration,
  enterDuration,
  exitDuration,
  enterDirection = "up",
  exitDirection = "none",
  enterScale = 1,
  unmountOnExit = false,
  holdAfter = false,
  className,
  style,
  children,
}: SceneProps) {
  const timeline = useTimelineContext();
  const { defaults, reducedMotion } = useMotionConfig();

  const timing = resolveTiming(
    { at, until, cue, untilCue, delay, duration },
    timeline.cueMap,
    timeline.duration,
  );

  const enterMs = enterDuration ?? defaults.duration;
  const exitMs = exitDuration ?? defaults.duration * 0.8;
  const enterDist = defaults.enterDistance;
  const exitDist = defaults.exitDistance;
  const enterFrom = directionOffset(enterDirection, enterDist);
  const exitTo = directionOffset(exitDirection, exitDist);

  const opacity = useTransform(timeline.time, (t) => {
    if (reducedMotion) {
      if (holdAfter) return t >= timing.at ? 1 : 0;
      if (timing.until !== undefined) {
        return t >= timing.at && t < timing.until ? 1 : t >= timing.until ? 1 : 0;
      }
      return t >= timing.at ? 1 : 0;
    }

    if (t < timing.at) return 0;

    const enterEnd = timing.at + enterMs;
    if (t < enterEnd) {
      return clamp((t - timing.at) / enterMs, 0, 1);
    }

    if (timing.until === undefined || holdAfter) {
      if (timing.until !== undefined && t >= timing.until && !holdAfter) {
        // fall through to exit
      } else if (timing.until === undefined || t < timing.until) {
        return 1;
      }
    }

    if (timing.until !== undefined && t >= timing.until) {
      if (holdAfter) return 1;
      const exitEnd = timing.until + exitMs;
      if (t >= exitEnd) return 0;
      return clamp(1 - (t - timing.until) / exitMs, 0, 1);
    }

    return 1;
  });

  const x = useTransform(timeline.time, (t) => {
    if (reducedMotion) return 0;
    if (t < timing.at) return enterFrom.x;
    const enterEnd = timing.at + enterMs;
    if (t < enterEnd) {
      const p = clamp((t - timing.at) / enterMs, 0, 1);
      return enterFrom.x * (1 - p);
    }
    if (timing.until !== undefined && t >= timing.until && !holdAfter) {
      const p = clamp((t - timing.until) / exitMs, 0, 1);
      return exitTo.x * p;
    }
    return 0;
  });

  const y = useTransform(timeline.time, (t) => {
    if (reducedMotion) return 0;
    if (t < timing.at) return enterFrom.y;
    const enterEnd = timing.at + enterMs;
    if (t < enterEnd) {
      const p = clamp((t - timing.at) / enterMs, 0, 1);
      return enterFrom.y * (1 - p);
    }
    if (timing.until !== undefined && t >= timing.until && !holdAfter) {
      const p = clamp((t - timing.until) / exitMs, 0, 1);
      return exitTo.y * p;
    }
    return 0;
  });

  const scale = useTransform(timeline.time, (t) => {
    if (reducedMotion || enterScale === 1) return 1;
    if (t < timing.at) return enterScale;
    const enterEnd = timing.at + enterMs;
    if (t < enterEnd) {
      const p = clamp((t - timing.at) / enterMs, 0, 1);
      return enterScale + (1 - enterScale) * p;
    }
    return 1;
  });

  const active =
    timeline.currentTime >= timing.at &&
    (timing.until === undefined ||
      holdAfter ||
      timeline.currentTime < timing.until + (reducedMotion ? 0 : exitMs));

  if (unmountOnExit && !active) {
    return null;
  }

  return (
    <motion.div
      className={className}
      style={{
        ...style,
        opacity,
        x,
        y,
        scale,
        pointerEvents: active ? "auto" : "none",
      }}
      aria-hidden={!active}
      data-scene-active={active ? "true" : "false"}
    >
      {children}
    </motion.div>
  );
}
