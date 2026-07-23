"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useMotionValue, type MotionValue } from "motion/react";
import type { Seconds } from "../types";

export interface UseDemoClockOptions {
  duration: Seconds;
  autoPlay?: boolean;
  autoPlayDelay?: Seconds;
  loop?: boolean;
  playbackRate?: number;
  initialTime?: Seconds;
  /** When false, rAF loop will not advance time. */
  canRun?: boolean;
  onComplete?: () => void;
}

export interface DemoClockApi {
  time: MotionValue<number>;
  currentTime: Seconds;
  duration: Seconds;
  progress: number;
  isPlaying: boolean;
  playbackRate: number;
  play: () => void;
  pause: () => void;
  seek: (next: Seconds) => void;
  restart: () => void;
  setPlaybackRate: (rate: number) => void;
}

/**
 * Single requestAnimationFrame playback clock.
 * Uses elapsed wall-clock deltas so hiding a tab does not jump time.
 */
export function useDemoClock(options: UseDemoClockOptions): DemoClockApi {
  const {
    duration,
    autoPlay = true,
    autoPlayDelay = 0,
    loop = true,
    playbackRate: initialRate = 1,
    initialTime = 0,
    canRun = true,
    onComplete,
  } = options;

  const time = useMotionValue(clampTime(initialTime, duration));
  const [currentTime, setCurrentTime] = useState(() =>
    clampTime(initialTime, duration),
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRateState] = useState(
    Math.max(0.1, initialRate),
  );

  const playingRef = useRef(false);
  const rateRef = useRef(Math.max(0.1, initialRate));
  const durationRef = useRef(duration);
  const loopRef = useRef(loop);
  const canRunRef = useRef(canRun);
  const rafRef = useRef<number | null>(null);
  const lastStampRef = useRef<number | null>(null);
  const onCompleteRef = useRef(onComplete);

  durationRef.current = duration;
  loopRef.current = loop;
  canRunRef.current = canRun;
  onCompleteRef.current = onComplete;

  const commitTime = useCallback(
    (next: Seconds) => {
      const clamped = clampTime(next, durationRef.current);
      time.set(clamped);
      setCurrentTime(clamped);
      return clamped;
    },
    [time],
  );

  const stopRaf = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    lastStampRef.current = null;
  }, []);

  const tick = useCallback(
    (stamp: number) => {
      if (!playingRef.current || !canRunRef.current) {
        stopRaf();
        return;
      }

      const last = lastStampRef.current;
      lastStampRef.current = stamp;

      if (last !== null) {
        const deltaSec = ((stamp - last) / 1000) * rateRef.current;
        // Guard against long background gaps (browser suspensions).
        const safeDelta = Math.min(deltaSec, 0.1 * rateRef.current);
        let next = time.get() + safeDelta;
        const dur = durationRef.current;

        if (next >= dur) {
          onCompleteRef.current?.();
          if (loopRef.current) {
            // Deterministic wrap — preserve fractional overshoot lightly.
            next = next % dur;
            if (next === 0 && dur > 0) {
              // Keep a tiny epsilon so cue-at-0 can re-trigger visually on loop.
              next = 0;
            }
          } else {
            next = dur;
            playingRef.current = false;
            setIsPlaying(false);
            commitTime(next);
            stopRaf();
            return;
          }
        }

        commitTime(next);
      }

      rafRef.current = requestAnimationFrame(tick);
    },
    [commitTime, stopRaf, time],
  );

  const play = useCallback(() => {
    if (playingRef.current) return;
    if (time.get() >= durationRef.current && !loopRef.current) {
      commitTime(0);
    }
    playingRef.current = true;
    setIsPlaying(true);
    if (canRunRef.current) {
      lastStampRef.current = null;
      rafRef.current = requestAnimationFrame(tick);
    }
  }, [commitTime, tick, time]);

  const pause = useCallback(() => {
    playingRef.current = false;
    setIsPlaying(false);
    stopRaf();
  }, [stopRaf]);

  const seek = useCallback(
    (next: Seconds) => {
      commitTime(next);
      // Reset delta baseline so seek does not jump after resume.
      lastStampRef.current = null;
    },
    [commitTime],
  );

  const restart = useCallback(() => {
    commitTime(0);
    lastStampRef.current = null;
    if (!playingRef.current) {
      play();
    }
  }, [commitTime, play]);

  const setPlaybackRate = useCallback((rate: number) => {
    const next = Math.max(0.1, rate);
    rateRef.current = next;
    setPlaybackRateState(next);
    lastStampRef.current = null;
  }, []);

  // Sync duration / rate props.
  useEffect(() => {
    rateRef.current = Math.max(0.1, initialRate);
    setPlaybackRateState(Math.max(0.1, initialRate));
  }, [initialRate]);

  useEffect(() => {
    commitTime(Math.min(time.get(), duration));
  }, [commitTime, duration, time]);

  // Pause rAF while canRun is false; resume if still playing.
  useEffect(() => {
    canRunRef.current = canRun;
    if (!canRun) {
      stopRaf();
      return;
    }
    if (playingRef.current && rafRef.current === null) {
      lastStampRef.current = null;
      rafRef.current = requestAnimationFrame(tick);
    }
  }, [canRun, stopRaf, tick]);

  // Autoplay once when enabled (supports post-hydration ready gates).
  const didAutoplayRef = useRef(false);
  useEffect(() => {
    if (!autoPlay || didAutoplayRef.current) return;
    const delayMs = Math.max(0, autoPlayDelay) * 1000;
    const id = window.setTimeout(() => {
      didAutoplayRef.current = true;
      play();
    }, delayMs);
    return () => window.clearTimeout(id);
  }, [autoPlay, autoPlayDelay, play]);

  // Cleanup on unmount.
  useEffect(() => () => stopRaf(), [stopRaf]);

  const progress = duration > 0 ? currentTime / duration : 0;

  return {
    time,
    currentTime,
    duration,
    progress,
    isPlaying,
    playbackRate,
    play,
    pause,
    seek,
    restart,
    setPlaybackRate,
  };
}

function clampTime(value: Seconds, duration: Seconds): Seconds {
  if (duration <= 0) return 0;
  if (value < 0) return 0;
  if (value > duration) return duration;
  return value;
}
