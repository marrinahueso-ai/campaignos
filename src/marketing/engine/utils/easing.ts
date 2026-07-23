import type { Easing } from "motion/react";
import type { MotionDefaults } from "../types";

/** Calm, premium ease-out — default for most marketing motion. */
export const EASE_OUT_SOFT: Easing = [0.22, 1, 0.36, 1];

/** Slightly snappier ease for small UI accents (highlight, badge). */
export const EASE_OUT_CRISP: Easing = [0.16, 1, 0.3, 1];

/** Gentle ease-in-out for loops and floating motion. */
export const EASE_IN_OUT_SOFT: Easing = [0.45, 0, 0.55, 1];

export const DEFAULT_MOTION_DEFAULTS: MotionDefaults = {
  duration: 0.45,
  ease: EASE_OUT_SOFT,
  enterDistance: 12,
  exitDistance: 10,
  pulseScale: 1.03,
  glowOpacity: 0.22,
};

export function resolveEase(
  ease: Easing | Easing[] | undefined,
  fallback: Easing | Easing[] = EASE_OUT_SOFT,
): Easing | Easing[] {
  return ease ?? fallback;
}
