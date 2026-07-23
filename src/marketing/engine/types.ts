import type { Easing, MotionValue } from "motion/react";
import type { CSSProperties, ReactNode } from "react";

/** Timeline time in seconds. */
export type Seconds = number;

/** Normalized progress in the range [0, 1]. */
export type Progress = number;

export type Axis = "x" | "y";

export type SlideDirection = "up" | "down" | "left" | "right";

export type DrawerPlacement = "left" | "right" | "top" | "bottom";

export type ToastStatus = "info" | "success" | "warning" | "error" | "neutral";

export interface TimelineCue {
  /** Absolute time in seconds from demo start. */
  at: Seconds;
  /** Stable cue identifier used by scenes and primitives. */
  id: string;
  /** Optional human-readable label for tooling / harness. */
  label?: string;
}

export interface TimelineDefinition {
  id: string;
  duration: Seconds;
  loop?: boolean;
  cues?: TimelineCue[];
}

export interface MotionDefaults {
  /** Default enter/exit duration in seconds. */
  duration: Seconds;
  /** Default Motion easing. */
  ease: Easing | Easing[];
  /** Default enter travel distance in pixels. */
  enterDistance: number;
  /** Default exit travel distance in pixels. */
  exitDistance: number;
  /** Default subtle scale pulse peak. */
  pulseScale: number;
  /** Default restrained glow opacity. */
  glowOpacity: number;
}

export interface MotionProviderConfig {
  /**
   * Reduced-motion source.
   * - `"system"` (default): follow `prefers-reduced-motion`
   * - `true` / `false`: force on/off regardless of system preference
   */
  reducedMotion?: boolean | "system";
  /** Force reduced motion for development / testing. Overrides `reducedMotion`. */
  forceReducedMotion?: boolean;
  /** Partial overrides for brand-safe motion defaults. */
  defaults?: Partial<MotionDefaults>;
  children?: ReactNode;
}

export interface DemoPlayerProps {
  /** Explicit duration in seconds. Ignored when `timeline.duration` is set. */
  duration?: Seconds;
  /** Declarative timeline definition (duration + cues). */
  timeline?: TimelineDefinition;
  /** Forwarded to MotionProvider — follow system preference by default. */
  reducedMotion?: boolean | "system";
  /** Force reduced motion for harness / tests. */
  forceReducedMotion?: boolean;
  /** Start playback after mount (and after `autoPlayDelay`). Default true. */
  autoPlay?: boolean;
  /** Delay before autoplay begins, in seconds. */
  autoPlayDelay?: Seconds;
  /** Restart from 0 when duration is reached. Default true. */
  loop?: boolean;
  /** Playback speed multiplier. Default 1. */
  playbackRate?: number;
  /** Initial clock time in seconds. */
  initialTime?: Seconds;
  /** Show built-in DemoControls. Default false. */
  showControls?: boolean;
  /** Pause while the player is outside the viewport. Default true. */
  pauseWhenOffscreen?: boolean;
  /** Pause while the document tab is hidden. Default true. */
  pauseWhenHidden?: boolean;
  /** Intersection threshold for offscreen pausing. */
  inViewAmount?: number | "some" | "all";
  /** Called once each time the timeline reaches the end (including before loop). */
  onComplete?: () => void;
  /** Optional className for the player root. */
  className?: string;
  /** Optional inline style for the player root. */
  style?: CSSProperties;
  /** Accessible label for the demo region. */
  "aria-label"?: string;
  /**
   * Shown until the player mounts on the client.
   * Animated children render only after mount to avoid hydration mismatches
   * from Motion transform/opacity styles.
   */
  fallback?: ReactNode;
  children?: ReactNode;
}

export interface DemoSnapshot {
  currentTime: Seconds;
  duration: Seconds;
  progress: Progress;
  isPlaying: boolean;
  playbackRate: number;
  loop: boolean;
  reducedMotion: boolean;
}

export interface DemoTimelineContextValue extends DemoSnapshot {
  time: MotionValue<number>;
  cues: TimelineCue[];
  cueMap: ReadonlyMap<string, TimelineCue>;
  play: () => void;
  pause: () => void;
  seek: (time: Seconds) => void;
  restart: () => void;
  setPlaybackRate: (rate: number) => void;
  isActive: (at?: Seconds, until?: Seconds) => boolean;
  segmentProgress: (at?: Seconds, until?: Seconds) => Progress;
  hasReached: (at: Seconds) => boolean;
  getCueTime: (cueId: string) => Seconds | undefined;
  isCueActive: (cueId: string, untilCueId?: string) => boolean;
  resolveTime: (input?: Seconds | string) => Seconds | undefined;
}

export interface TimingProps {
  /** Absolute start time in seconds. */
  at?: Seconds;
  /** Absolute end time in seconds. */
  until?: Seconds;
  /** Cue id for start (overrides `at` when present). */
  cue?: string;
  /** Cue id for end (overrides `until` when present). */
  untilCue?: string;
  /** Local animation duration in seconds (within the active window). */
  duration?: Seconds;
  /** Local delay in seconds after `at` / cue. */
  delay?: Seconds;
}

export interface PrimitiveBaseProps extends TimingProps {
  className?: string;
  style?: CSSProperties;
}

export type CursorKeyframe = {
  at: Seconds;
  x?: number | string;
  y?: number | string;
  opacity?: number;
  scale?: number;
  rotate?: number;
  click?: boolean;
};

export interface LazyDemoOptions {
  /** SSR placeholder while the demo chunk loads. */
  loading?: () => ReactNode;
  /** Disable SSR for the dynamic import. Default true. */
  ssr?: boolean;
}
