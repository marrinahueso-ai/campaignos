"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

export interface UseInViewPlayOptions {
  /** Pause callback when leaving the viewport. */
  onExit?: () => void;
  /** Resume callback when entering the viewport (only if previously playing). */
  onEnter?: () => void;
  /** Intersection amount required to count as in view. */
  amount?: number | "some" | "all";
  /** Root margin for the observer. */
  rootMargin?: string;
  /** Disable observation entirely. */
  enabled?: boolean;
}

function amountToThreshold(amount: number | "some" | "all"): number {
  if (amount === "all") return 0.99;
  if (amount === "some") return 0.15;
  return Math.max(0, Math.min(1, amount));
}

/**
 * Observe a demo root and signal enter/exit for pause-when-offscreen.
 * Does not own playback — DemoPlayer decides whether to resume.
 */
export function useInViewPlay<T extends HTMLElement>(
  options: UseInViewPlayOptions = {},
): {
  ref: RefObject<T | null>;
  inView: boolean;
} {
  const {
    onEnter,
    onExit,
    amount = 0.25,
    rootMargin = "0px",
    enabled = true,
  } = options;

  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(true);
  const wasInView = useRef(true);

  useEffect(() => {
    if (!enabled) {
      setInView(true);
      return;
    }

    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        const next = Boolean(entry?.isIntersecting);
        setInView(next);
        if (next && !wasInView.current) {
          onEnter?.();
        } else if (!next && wasInView.current) {
          onExit?.();
        }
        wasInView.current = next;
      },
      {
        threshold: amountToThreshold(amount),
        rootMargin,
      },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [amount, enabled, onEnter, onExit, rootMargin]);

  return { ref, inView };
}
