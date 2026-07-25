/**
 * Org AI credit allowances, weights, and Reserve SKUs.
 * Config-driven — change numbers here without schema migrations.
 * Living product matrix: docs/ops/ai-credits-matrix.md
 */

import type { AiActionType } from "@/lib/ai/types";

export const AI_CREDITS_CONFIG_VERSION = "2026-07-24";

export type AiPlanTier =
  | "starter"
  | "professional"
  | "premium"
  | "founding"
  | "trial";

/** Pre-Stripe default for non-exempt orgs. */
export const DEFAULT_PAID_PLAN_TIER: AiPlanTier = "professional";

/** Monthly plan credits (UTC period). No rollover. */
export const PLAN_MONTHLY_CREDITS: Record<
  Exclude<AiPlanTier, "founding">,
  number
> = {
  starter: 400,
  professional: 1200,
  premium: 2500,
  /** Total pool for 14-day trial window (not a full Pro month). */
  trial: 600,
};

export const ARTWORK_CREDIT_WEIGHT = 8;
export const TEXT_AI_CREDIT_WEIGHT = 1;

const ARTWORK_ACTIONS = new Set<AiActionType>([
  "generate_artwork",
  "orchestrate_artwork",
]);

export function creditCostForAction(
  actionType: AiActionType,
  success: boolean,
): number {
  if (!success) return 0;
  if (ARTWORK_ACTIONS.has(actionType)) return ARTWORK_CREDIT_WEIGHT;
  return TEXT_AI_CREDIT_WEIGHT;
}

/** Soft-warn when remaining period credits ≤ this (or ≤ 10% of allowance). */
export const SOFT_WARN_REMAINING_CREDITS = {
  starter: 40,
  professional: 120,
  premium: 250,
  trial: 60,
} as const;

export type AiReserveSkuId = "reserve" | "reserve_star" | "reserve_max";

export const AI_RESERVE_SKUS: Record<
  AiReserveSkuId,
  { priceUsd: number; credits: number; label: string }
> = {
  reserve: { priceUsd: 250, credits: 18_000, label: "AI Reserve" },
  reserve_star: { priceUsd: 500, credits: 40_000, label: "AI Reserve ⭐" },
  reserve_max: { priceUsd: 1000, credits: 85_000, label: "AI Reserve Max" },
};

/** Artwork regen / Generate-all safety caps (UX Phase 2+). */
export const ARTWORK_REGEN_CAPS = {
  starter: { perMilestone: 2, generateAllPerEventPerDay: 1 },
  professional: { perMilestone: 3, generateAllPerEventPerDay: 2 },
  premium: { perMilestone: 5, generateAllPerEventPerDay: 3 },
  trial: { perMilestone: 2, generateAllPerEventPerDay: 1 },
} as const;

export function periodYmUtc(date: Date = new Date()): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export function monthlyAllowanceForTier(tier: AiPlanTier): number | null {
  if (tier === "founding") return null;
  return PLAN_MONTHLY_CREDITS[tier];
}
