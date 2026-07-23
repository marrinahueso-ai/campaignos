/**
 * Hey Ralli Marketing Motion Engine — public API.
 * Prefer named imports. For smaller bundles, import primitives from
 * `@/marketing/engine/primitives/...` directly.
 */

export { MotionProvider, useMotionConfig } from "./MotionProvider";
export { DemoPlayer } from "./DemoPlayer";
export { DemoTimeline, DemoTimelineProvider, useTimeline } from "./DemoTimeline";
export { DemoControls } from "./DemoControls";
export { Scene } from "./Scene";

export {
  useDemoClock,
  useInViewPlay,
  useReducedMotion,
  useSystemReducedMotion,
  useTiming,
  useTimelineContextOptional,
} from "./hooks";

export type { DemoClockApi, UseDemoClockOptions, UseInViewPlayOptions, UseTimingResult } from "./hooks";

export {
  Cursor,
  CursorRipple,
  MouseClick,
  TypingAnimation,
  CountUp,
  ProgressRing,
  ProgressBar,
  Highlight,
  Glow,
  Pulse,
  FloatingCard,
  FadeSlide,
  Drawer,
  Toast,
  BadgeChange,
  Skeleton,
  Confetti,
  AutoScroll,
  SectionSpotlight,
} from "./primitives";

export type {
  CursorProps,
  CursorRippleProps,
  MouseClickProps,
  TypingAnimationProps,
  CountUpProps,
  ProgressRingProps,
  ProgressBarProps,
  HighlightProps,
  GlowProps,
  PulseProps,
  FloatingCardProps,
  FadeSlideProps,
  DrawerProps,
  ToastProps,
  BadgeChangeProps,
  SkeletonProps,
  ConfettiProps,
  AutoScrollProps,
  SectionSpotlightProps,
} from "./primitives";

export { defineTimeline, buildCueMap, resolveTiming } from "./utils/timeline";
export {
  clamp,
  lerp,
  inverseLerp,
  smoothstep,
  segmentProgress,
  isActiveWindow,
  resolveCoordinate,
  formatCount,
} from "./utils/interpolate";
export {
  EASE_OUT_SOFT,
  EASE_OUT_CRISP,
  EASE_IN_OUT_SOFT,
  DEFAULT_MOTION_DEFAULTS,
  resolveEase,
} from "./utils/easing";
export {
  lazyDemo,
  DemoLoadingFallback,
  GPU_LAYER_STYLE,
  SAFE_MOTION_PROPS,
} from "./utils/performance";

export type {
  Seconds,
  Progress,
  TimelineCue,
  TimelineDefinition,
  MotionDefaults,
  MotionProviderConfig,
  DemoPlayerProps,
  DemoSnapshot,
  DemoTimelineContextValue,
  TimingProps,
  PrimitiveBaseProps,
  CursorKeyframe,
  SlideDirection,
  DrawerPlacement,
  ToastStatus,
  LazyDemoOptions,
} from "./types";
