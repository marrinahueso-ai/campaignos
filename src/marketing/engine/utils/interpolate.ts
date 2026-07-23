import type { Progress, Seconds } from "../types";

/** Clamp a number into [min, max]. */
export function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

/** Linear interpolation. */
export function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

/** Inverse lerp → normalized progress for a window. */
export function inverseLerp(from: number, to: number, value: number): Progress {
  if (to === from) return value >= to ? 1 : 0;
  return clamp((value - from) / (to - from), 0, 1);
}

/** Smoothstep (Hermite) for soft progress curves without bounce. */
export function smoothstep(edge0: number, edge1: number, x: number): Progress {
  const t = inverseLerp(edge0, edge1, x);
  return t * t * (3 - 2 * t);
}

/**
 * Map global timeline time into a local [0, 1] segment progress.
 * Returns 0 before `at`, 1 after `until` (or after `at + duration`).
 */
export function segmentProgress(
  time: Seconds,
  at: Seconds = 0,
  until?: Seconds,
  duration?: Seconds,
): Progress {
  const end =
    until ??
    (duration !== undefined ? at + duration : Number.POSITIVE_INFINITY);
  if (time < at) return 0;
  if (time >= end) return 1;
  if (!Number.isFinite(end)) return 0;
  return inverseLerp(at, end, time);
}

/** Whether `time` falls inside [at, until). Open-ended when `until` is omitted. */
export function isActiveWindow(
  time: Seconds,
  at: Seconds = 0,
  until?: Seconds,
): boolean {
  if (time < at) return false;
  if (until === undefined) return true;
  return time < until;
}

/** Parse "12%" / "12px" / number into a pixel value given an axis size. */
export function resolveCoordinate(
  value: number | string | undefined,
  axisSize: number,
  fallback = 0,
): number {
  if (value === undefined) return fallback;
  if (typeof value === "number") return value;
  const trimmed = value.trim();
  if (trimmed.endsWith("%")) {
    const pct = Number.parseFloat(trimmed.slice(0, -1));
    if (Number.isNaN(pct)) return fallback;
    return (pct / 100) * axisSize;
  }
  const px = Number.parseFloat(trimmed);
  return Number.isNaN(px) ? fallback : px;
}

/** Format a number with optional decimals, prefix, and suffix. */
export function formatCount(
  value: number,
  options: {
    decimals?: number;
    prefix?: string;
    suffix?: string;
    locale?: string;
  } = {},
): string {
  const {
    decimals = 0,
    prefix = "",
    suffix = "",
    locale = "en-US",
  } = options;
  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
  return `${prefix}${formatted}${suffix}`;
}
