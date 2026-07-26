/**
 * UI mirror of the locked commercial matrix.
 * Product source of truth: docs/ops/ai-credits-matrix.md
 * Credit numbers: src/lib/ai/credit-constants.ts
 */

import {
  AI_RESERVE_SKUS,
  PLAN_MONTHLY_CREDITS,
  type AiPlanTier,
} from "@/lib/ai/credit-constants";

export type PaidPlanId = "starter" | "professional" | "premium";

export type PlanCatalogEntry = {
  id: PaidPlanId;
  name: string;
  /** Display name (Premium may include star). */
  displayName: string;
  priceUsd: number;
  monthlyCredits: number;
  description: string;
  /** Short bullets for marketing /pricing and Settings upgrade grid. */
  features: string[];
  /** Highlight card (recommended destination = Premium). */
  highlighted: boolean;
  badge: string | null;
  marketingCta: string;
};

/** Pre-Stripe metering default for non-exempt orgs (matches credit-constants). */
export const PRE_STRIPE_DEFAULT_PLAN_ID: PaidPlanId = "professional";

export const BILLING_TRIAL = {
  days: 14,
  credits: PLAN_MONTHLY_CREDITS.trial,
  featuresLikePlanId: "professional" as PaidPlanId,
};

export const CHECKOUT_COMING_SOON =
  "Self-serve checkout is coming soon. Early access uses a founding code or invite.";

export const PAID_PLANS: readonly PlanCatalogEntry[] = [
  {
    id: "starter",
    name: "Starter",
    displayName: "Starter",
    priceUsd: 49,
    monthlyCredits: PLAN_MONTHLY_CREDITS.starter,
    description:
      "A capped school year to try the workflow — built to nudge you toward Professional.",
    features: [
      `${PLAN_MONTHLY_CREDITS.starter.toLocaleString()} AI credits / month`,
      "Calendar, events, and Create with AI",
      "Up to 15 events / school year · 5 team seats",
      "Meta publishing (10 posts / month)",
      "Basic approvals & standard analytics",
    ],
    highlighted: false,
    badge: null,
    marketingCta: "Start 14-day free trial",
  },
  {
    id: "professional",
    name: "Professional",
    displayName: "Professional",
    priceUsd: 79,
    monthlyCredits: PLAN_MONTHLY_CREDITS.professional,
    description:
      "Run the school year: full core workflow with AI — capacity feels snug on a busy calendar.",
    features: [
      `${PLAN_MONTHLY_CREDITS.professional.toLocaleString()} AI credits / month`,
      "Ask Ralli, Volunteer Center, Communication Hub",
      "Unlimited events · 15 team seats",
      "Meta publishing (40 posts / month)",
      "Approvals, custom roles, change requests",
    ],
    highlighted: false,
    badge: null,
    marketingCta: "Start 14-day free trial",
  },
  {
    id: "premium",
    name: "Premium",
    displayName: "Premium ⭐",
    priceUsd: 129,
    monthlyCredits: PLAN_MONTHLY_CREDITS.premium,
    description:
      "Recommended for most active PTOs — AI headroom, Inbox, Custom Dashboard, and room to grow.",
    features: [
      `${PLAN_MONTHLY_CREDITS.premium.toLocaleString()} AI credits / month`,
      `Includes $${AI_RESERVE_SKUS.reserve.priceUsd} AI Reserve (${AI_RESERVE_SKUS.reserve.credits.toLocaleString()} credits) / year`,
      "AI Inbox replies · Custom Dashboard",
      "Unlimited Meta posts, seats, and social accounts",
      "Priority support",
    ],
    highlighted: true,
    badge: "Best for most schools",
    marketingCta: "Start 14-day free trial",
  },
] as const;

export function planById(id: PaidPlanId): PlanCatalogEntry {
  const plan = PAID_PLANS.find((entry) => entry.id === id);
  if (!plan) {
    throw new Error(`Unknown plan id: ${id}`);
  }
  return plan;
}

export function formatPlanPrice(priceUsd: number): string {
  return `$${priceUsd}`;
}

export function planLabelForTier(
  tier: AiPlanTier,
  options?: { founding?: boolean },
): string {
  if (options?.founding || tier === "founding") return "Founding Partner";
  if (tier === "trial") return "Trial";
  if (tier === "starter") return planById("starter").displayName;
  if (tier === "premium") return planById("premium").displayName;
  return planById("professional").displayName;
}

export const RESERVE_CATALOG = (
  Object.entries(AI_RESERVE_SKUS) as [
    keyof typeof AI_RESERVE_SKUS,
    (typeof AI_RESERVE_SKUS)[keyof typeof AI_RESERVE_SKUS],
  ][]
).map(([id, sku]) => ({
  id,
  label: sku.label,
  priceUsd: sku.priceUsd,
  credits: sku.credits,
}));
