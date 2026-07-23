"use client";

import type { ComponentType } from "react";
import { lazyDemo, DemoLoadingFallback } from "@/marketing/engine";
import type { DemoRegistryEntry } from "./types";

/** Props every registered marketing demo should accept in the harness. */
export interface RegisteredDemoProps {
  showControls?: boolean;
  forceReducedMotion?: boolean;
  className?: string;
}

export type RegisteredDemoComponent = ComponentType<RegisteredDemoProps>;

export interface MarketingDemoRegistration extends DemoRegistryEntry {
  /** Lazy component — keep demos out of the initial harness chunk when unused. */
  Demo: RegisteredDemoComponent;
}

/**
 * Marketing demo registry (lazy loaders + metadata).
 * Add new demos here after creating their folder under src/marketing/demos/.
 * Public Features may mount a registered demo with showControls={false}.
 * Do not import from dashboard or product workflows.
 */
export const MARKETING_DEMO_REGISTRY: readonly MarketingDemoRegistration[] = [
  {
    id: "create-ai",
    label: "Create with AI",
    description:
      "One school event becomes artwork, caption, milestones, and Ready for Review.",
    specId: "create-ai",
    Demo: lazyDemo(() => import("@/marketing/demos/CreateAI"), {
      loading: () => DemoLoadingFallback(),
      ssr: false,
    }),
  },
] as const;

export function listMarketingDemos(): readonly MarketingDemoRegistration[] {
  return MARKETING_DEMO_REGISTRY;
}

export function getMarketingDemo(
  id: string,
): MarketingDemoRegistration | undefined {
  return MARKETING_DEMO_REGISTRY.find((demo) => demo.id === id);
}

export function getDefaultMarketingDemoId(): string {
  return MARKETING_DEMO_REGISTRY[0]?.id ?? "create-ai";
}
