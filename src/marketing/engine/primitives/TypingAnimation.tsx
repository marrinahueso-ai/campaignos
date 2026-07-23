"use client";

import { useEffect, useState } from "react";
import { useMotionValueEvent } from "motion/react";
import { useTimelineContext } from "../DemoTimeline";
import type { PrimitiveBaseProps } from "../types";
import { clamp } from "../utils/interpolate";
import { resolveTiming } from "../utils/timeline";

export interface TypingAnimationProps extends PrimitiveBaseProps {
  text: string;
  /** Characters per second when duration is not set. */
  charsPerSecond?: number;
  showCursor?: boolean;
  blinkCursor?: boolean;
  /** Reserve full text width to reduce layout shift. */
  stabilizeLayout?: boolean;
  as?: "p" | "span" | "div" | "h2" | "h3";
}

/**
 * Timeline-derived typing effect. Character count + caret blink from shared clock.
 */
export function TypingAnimation({
  text,
  charsPerSecond = 28,
  showCursor = true,
  blinkCursor = true,
  stabilizeLayout = true,
  as: Tag = "p",
  at,
  until,
  cue,
  untilCue,
  delay,
  duration,
  className,
  style,
}: TypingAnimationProps) {
  const timeline = useTimelineContext();
  const timing = resolveTiming(
    { at, until, cue, untilCue, delay, duration },
    timeline.cueMap,
    timeline.duration,
  );

  const typingDuration =
    timing.duration ??
    (timing.until !== undefined
      ? Math.max(0.01, timing.until - timing.at)
      : Math.max(0.01, text.length / charsPerSecond));

  const [visibleCount, setVisibleCount] = useState(
    timeline.reducedMotion ? text.length : 0,
  );
  const [caretOn, setCaretOn] = useState(true);

  useMotionValueEvent(timeline.time, "change", (t) => {
    if (timeline.reducedMotion) {
      setVisibleCount(text.length);
      setCaretOn(true);
      return;
    }
    if (t < timing.at) {
      setVisibleCount(0);
      setCaretOn(true);
      return;
    }
    const p = clamp((t - timing.at) / typingDuration, 0, 1);
    setVisibleCount(Math.round(p * text.length));
    // Derive blink from shared clock — no private interval.
    setCaretOn(!blinkCursor || Math.floor(t * 2) % 2 === 0);
  });

  useEffect(() => {
    if (timeline.reducedMotion) {
      setVisibleCount(text.length);
    }
  }, [text.length, timeline.reducedMotion]);

  const shown = text.slice(0, visibleCount);
  const typingDone = visibleCount >= text.length;
  const inWindow =
    timeline.currentTime >= timing.at &&
    (timing.until === undefined || timeline.currentTime < timing.until);

  return (
    <Tag
      className={className}
      style={{
        ...style,
        ...(stabilizeLayout
          ? { display: "inline-block", position: "relative", width: "100%" }
          : null),
      }}
      aria-label={text}
    >
      <span aria-hidden>{shown}</span>
      {showCursor && inWindow && !timeline.reducedMotion ? (
        <span
          aria-hidden
          className="ml-0.5 inline-block w-[0.55ch] translate-y-px border-r-2 border-current"
          style={{ opacity: typingDone && !caretOn ? 0 : 1 }}
        />
      ) : null}
    </Tag>
  );
}
