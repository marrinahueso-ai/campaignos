"use client";

import { useEffect, useState } from "react";
import { useMotionValueEvent } from "motion/react";
import { useTimelineContext } from "../DemoTimeline";
import type { PrimitiveBaseProps } from "../types";
import { clamp, formatCount, lerp } from "../utils/interpolate";
import { resolveTiming } from "../utils/timeline";

export interface CountUpProps extends PrimitiveBaseProps {
  from?: number;
  to: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  locale?: string;
  as?: "span" | "p" | "div";
}

/**
 * Timeline-derived counter. No independent intervals.
 */
export function CountUp({
  from = 0,
  to,
  decimals = 0,
  prefix = "",
  suffix = "",
  locale,
  as: Tag = "span",
  at,
  until,
  cue,
  untilCue,
  delay,
  duration,
  className,
  style,
}: CountUpProps) {
  const timeline = useTimelineContext();
  const timing = resolveTiming(
    { at, until, cue, untilCue, delay, duration },
    timeline.cueMap,
    timeline.duration,
  );

  const animDuration =
    timing.duration ??
    (timing.until !== undefined
      ? Math.max(0.01, timing.until - timing.at)
      : 1.2);

  const [value, setValue] = useState(timeline.reducedMotion ? to : from);

  useMotionValueEvent(timeline.time, "change", (t) => {
    if (timeline.reducedMotion) {
      setValue(to);
      return;
    }
    if (t < timing.at) {
      setValue(from);
      return;
    }
    const p = clamp((t - timing.at) / animDuration, 0, 1);
    const eased = p * p * (3 - 2 * p);
    setValue(lerp(from, to, eased));
  });

  useEffect(() => {
    if (timeline.reducedMotion) setValue(to);
  }, [timeline.reducedMotion, to]);

  const label = formatCount(value, { decimals, prefix, suffix, locale });

  return (
    <Tag className={className} style={style} aria-label={label}>
      <span aria-hidden className="tabular-nums">
        {label}
      </span>
    </Tag>
  );
}
