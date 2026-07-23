/**
 * Typed contract for Hey Ralli marketing demos.
 * Specs are authoring-time documents — not runtime AI prompts.
 */

export type DemoId = string;

export type EnginePrimitiveName =
  | "Cursor"
  | "CursorRipple"
  | "MouseClick"
  | "TypingAnimation"
  | "CountUp"
  | "ProgressRing"
  | "ProgressBar"
  | "Highlight"
  | "Glow"
  | "Pulse"
  | "FloatingCard"
  | "FadeSlide"
  | "Drawer"
  | "Toast"
  | "BadgeChange"
  | "Skeleton"
  | "Confetti"
  | "AutoScroll"
  | "SectionSpotlight"
  | "Scene";

export interface DemoBeat {
  /** Stable beat id (kebab-case). Used for cues / authoring. */
  id: string;
  label: string;
  /** Start time in seconds. */
  start: number;
  /** End time in seconds (exclusive or inclusive — must be > start). */
  end: number;
  description: string;
  /** Suggested Motion Engine primitives for this beat. */
  preferredPrimitives?: EnginePrimitiveName[];
  /**
   * When true, this beat may overlap others even if the demo
   * disallows overlap by default (e.g. staggered milestone reveals).
   */
  overlapOk?: boolean;
}

export interface DemoPlayback {
  /** Total duration in seconds (typically 18–28). */
  duration: number;
  loop: boolean;
  autoplay: boolean;
  /**
   * When false (default), major beats must not overlap unless
   * a beat sets `overlapOk: true`.
   */
  allowBeatOverlap?: boolean;
}

export interface DemoStates {
  startingState: string;
  finalState: string;
  /** Immediate completed state for prefers-reduced-motion. */
  reducedMotionState: string;
}

export interface DemoContent {
  requiredText?: Record<string, string>;
  requiredLists?: Record<string, string[]>;
  requiredMetrics?: Record<string, number | string>;
}

export interface DemoResponsive {
  /** Story elements that must remain visible on all breakpoints. */
  primaryStory: string[];
  mobileSimplifications?: string[];
}

export interface DemoAccessibility {
  announcements?: string[];
  decorativeElements?: string[];
  notes?: string[];
}

export interface DemoSpec {
  /** Stable kebab-case id, e.g. "create-ai". */
  id: DemoId;
  /** Human title, e.g. "Create with AI". */
  name: string;
  /** PascalCase folder name under src/marketing/demos/, e.g. "CreateAI". */
  folderName: string;
  description: string;
  productArea: string;
  audience?: string;
  goal: string;
  /** Label shown in the private harness selector. */
  previewLabel: string;
  playback: DemoPlayback;
  states: DemoStates;
  beats: DemoBeat[];
  content: DemoContent;
  responsive: DemoResponsive;
  accessibility?: DemoAccessibility;
  /** Things this demo must never include. */
  restrictions?: string[];
  suggestedPrimitives?: EnginePrimitiveName[];
}

export interface DemoSpecIssue {
  path: string;
  message: string;
}

export interface DemoSpecValidationResult {
  ok: boolean;
  errors: DemoSpecIssue[];
  warnings: DemoSpecIssue[];
}

/** Registry entry for private harness listing (runtime). */
export interface DemoRegistryEntry {
  id: DemoId;
  label: string;
  description?: string;
  /** Spec id when a DemoSpec exists for this demo. */
  specId?: DemoId;
}
