/**
 * Pure org billing helpers (safe for unit tests — no server-only).
 */

import {
  type AiPlanTier,
  DEFAULT_PAID_PLAN_TIER,
  PLAN_MONTHLY_CREDITS,
} from "@/lib/ai/credit-constants";
import {
  entitlementsForEffectiveTier,
  type PlanCapacityKey,
  type PlanEntitlements,
  type PlanFeatureKey,
} from "@/lib/billing/entitlements";

export type SubscriptionStatus =
  | "none"
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "incomplete";

export type OrgBillingSnapshot = {
  organizationId: string;
  billingExempt: boolean;
  planTier: AiPlanTier;
  /** Tier used for feature/capacity gates (expired trial → starter). */
  effectiveTier: AiPlanTier | "expired_trial";
  subscriptionStatus: SubscriptionStatus;
  trialEndsAt: string | null;
  trialActive: boolean;
  trialExpired: boolean;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  stripePriceId: string | null;
  entitlements: PlanEntitlements;
  unlimitedCredits: boolean;
};

const PAID_TIERS = new Set<string>([
  "starter",
  "professional",
  "premium",
  "trial",
  "founding",
]);

function asPlanTier(value: string | null | undefined): AiPlanTier {
  if (value && PAID_TIERS.has(value)) return value as AiPlanTier;
  return DEFAULT_PAID_PLAN_TIER;
}

function asStatus(value: string | null | undefined): SubscriptionStatus {
  if (
    value === "trialing" ||
    value === "active" ||
    value === "past_due" ||
    value === "canceled" ||
    value === "incomplete"
  ) {
    return value;
  }
  return "none";
}

export function trialEndsAtFromNow(now: Date = new Date()): string {
  const end = new Date(now.getTime());
  end.setUTCDate(end.getUTCDate() + 14);
  return end.toISOString();
}

export function buildOrgBillingSnapshot(
  row: {
    id: string;
    billing_exempt_at?: string | null;
    plan_tier?: string | null;
    subscription_status?: string | null;
    trial_ends_at?: string | null;
    stripe_customer_id?: string | null;
    stripe_subscription_id?: string | null;
    stripe_price_id?: string | null;
  },
  now: Date = new Date(),
): OrgBillingSnapshot {
  const billingExempt = Boolean(row.billing_exempt_at);
  if (billingExempt) {
    return {
      organizationId: row.id,
      billingExempt: true,
      planTier: "founding",
      effectiveTier: "founding",
      subscriptionStatus: "none",
      trialEndsAt: null,
      trialActive: false,
      trialExpired: false,
      stripeCustomerId: row.stripe_customer_id ?? null,
      stripeSubscriptionId: row.stripe_subscription_id ?? null,
      stripePriceId: row.stripe_price_id ?? null,
      entitlements: entitlementsForEffectiveTier("founding"),
      unlimitedCredits: true,
    };
  }

  const planTier = asPlanTier(row.plan_tier);
  const subscriptionStatus = asStatus(row.subscription_status);
  const trialEndsAt = row.trial_ends_at ?? null;
  const trialEndMs = trialEndsAt ? Date.parse(trialEndsAt) : NaN;
  const trialActive =
    planTier === "trial" &&
    Number.isFinite(trialEndMs) &&
    trialEndMs > now.getTime();
  const trialExpired =
    planTier === "trial" &&
    Number.isFinite(trialEndMs) &&
    trialEndMs <= now.getTime();

  const effectiveTier: AiPlanTier | "expired_trial" = trialExpired
    ? "expired_trial"
    : planTier === "trial" && !trialActive
      ? "expired_trial"
      : planTier;

  return {
    organizationId: row.id,
    billingExempt: false,
    planTier,
    effectiveTier,
    subscriptionStatus,
    trialEndsAt,
    trialActive,
    trialExpired,
    stripeCustomerId: row.stripe_customer_id ?? null,
    stripeSubscriptionId: row.stripe_subscription_id ?? null,
    stripePriceId: row.stripe_price_id ?? null,
    entitlements: entitlementsForEffectiveTier(effectiveTier),
    unlimitedCredits: false,
  };
}

export function orgHasFeature(
  snapshot: OrgBillingSnapshot,
  feature: PlanFeatureKey,
): boolean {
  return snapshot.entitlements.features[feature];
}

export function orgCapacityLimit(
  snapshot: OrgBillingSnapshot,
  key: PlanCapacityKey,
): number | null {
  return snapshot.entitlements.capacity[key];
}

/** Credit tier written to balances (trial → trial; expired trial → starter). */
export function creditTierFromSnapshot(
  snapshot: OrgBillingSnapshot,
): AiPlanTier {
  if (snapshot.unlimitedCredits) return "founding";
  if (snapshot.trialActive) return "trial";
  if (snapshot.trialExpired || snapshot.effectiveTier === "expired_trial") {
    return "starter";
  }
  if (
    snapshot.planTier === "starter" ||
    snapshot.planTier === "professional" ||
    snapshot.planTier === "premium"
  ) {
    return snapshot.planTier;
  }
  return DEFAULT_PAID_PLAN_TIER;
}

export function creditAllowanceForSnapshot(
  snapshot: OrgBillingSnapshot,
): number | null {
  if (snapshot.unlimitedCredits) return null;
  const tier = creditTierFromSnapshot(snapshot);
  if (tier === "founding") return null;
  return PLAN_MONTHLY_CREDITS[tier];
}

export function formatTrialRemaining(
  trialEndsAt: string | null,
  now = new Date(),
): string | null {
  if (!trialEndsAt) return null;
  const ms = Date.parse(trialEndsAt) - now.getTime();
  if (ms <= 0) return "Trial ended";
  const days = Math.ceil(ms / (24 * 60 * 60 * 1000));
  if (days === 1) return "1 day left in trial";
  return `${days} days left in trial`;
}
