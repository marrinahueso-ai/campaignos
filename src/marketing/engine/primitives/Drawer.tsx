"use client";

import type { ReactNode } from "react";
import { motion, useTransform } from "motion/react";
import { useTimelineContext } from "../DemoTimeline";
import { useMotionConfig } from "../MotionProvider";
import type { DrawerPlacement, PrimitiveBaseProps } from "../types";
import { clamp } from "../utils/interpolate";
import { resolveTiming } from "../utils/timeline";

export interface DrawerProps extends PrimitiveBaseProps {
  children?: ReactNode;
  placement?: DrawerPlacement;
  showOverlay?: boolean;
  overlayClassName?: string;
  panelClassName?: string;
  /** Width/height of the panel depending on placement. */
  size?: number | string;
}

/**
 * Transform-based drawer panel for demo UI chrome.
 */
export function Drawer({
  children,
  placement = "right",
  showOverlay = true,
  overlayClassName,
  panelClassName,
  size = "72%",
  at,
  until,
  cue,
  untilCue,
  delay,
  duration,
  className,
  style,
}: DrawerProps) {
  const timeline = useTimelineContext();
  const { defaults } = useMotionConfig();
  const timing = resolveTiming(
    { at, until, cue, untilCue, delay, duration },
    timeline.cueMap,
    timeline.duration,
  );
  const enter = timing.duration ?? defaults.duration;

  const openAmount = useTransform(timeline.time, (t) => {
    if (timeline.reducedMotion) {
      return t >= timing.at && (timing.until === undefined || t < timing.until)
        ? 1
        : 0;
    }
    if (t < timing.at) return 0;
    if (timing.until !== undefined && t >= timing.until) {
      return clamp(1 - (t - timing.until) / enter, 0, 1);
    }
    return clamp((t - timing.at) / enter, 0, 1);
  });

  const overlayOpacity = useTransform(openAmount, (v) => v * 0.28);

  const x = useTransform(openAmount, (v) => {
    if (placement === "right") return `${(1 - v) * 100}%`;
    if (placement === "left") return `${(v - 1) * 100}%`;
    return "0%";
  });

  const y = useTransform(openAmount, (v) => {
    if (placement === "bottom") return `${(1 - v) * 100}%`;
    if (placement === "top") return `${(v - 1) * 100}%`;
    return "0%";
  });

  const isHorizontal = placement === "left" || placement === "right";

  return (
    <div
      className={className}
      style={{ ...style, position: "absolute", inset: 0, pointerEvents: "none" }}
      aria-hidden
    >
      {showOverlay ? (
        <motion.div
          className={
            overlayClassName ?? "absolute inset-0 bg-[var(--cos-text)]"
          }
          style={{ opacity: overlayOpacity }}
        />
      ) : null}
      <motion.div
        className={
          panelClassName ??
          "absolute bg-[var(--cos-card)] shadow-md border border-[var(--cos-border)]"
        }
        style={{
          x,
          y,
          ...(isHorizontal
            ? {
                top: 0,
                bottom: 0,
                [placement]: 0,
                width: size,
              }
            : {
                left: 0,
                right: 0,
                [placement]: 0,
                height: size,
              }),
        }}
        role="dialog"
        aria-modal="true"
      >
        {children}
      </motion.div>
    </div>
  );
}
