"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useMotionValueEvent } from "motion/react";
import { useTimelineContext } from "../DemoTimeline";
import type { PrimitiveBaseProps } from "../types";
import { clamp } from "../utils/interpolate";
import { resolveTiming } from "../utils/timeline";

export interface AutoScrollProps extends PrimitiveBaseProps {
  children?: ReactNode;
  /** Target scrollTop in pixels, or a selector within the container. */
  target: number | string;
  /** Optional max scroll distance clamp. */
  maxOffset?: number;
}

/**
 * Scrolls a contained demo region only — never the browser window.
 * Uses scrollTop writes driven by the shared clock (no layout thrashing loops).
 */
export function AutoScroll({
  children,
  target,
  maxOffset,
  at,
  until,
  cue,
  untilCue,
  delay,
  duration,
  className,
  style,
}: AutoScrollProps) {
  const timeline = useTimelineContext();
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const targetRef = useRef(0);
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

  const measureTarget = () => {
    const root = scrollerRef.current;
    if (!root) return 0;
    if (typeof target === "number") {
      return maxOffset !== undefined ? Math.min(target, maxOffset) : target;
    }
    const el = root.querySelector(target);
    if (!el || !(el instanceof HTMLElement)) return 0;
    const next = el.offsetTop;
    return maxOffset !== undefined ? Math.min(next, maxOffset) : next;
  };

  useEffect(() => {
    targetRef.current = measureTarget();
    // Re-measure on resize.
    const root = scrollerRef.current;
    if (!root || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => {
      targetRef.current = measureTarget();
    });
    ro.observe(root);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, maxOffset]);

  useMotionValueEvent(timeline.time, "change", (t) => {
    const root = scrollerRef.current;
    if (!root) return;

    if (timeline.reducedMotion) {
      root.scrollTop = t >= timing.at ? targetRef.current : 0;
      return;
    }

    if (t < timing.at) {
      root.scrollTop = 0;
      return;
    }

    const p = clamp((t - timing.at) / animDuration, 0, 1);
    const eased = p * p * (3 - 2 * p);
    root.scrollTop = targetRef.current * eased;
  });

  return (
    <div
      ref={scrollerRef}
      className={className}
      style={{
        ...style,
        overflow: "auto",
        overscrollBehavior: "contain",
      }}
      data-marketing-autoscroll
    >
      {children}
    </div>
  );
}
