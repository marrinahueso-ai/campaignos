"use client";

import { useMemo, useRef } from "react";
import { motion, useTransform } from "motion/react";
import { useTimelineContext } from "../DemoTimeline";
import type { CursorKeyframe, PrimitiveBaseProps } from "../types";
import { clamp, resolveCoordinate } from "../utils/interpolate";

export interface CursorProps extends PrimitiveBaseProps {
  /** Absolute or percentage keyframes relative to the nearest positioned parent. */
  keyframes?: CursorKeyframe[];
  /** Fallback static position when keyframes are omitted. */
  x?: number | string;
  y?: number | string;
  width?: number;
  height?: number;
  color?: string;
  /** Hide from assistive tech (decorative). Default true. */
  decorative?: boolean;
}

type ResolvedKeyframe = {
  at: number;
  x: number;
  y: number;
  opacity: number;
  scale: number;
  rotate: number;
  click: boolean;
};

function sampleKeyframes(
  frames: ResolvedKeyframe[],
  t: number,
  prop: keyof Pick<
    ResolvedKeyframe,
    "x" | "y" | "opacity" | "scale" | "rotate"
  >,
): number {
  if (frames.length === 0) return prop === "opacity" || prop === "scale" ? 1 : 0;
  if (t <= frames[0].at) return frames[0][prop];
  if (t >= frames[frames.length - 1].at) return frames[frames.length - 1][prop];

  for (let i = 0; i < frames.length - 1; i += 1) {
    const a = frames[i];
    const b = frames[i + 1];
    if (t >= a.at && t <= b.at) {
      const p = a.at === b.at ? 1 : clamp((t - a.at) / (b.at - a.at), 0, 1);
      // Smoothstep for calm motion.
      const s = p * p * (3 - 2 * p);
      return a[prop] + (b[prop] - a[prop]) * s;
    }
  }
  return frames[frames.length - 1][prop];
}

/**
 * Decorative animated cursor for product demos.
 * Position is container-relative; prefer percentage coordinates for responsiveness.
 */
export function Cursor({
  keyframes = [],
  x = "20%",
  y = "30%",
  width = 22,
  height = 22,
  color = "var(--cos-text)",
  decorative = true,
  at,
  until,
  cue,
  untilCue,
  delay,
  className,
  style,
}: CursorProps) {
  const timeline = useTimelineContext();
  const containerRef = useRef<HTMLDivElement | null>(null);

  const frames = useMemo(() => {
    const base: CursorKeyframe[] =
      keyframes.length > 0
        ? keyframes
        : [{ at: at ?? 0, x, y, opacity: 1, scale: 1 }];

    // Resolve against a nominal 400×300 box; live sampling uses measured size.
    return base.map((frame) => ({
      at: frame.at + (delay ?? 0),
      x: frame.x ?? x,
      y: frame.y ?? y,
      opacity: frame.opacity ?? 1,
      scale: frame.scale ?? 1,
      rotate: frame.rotate ?? 0,
      click: Boolean(frame.click),
      raw: frame,
    }));
  }, [at, delay, keyframes, x, y]);

  const resolveFrames = (): ResolvedKeyframe[] => {
    const rect = containerRef.current?.getBoundingClientRect();
    const w = rect?.width || 400;
    const h = rect?.height || 300;
    return frames.map((frame) => ({
      at: frame.at,
      x: resolveCoordinate(frame.x, w, 0),
      y: resolveCoordinate(frame.y, h, 0),
      opacity: frame.opacity,
      scale: frame.scale,
      rotate: frame.rotate,
      click: frame.click,
    }));
  };

  const windowStart = cue
    ? (timeline.getCueTime(cue) ?? at ?? 0)
    : (at ?? frames[0]?.at ?? 0);
  const windowEnd = untilCue
    ? timeline.getCueTime(untilCue)
    : until;

  const mvX = useTransform(timeline.time, (t) => {
    if (timeline.reducedMotion) {
      const resolved = resolveFrames();
      return resolved[resolved.length - 1]?.x ?? 0;
    }
    if (t < windowStart) return sampleKeyframes(resolveFrames(), windowStart, "x");
    if (windowEnd !== undefined && t >= windowEnd) {
      return sampleKeyframes(resolveFrames(), windowEnd, "x");
    }
    return sampleKeyframes(resolveFrames(), t, "x");
  });

  const mvY = useTransform(timeline.time, (t) => {
    if (timeline.reducedMotion) {
      const resolved = resolveFrames();
      return resolved[resolved.length - 1]?.y ?? 0;
    }
    return sampleKeyframes(resolveFrames(), t, "y");
  });

  const mvOpacity = useTransform(timeline.time, (t) => {
    if (windowEnd !== undefined && t >= windowEnd) return 0;
    if (t < windowStart) return 0;
    if (timeline.reducedMotion) return 1;
    return sampleKeyframes(resolveFrames(), t, "opacity");
  });

  const mvScale = useTransform(timeline.time, (t) => {
    if (timeline.reducedMotion) return 1;
    const resolved = resolveFrames();
    let scale = sampleKeyframes(resolved, t, "scale");
    // Compress slightly on click keyframes.
    for (const frame of resolved) {
      if (!frame.click) continue;
      const dist = Math.abs(t - frame.at);
      if (dist < 0.12) {
        const p = 1 - dist / 0.12;
        scale *= 1 - 0.12 * p;
      }
    }
    return scale;
  });

  const mvRotate = useTransform(timeline.time, (t) => {
    if (timeline.reducedMotion) return 0;
    return sampleKeyframes(resolveFrames(), t, "rotate");
  });

  return (
    <div
      ref={containerRef}
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden={decorative}
    >
      <motion.div
        className={className}
        style={{
          ...style,
          position: "absolute",
          left: 0,
          top: 0,
          width,
          height,
          x: mvX,
          y: mvY,
          opacity: mvOpacity,
          scale: mvScale,
          rotate: mvRotate,
          transformOrigin: "top left",
          color,
        }}
      >
        <svg
          width={width}
          height={height}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M4.5 2.5L19 11.2L12.2 12.4L9.8 19.5L4.5 2.5Z"
            fill="currentColor"
            stroke="var(--cos-card)"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
        </svg>
      </motion.div>
    </div>
  );
}
