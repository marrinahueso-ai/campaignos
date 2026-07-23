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
  {
    id: "plan-your-year",
    label: "Plan Your Year",
    description:
      "School-year calendar with event detail and preferred posting times.",
    specId: "plan-your-year",
    Demo: lazyDemo(() => import("@/marketing/demos/PlanYourYear"), {
      loading: () => DemoLoadingFallback(),
      ssr: false,
    }),
  },
  {
    id: "approvals",
    label: "Approvals",
    description:
      "Assigned to Me queue — review Save the Date and approve in place.",
    specId: "approvals",
    Demo: lazyDemo(() => import("@/marketing/demos/Approvals"), {
      loading: () => DemoLoadingFallback(),
      ssr: false,
    }),
  },
  {
    id: "volunteer-intelligence",
    label: "Volunteer Intelligence",
    description:
      "Volunteer Master fill rate and roles that still need help.",
    specId: "volunteer-intelligence",
    Demo: lazyDemo(() => import("@/marketing/demos/VolunteerIntelligence"), {
      loading: () => DemoLoadingFallback(),
      ssr: false,
    }),
  },
  {
    id: "communications-hub",
    label: "Communications Hub",
    description:
      "Meta inbox unread thread with AI draft and approve-then-send.",
    specId: "communications-hub",
    Demo: lazyDemo(() => import("@/marketing/demos/CommunicationsHub"), {
      loading: () => DemoLoadingFallback(),
      ssr: false,
    }),
  },
  {
    id: "ask-ralli",
    label: "Ask Ralli",
    description:
      "Ask Ralli answers what to do next with Approvals and Volunteers chips.",
    specId: "ask-ralli",
    Demo: lazyDemo(() => import("@/marketing/demos/AskRalli"), {
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
