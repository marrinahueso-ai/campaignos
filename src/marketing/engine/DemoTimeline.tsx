"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import type { MotionValue } from "motion/react";
import type {
  DemoSnapshot,
  DemoTimelineContextValue,
  Seconds,
  TimelineCue,
} from "./types";
import { buildCueMap, getCueTime } from "./utils/timeline";
import { isActiveWindow, segmentProgress } from "./utils/interpolate";

const DemoTimelineContext = createContext<DemoTimelineContextValue | null>(
  null,
);

export interface DemoTimelineProviderProps {
  snapshot: DemoSnapshot;
  time: MotionValue<number>;
  cues: TimelineCue[];
  play: () => void;
  pause: () => void;
  seek: (time: Seconds) => void;
  restart: () => void;
  setPlaybackRate: (rate: number) => void;
  children: ReactNode;
}

/**
 * Timeline context for a single DemoPlayer.
 * Consumers subscribe via `useTimeline()` — do not create nested clocks.
 */
export function DemoTimelineProvider({
  snapshot,
  time,
  cues,
  play,
  pause,
  seek,
  restart,
  setPlaybackRate,
  children,
}: DemoTimelineProviderProps) {
  const cueMap = useMemo(() => buildCueMap(cues), [cues]);

  const resolveTime = useCallback(
    (input?: Seconds | string): Seconds | undefined => {
      if (input === undefined) return undefined;
      if (typeof input === "number") return input;
      return getCueTime(cueMap, input);
    },
    [cueMap],
  );

  const isActive = useCallback(
    (at: Seconds = 0, until?: Seconds) =>
      isActiveWindow(snapshot.currentTime, at, until),
    [snapshot.currentTime],
  );

  const segmentProgressFn = useCallback(
    (at: Seconds = 0, until?: Seconds) =>
      segmentProgress(snapshot.currentTime, at, until),
    [snapshot.currentTime],
  );

  const hasReached = useCallback(
    (at: Seconds) => snapshot.currentTime >= at,
    [snapshot.currentTime],
  );

  const getCueTimeFn = useCallback(
    (cueId: string) => getCueTime(cueMap, cueId),
    [cueMap],
  );

  const isCueActive = useCallback(
    (cueId: string, untilCueId?: string) => {
      const start = getCueTime(cueMap, cueId);
      if (start === undefined) return false;
      const end = untilCueId ? getCueTime(cueMap, untilCueId) : undefined;
      return isActiveWindow(snapshot.currentTime, start, end);
    },
    [cueMap, snapshot.currentTime],
  );

  const value = useMemo<DemoTimelineContextValue>(
    () => ({
      ...snapshot,
      time,
      cues,
      cueMap,
      play,
      pause,
      seek,
      restart,
      setPlaybackRate,
      isActive,
      segmentProgress: segmentProgressFn,
      hasReached,
      getCueTime: getCueTimeFn,
      isCueActive,
      resolveTime,
    }),
    [
      snapshot,
      time,
      cues,
      cueMap,
      play,
      pause,
      seek,
      restart,
      setPlaybackRate,
      isActive,
      segmentProgressFn,
      hasReached,
      getCueTimeFn,
      isCueActive,
      resolveTime,
    ],
  );

  return (
    <DemoTimelineContext.Provider value={value}>
      {children}
    </DemoTimelineContext.Provider>
  );
}

/**
 * Optional pass-through for readability in demo trees.
 * Must render inside DemoPlayer.
 */
export function DemoTimeline({ children }: { children: ReactNode }) {
  useTimelineContext();
  return <>{children}</>;
}

export function useTimelineContext(): DemoTimelineContextValue {
  const ctx = useContext(DemoTimelineContext);
  if (!ctx) {
    throw new Error(
      "Marketing motion components must render inside <DemoPlayer>.",
    );
  }
  return ctx;
}

/** Safe variant that returns null outside a player (for optional controls). */
export function useTimelineContextOptional(): DemoTimelineContextValue | null {
  return useContext(DemoTimelineContext);
}

// Re-exported name expected by the public hooks API.
export { useTimelineContext as useTimeline };
