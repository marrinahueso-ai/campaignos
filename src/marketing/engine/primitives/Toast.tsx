"use client";

import type { ReactNode } from "react";
import { motion, useTransform } from "motion/react";
import { useTimelineContext } from "../DemoTimeline";
import { useMotionConfig } from "../MotionProvider";
import type { PrimitiveBaseProps, ToastStatus } from "../types";
import { clamp } from "../utils/interpolate";
import { resolveTiming } from "../utils/timeline";

export interface ToastProps extends PrimitiveBaseProps {
  title: string;
  description?: string;
  status?: ToastStatus;
  icon?: ReactNode;
  /**
   * When true, exposes a polite live region.
   * Disabled by default so looping demos do not spam announcements.
   */
  announce?: boolean;
}

const STATUS_STYLES: Record<ToastStatus, string> = {
  info: "border-[var(--cos-border)] bg-[var(--cos-card)]",
  success: "border-[var(--cos-success)]/30 bg-[var(--cos-success-bg)]",
  warning: "border-[var(--cos-warning-text)]/20 bg-[var(--cos-warning)]",
  error: "border-[var(--cos-error)]/30 bg-[var(--cos-error-bg)]",
  neutral: "border-[var(--cos-border)] bg-[var(--cos-bg-alt)]",
};

export function Toast({
  title,
  description,
  status = "neutral",
  icon,
  announce = false,
  at,
  until,
  cue,
  untilCue,
  delay,
  duration,
  className,
  style,
}: ToastProps) {
  const timeline = useTimelineContext();
  const { defaults } = useMotionConfig();
  const timing = resolveTiming(
    { at, until, cue, untilCue, delay, duration },
    timeline.cueMap,
    timeline.duration,
  );
  const enter = defaults.duration;

  const opacity = useTransform(timeline.time, (t) => {
    if (timeline.reducedMotion) {
      return t >= timing.at && (timing.until === undefined || t < timing.until)
        ? 1
        : 0;
    }
    if (t < timing.at) return 0;
    if (t < timing.at + enter) return clamp((t - timing.at) / enter, 0, 1);
    if (timing.until !== undefined && t >= timing.until) {
      return clamp(1 - (t - timing.until) / enter, 0, 1);
    }
    return 1;
  });

  const y = useTransform(timeline.time, (t) => {
    if (timeline.reducedMotion) return 0;
    if (t < timing.at) return 10;
    if (t < timing.at + enter) {
      const p = clamp((t - timing.at) / enter, 0, 1);
      return 10 * (1 - p);
    }
    return 0;
  });

  const visible =
    timeline.currentTime >= timing.at &&
    (timing.until === undefined || timeline.currentTime < timing.until);

  return (
    <motion.div
      className={
        className ??
        `pointer-events-none absolute right-3 top-3 z-20 flex max-w-xs items-start gap-2 rounded-xl border px-3 py-2 shadow-sm ${STATUS_STYLES[status]}`
      }
      style={{ ...style, opacity, y }}
      role={announce && visible ? "status" : undefined}
      aria-live={announce && visible ? "polite" : "off"}
      aria-hidden={!visible}
    >
      {icon ? <span className="mt-0.5 shrink-0">{icon}</span> : null}
      <div>
        <p className="text-sm font-medium text-[var(--cos-text)]">{title}</p>
        {description ? (
          <p className="mt-0.5 text-xs text-[var(--cos-muted)]">{description}</p>
        ) : null}
      </div>
    </motion.div>
  );
}
