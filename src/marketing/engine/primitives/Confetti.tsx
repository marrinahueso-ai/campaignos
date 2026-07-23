"use client";

import { useMemo } from "react";
import { motion, useTransform } from "motion/react";
import { useTimelineContext } from "../DemoTimeline";
import type { PrimitiveBaseProps } from "../types";
import { clamp } from "../utils/interpolate";
import { resolveTiming } from "../utils/timeline";

export interface ConfettiProps extends PrimitiveBaseProps {
  /** Off by default — opt in for light celebration moments. */
  enabled?: boolean;
  particleCount?: number;
  colors?: string[];
}

type Particle = {
  id: number;
  x: number;
  drift: number;
  spin: number;
  size: number;
  color: string;
  delay: number;
};

/**
 * Lightweight deterministic confetti. No continuous timers after the window ends.
 */
export function Confetti({
  enabled = false,
  particleCount = 14,
  colors = [
    "var(--cos-brand-mustard)",
    "var(--cos-brand-sage)",
    "var(--cos-accent)",
    "var(--cos-brand-terracotta)",
  ],
  at,
  until,
  cue,
  untilCue,
  delay,
  duration = 1.4,
  className,
  style,
}: ConfettiProps) {
  const timeline = useTimelineContext();
  const timing = resolveTiming(
    { at, until, cue, untilCue, delay, duration },
    timeline.cueMap,
    timeline.duration,
  );

  const particles = useMemo<Particle[]>(() => {
    if (!enabled) return [];
    const count = Math.min(24, Math.max(0, particleCount));
    return Array.from({ length: count }, (_, id) => {
      // Deterministic pseudo-random from id.
      const seed = (id + 1) * 9973;
      const rand = (offset: number) => {
        const x = Math.sin(seed * (offset + 1)) * 10000;
        return x - Math.floor(x);
      };
      return {
        id,
        x: rand(1) * 100,
        drift: (rand(2) - 0.5) * 40,
        spin: (rand(3) - 0.5) * 120,
        size: 4 + rand(4) * 5,
        color: colors[id % colors.length],
        delay: rand(5) * 0.15,
      };
    });
  }, [colors, enabled, particleCount]);

  if (!enabled || timeline.reducedMotion || particles.length === 0) {
    return null;
  }

  return (
    <div
      className={className}
      style={{ ...style, position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}
      aria-hidden
    >
      {particles.map((particle) => (
        <ConfettiParticle
          key={particle.id}
          particle={particle}
          at={timing.at}
          duration={timing.duration ?? duration}
        />
      ))}
    </div>
  );
}

function ConfettiParticle({
  particle,
  at,
  duration,
}: {
  particle: Particle;
  at: number;
  duration: number;
}) {
  const timeline = useTimelineContext();

  const opacity = useTransform(timeline.time, (t) => {
    const local = t - (at + particle.delay);
    if (local < 0 || local > duration) return 0;
    const p = local / duration;
    return p < 0.15 ? p / 0.15 : clamp(1 - (p - 0.15) / 0.85, 0, 1);
  });

  const y = useTransform(timeline.time, (t) => {
    const local = t - (at + particle.delay);
    if (local < 0) return -8;
    const p = clamp(local / duration, 0, 1);
    return -8 + p * 120;
  });

  const x = useTransform(timeline.time, (t) => {
    const local = t - (at + particle.delay);
    if (local < 0) return 0;
    const p = clamp(local / duration, 0, 1);
    return particle.drift * p;
  });

  const rotate = useTransform(timeline.time, (t) => {
    const local = t - (at + particle.delay);
    if (local < 0) return 0;
    const p = clamp(local / duration, 0, 1);
    return particle.spin * p;
  });

  return (
    <motion.span
      style={{
        position: "absolute",
        left: `${particle.x}%`,
        top: "18%",
        width: particle.size,
        height: particle.size * 0.6,
        borderRadius: 1,
        background: particle.color,
        opacity,
        x,
        y,
        rotate,
      }}
    />
  );
}
