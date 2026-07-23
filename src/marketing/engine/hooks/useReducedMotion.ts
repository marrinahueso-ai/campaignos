"use client";

import { useEffect, useState } from "react";
import { useMotionConfig } from "../MotionProvider";

/**
 * Resolve whether reduced motion is active.
 * Prefers MotionProvider config; falls back to the system media query.
 */
export function useReducedMotion(): boolean {
  const { reducedMotion } = useMotionConfig();
  return reducedMotion;
}

/**
 * Standalone system preference hook (no provider required).
 * Useful for tests or isolated tooling.
 */
export function useSystemReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return reduced;
}
