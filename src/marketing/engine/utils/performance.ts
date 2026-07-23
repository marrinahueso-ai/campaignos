import { createElement, type ComponentType, type ReactNode } from "react";
import dynamic from "next/dynamic";
import type { LazyDemoOptions } from "../types";

/**
 * GPU-friendly CSS hints for animated layers.
 * Prefer transform/opacity; avoid layout properties.
 */
export const GPU_LAYER_STYLE = {
  willChange: "transform, opacity",
  backfaceVisibility: "hidden" as const,
  transform: "translateZ(0)",
};

/** Properties that are safe to animate at 60fps. */
export const SAFE_MOTION_PROPS = [
  "opacity",
  "x",
  "y",
  "scale",
  "scaleX",
  "scaleY",
  "rotate",
  "rotateX",
  "rotateY",
  "rotateZ",
  "filter",
] as const;

/**
 * Lazy-load a future marketing demo (or harness panel) with `next/dynamic`.
 * Keeps Motion + demo code out of the initial marketing page bundle.
 *
 * @example
 * ```tsx
 * const CreateAIDemo = lazyDemo(() => import("@/marketing/demos/CreateAI"));
 * ```
 */
export function lazyDemo<P extends object>(
  loader: () => Promise<{ default: ComponentType<P> }>,
  options: LazyDemoOptions = {},
): ComponentType<P> {
  const { loading, ssr = false } = options;
  return dynamic(loader, {
    ssr,
    loading: loading ? () => loading() : () => null,
  });
}

/** Placeholder used while a demo chunk loads. */
export function DemoLoadingFallback(): ReactNode {
  return createElement(
    "div",
    {
      className:
        "flex h-full min-h-[12rem] w-full items-center justify-center rounded-2xl bg-[var(--cos-bg-alt)] text-sm text-[var(--cos-muted)]",
      "aria-hidden": true,
    },
    "Loading demo…",
  );
}
