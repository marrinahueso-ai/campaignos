"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MotionProvider, useMotionConfig } from "./MotionProvider";
import { DemoTimelineProvider } from "./DemoTimeline";
import { DemoControls } from "./DemoControls";
import { useDemoClock } from "./hooks/useDemoClock";
import type { DemoPlayerProps, DemoSnapshot, TimelineCue } from "./types";

function DemoPlayerInner({
  duration: durationProp,
  timeline,
  autoPlay = true,
  autoPlayDelay = 0,
  loop: loopProp,
  playbackRate = 1,
  initialTime = 0,
  showControls = false,
  pauseWhenOffscreen = true,
  pauseWhenHidden = true,
  inViewAmount = 0.2,
  onComplete,
  className,
  style,
  "aria-label": ariaLabel = "Product demonstration",
  fallback = null,
  children,
}: Omit<DemoPlayerProps, "reducedMotion" | "forceReducedMotion">) {
  const { reducedMotion } = useMotionConfig();
  const rootRef = useRef<HTMLDivElement | null>(null);

  const duration = timeline?.duration ?? durationProp ?? 10;
  const loop = loopProp ?? timeline?.loop ?? true;
  const cues: TimelineCue[] = timeline?.cues ?? [];

  // Gate playback until after hydration so SSR markup matches the first client paint.
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setReady(true);
  }, []);

  const [inView, setInView] = useState(true);
  const [tabVisible, setTabVisible] = useState(true);
  const resumeAfterHidden = useRef(false);
  const resumeAfterOffscreen = useRef(false);
  const wasPlayingRef = useRef(false);

  const canRun =
    ready &&
    (!pauseWhenOffscreen || inView) &&
    (!pauseWhenHidden || tabVisible);

  const clock = useDemoClock({
    duration,
    autoPlay: ready && !reducedMotion ? autoPlay : false,
    autoPlayDelay,
    loop,
    playbackRate,
    initialTime: reducedMotion ? duration : initialTime,
    canRun: canRun && !reducedMotion,
    onComplete,
  });

  // Reduced motion: jump to informative end state and stay paused.
  useEffect(() => {
    if (!ready || !reducedMotion) return;
    clock.pause();
    clock.seek(duration);
  }, [clock, duration, ready, reducedMotion]);

  // Tab visibility — pause without advancing time on resume.
  useEffect(() => {
    if (!pauseWhenHidden || typeof document === "undefined") return;

    const onVisibility = () => {
      const visible = document.visibilityState === "visible";
      setTabVisible(visible);
      if (!visible) {
        resumeAfterHidden.current = wasPlayingRef.current;
        clock.pause();
      } else if (resumeAfterHidden.current && inView) {
        resumeAfterHidden.current = false;
        if (!reducedMotion) clock.play();
      }
    };

    onVisibility();
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [clock, inView, pauseWhenHidden, reducedMotion]);

  // Offscreen pause via IntersectionObserver.
  useEffect(() => {
    if (!pauseWhenOffscreen) {
      setInView(true);
      return;
    }
    const node = rootRef.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }

    const threshold =
      typeof inViewAmount === "number"
        ? inViewAmount
        : inViewAmount === "all"
          ? 0.99
          : 0.15;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const next = Boolean(entry?.isIntersecting);
        setInView((prev) => {
          if (prev && !next) {
            resumeAfterOffscreen.current = wasPlayingRef.current;
            clock.pause();
          } else if (!prev && next && resumeAfterOffscreen.current && tabVisible) {
            resumeAfterOffscreen.current = false;
            if (!reducedMotion) clock.play();
          }
          return next;
        });
      },
      { threshold },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [clock, inViewAmount, pauseWhenOffscreen, reducedMotion, tabVisible]);

  useEffect(() => {
    wasPlayingRef.current = clock.isPlaying;
  }, [clock.isPlaying]);

  const snapshot: DemoSnapshot = useMemo(
    () => ({
      currentTime: clock.currentTime,
      duration: clock.duration,
      progress: clock.progress,
      isPlaying: clock.isPlaying,
      playbackRate: clock.playbackRate,
      loop,
      reducedMotion,
    }),
    [
      clock.currentTime,
      clock.duration,
      clock.progress,
      clock.isPlaying,
      clock.playbackRate,
      loop,
      reducedMotion,
    ],
  );

  const play = useCallback(() => {
    if (reducedMotion) return;
    clock.play();
  }, [clock, reducedMotion]);

  return (
    <DemoTimelineProvider
      snapshot={snapshot}
      time={clock.time}
      cues={cues}
      play={play}
      pause={clock.pause}
      seek={clock.seek}
      restart={() => {
        if (reducedMotion) {
          clock.seek(duration);
          return;
        }
        clock.restart();
      }}
      setPlaybackRate={clock.setPlaybackRate}
    >
      <div
        ref={rootRef}
        className={className}
        style={style}
        role="region"
        aria-label={ariaLabel}
        data-marketing-demo-player
        data-ready={ready ? "true" : "false"}
        data-playing={clock.isPlaying ? "true" : "false"}
        data-reduced-motion={reducedMotion ? "true" : "false"}
        suppressHydrationWarning
      >
        <div className="relative h-full w-full overflow-hidden">
          {ready ? children : fallback}
        </div>
        {showControls && ready ? <DemoControls /> : null}
      </div>
    </DemoTimelineProvider>
  );
}

/**
 * Owns the shared demo clock and timeline context.
 * Wrap with MotionProvider automatically when none is present.
 */
export function DemoPlayer({
  reducedMotion = "system",
  forceReducedMotion = false,
  ...props
}: DemoPlayerProps) {
  return (
    <MotionProvider
      reducedMotion={reducedMotion}
      forceReducedMotion={forceReducedMotion}
    >
      <DemoPlayerInner {...props} />
    </MotionProvider>
  );
}
