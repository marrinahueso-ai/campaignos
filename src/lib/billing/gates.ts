import "server-only";

import {
  CAPACITY_LABELS,
  FEATURE_LABELS,
  type PlanCapacityKey,
  type PlanFeatureKey,
} from "@/lib/billing/entitlements";
import {
  getOrgBillingSnapshot,
  orgCapacityLimit,
  orgHasFeature,
  type OrgBillingSnapshot,
} from "@/lib/billing/org-billing";
import { planById } from "@/lib/billing/plan-catalog";

export type GateDenial = {
  ok: false;
  code: "feature_locked" | "capacity_exceeded" | "billing_unavailable";
  message: string;
  upgradeHint: string;
};

export type GateAllow = { ok: true; snapshot: OrgBillingSnapshot };

export type GateResult = GateAllow | GateDenial;

function upgradeHint(snapshot: OrgBillingSnapshot | null): string {
  if (!snapshot || snapshot.trialExpired) {
    return "Choose a plan in Billing & Plan to continue.";
  }
  const premium = planById("premium");
  return `Upgrade to ${premium.displayName} ($${premium.priceUsd}/mo) in Billing & Plan for this feature.`;
}

export async function assertOrgFeature(
  organizationId: string,
  feature: PlanFeatureKey,
): Promise<GateResult> {
  const snapshot = await getOrgBillingSnapshot(organizationId);
  if (!snapshot) {
    return {
      ok: false,
      code: "billing_unavailable",
      message: "Could not load organization billing status.",
      upgradeHint: "Open Billing & Plan and try again.",
    };
  }
  if (orgHasFeature(snapshot, feature)) {
    return { ok: true, snapshot };
  }
  const label = FEATURE_LABELS[feature];
  return {
    ok: false,
    code: "feature_locked",
    message: `${label} is not included on your current plan.`,
    upgradeHint: upgradeHint(snapshot),
  };
}

export async function assertOrgCapacity(
  organizationId: string,
  key: PlanCapacityKey,
  currentCount: number,
): Promise<GateResult> {
  const snapshot = await getOrgBillingSnapshot(organizationId);
  if (!snapshot) {
    return {
      ok: false,
      code: "billing_unavailable",
      message: "Could not load organization billing status.",
      upgradeHint: "Open Billing & Plan and try again.",
    };
  }
  const limit = orgCapacityLimit(snapshot, key);
  if (limit == null || currentCount < limit) {
    return { ok: true, snapshot };
  }
  return {
    ok: false,
    code: "capacity_exceeded",
    message: `You've reached the plan limit for ${CAPACITY_LABELS[key]} (${limit}).`,
    upgradeHint: upgradeHint(snapshot),
  };
}
