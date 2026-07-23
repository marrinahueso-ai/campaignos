"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_MOTION_DEFAULTS,
} from "./utils/easing";
import type { MotionDefaults, MotionProviderConfig } from "./types";

export interface MotionConfigValue {
  reducedMotion: boolean;
  defaults: MotionDefaults;
}

const MotionConfigContext = createContext<MotionConfigValue | null>(null);

function useSystemPrefersReducedMotion(): boolean {
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

export function MotionProvider({
  reducedMotion = "system",
  forceReducedMotion = false,
  defaults,
  children,
}: MotionProviderConfig) {
  const systemReduced = useSystemPrefersReducedMotion();

  const resolvedReduced = forceReducedMotion
    ? true
    : reducedMotion === "system"
      ? systemReduced
      : reducedMotion;

  const value = useMemo<MotionConfigValue>(
    () => ({
      reducedMotion: resolvedReduced,
      defaults: {
        ...DEFAULT_MOTION_DEFAULTS,
        ...defaults,
      },
    }),
    [defaults, resolvedReduced],
  );

  return (
    <MotionConfigContext.Provider value={value}>
      {children}
    </MotionConfigContext.Provider>
  );
}

export function useMotionConfig(): MotionConfigValue {
  const ctx = useContext(MotionConfigContext);
  if (!ctx) {
    return {
      reducedMotion: false,
      defaults: DEFAULT_MOTION_DEFAULTS,
    };
  }
  return ctx;
}

/** Optional wrapper when a tree needs an explicit provider. */
export function ensureMotionProvider(children: ReactNode): ReactNode {
  return <MotionProvider>{children}</MotionProvider>;
}
