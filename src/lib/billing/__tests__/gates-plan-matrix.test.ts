import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CAPACITY_LABELS,
  FEATURE_LABELS,
  type PlanCapacityKey,
  type PlanFeatureKey,
} from "../entitlements.ts";
import {
  buildOrgBillingSnapshot,
  orgCapacityLimit,
  orgHasFeature,
  type OrgBillingSnapshot,
} from "../org-billing-pure.ts";

/**
 * Smoke test for every plan-gate decision used by assertOrgFeature /
 * assertOrgCapacity (src/lib/billing/gates.ts). gates.ts itself is
 * server-only and can't be imported directly in this test runner, but
 * orgHasFeature / orgCapacityLimit are the exact predicates it calls —
 * this exercises the same decision for every documented key and plan.
 */

const FEATURE_KEYS = Object.keys(FEATURE_LABELS) as PlanFeatureKey[];
const CAPACITY_KEYS = Object.keys(CAPACITY_LABELS) as PlanCapacityKey[];

type ExpectedFeatures = Record<PlanFeatureKey, boolean>;
type ExpectedCapacity = Record<PlanCapacityKey, number | null>;

const STARTER_FEATURES: ExpectedFeatures = {
  ask_ralli: false,
  volunteer_center: false,
  communication_hub: false,
  inbox_ai: false,
  social_analytics: false,
  custom_dashboard: false,
  custom_roles: false,
  change_requests: false,
  priority_support: false,
};

const PROFESSIONAL_FEATURES: ExpectedFeatures = {
  ask_ralli: true,
  volunteer_center: true,
  communication_hub: true,
  inbox_ai: false,
  social_analytics: false,
  custom_dashboard: false,
  custom_roles: true,
  change_requests: true,
  priority_support: false,
};

const PREMIUM_FEATURES: ExpectedFeatures = {
  ask_ralli: true,
  volunteer_center: true,
  communication_hub: true,
  inbox_ai: true,
  social_analytics: true,
  custom_dashboard: true,
  custom_roles: true,
  change_requests: true,
  priority_support: true,
};

const STARTER_CAPACITY: ExpectedCapacity = {
  eventsPerSchoolYear: 15,
  teamMembers: 5,
  committeeChairs: 2,
  metaPostsPerMonth: 10,
  socialAccounts: 1,
};

const PROFESSIONAL_CAPACITY: ExpectedCapacity = {
  eventsPerSchoolYear: null,
  teamMembers: 15,
  committeeChairs: 8,
  metaPostsPerMonth: 40,
  socialAccounts: 1,
};

const UNLIMITED_CAPACITY: ExpectedCapacity = {
  eventsPerSchoolYear: null,
  teamMembers: null,
  committeeChairs: null,
  metaPostsPerMonth: null,
  socialAccounts: null,
};

function assertFeatureGates(
  label: string,
  snapshot: OrgBillingSnapshot,
  expected: ExpectedFeatures,
): void {
  for (const key of FEATURE_KEYS) {
    assert.equal(
      orgHasFeature(snapshot, key),
      expected[key],
      `${label}: feature gate "${key}" expected ${expected[key]}`,
    );
  }
}

function assertCapacityGates(
  label: string,
  snapshot: OrgBillingSnapshot,
  expected: ExpectedCapacity,
): void {
  for (const key of CAPACITY_KEYS) {
    assert.equal(
      orgCapacityLimit(snapshot, key),
      expected[key],
      `${label}: capacity gate "${key}" expected ${expected[key]}`,
    );
  }
}

/** Mirrors the exact allow/deny condition in assertOrgCapacity. */
function capacityGateAllows(limit: number | null, currentCount: number): boolean {
  return limit == null || currentCount < limit;
}

describe("plan gate matrix smoke test", () => {
  it("covers every documented PlanFeatureKey and PlanCapacityKey (fails if the matrix drifts)", () => {
    assert.deepEqual([...FEATURE_KEYS].sort(), Object.keys(STARTER_FEATURES).sort());
    assert.deepEqual([...CAPACITY_KEYS].sort(), Object.keys(STARTER_CAPACITY).sort());
  });

  it("Starter: every Professional+/Premium+ feature locked, capacity capped", () => {
    const snap = buildOrgBillingSnapshot({ id: "org-starter", plan_tier: "starter" });
    assert.equal(snap.effectiveTier, "starter");
    assertFeatureGates("starter", snap, STARTER_FEATURES);
    assertCapacityGates("starter", snap, STARTER_CAPACITY);
  });

  it("Professional: mid-tier features unlocked, Premium-only features still locked", () => {
    const snap = buildOrgBillingSnapshot({ id: "org-pro", plan_tier: "professional" });
    assert.equal(snap.effectiveTier, "professional");
    assertFeatureGates("professional", snap, PROFESSIONAL_FEATURES);
    assertCapacityGates("professional", snap, PROFESSIONAL_CAPACITY);
  });

  it("Premium: every feature unlocked, unlimited capacity", () => {
    const snap = buildOrgBillingSnapshot({ id: "org-premium", plan_tier: "premium" });
    assert.equal(snap.effectiveTier, "premium");
    assertFeatureGates("premium", snap, PREMIUM_FEATURES);
    assertCapacityGates("premium", snap, UNLIMITED_CAPACITY);
  });

  it("Active trial: gets Professional entitlements while trialing", () => {
    const ends = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
    const snap = buildOrgBillingSnapshot({
      id: "org-trial",
      plan_tier: "trial",
      subscription_status: "trialing",
      trial_ends_at: ends,
    });
    assert.equal(snap.effectiveTier, "professional");
    assert.equal(snap.trialActive, true);
    assertFeatureGates("trial-active", snap, PROFESSIONAL_FEATURES);
    assertCapacityGates("trial-active", snap, PROFESSIONAL_CAPACITY);
  });

  it("Expired trial: falls back to Starter entitlements (no second free trial)", () => {
    const snap = buildOrgBillingSnapshot({
      id: "org-trial-expired",
      plan_tier: "trial",
      subscription_status: "trialing",
      trial_ends_at: "2020-01-01T00:00:00.000Z",
    });
    assert.equal(snap.effectiveTier, "expired_trial");
    assert.equal(snap.trialExpired, true);
    assertFeatureGates("trial-expired", snap, STARTER_FEATURES);
    assertCapacityGates("trial-expired", snap, STARTER_CAPACITY);
  });

  it("Founding / billing-exempt: unlimited on every feature and capacity gate", () => {
    const snap = buildOrgBillingSnapshot({
      id: "org-founding",
      billing_exempt_at: "2026-01-01T00:00:00.000Z",
      plan_tier: "starter",
    });
    assert.equal(snap.effectiveTier, "founding");
    assert.equal(snap.billingExempt, true);
    assert.equal(snap.unlimitedCredits, true);
    assertFeatureGates("founding", snap, PREMIUM_FEATURES);
    assertCapacityGates("founding", snap, UNLIMITED_CAPACITY);
  });
});

describe("capacity gate boundary semantics (the 3 newly-wired capacity gates)", () => {
  it("committeeChairs: blocks at the limit, allows just under it", () => {
    const starterLimit = STARTER_CAPACITY.committeeChairs;
    assert.equal(capacityGateAllows(starterLimit, 1), true);
    assert.equal(capacityGateAllows(starterLimit, 2), false);

    const proLimit = PROFESSIONAL_CAPACITY.committeeChairs;
    assert.equal(capacityGateAllows(proLimit, 7), true);
    assert.equal(capacityGateAllows(proLimit, 8), false);

    assert.equal(capacityGateAllows(UNLIMITED_CAPACITY.committeeChairs, 999), true);
  });

  it("metaPostsPerMonth: blocks at the limit, allows just under it", () => {
    const starterLimit = STARTER_CAPACITY.metaPostsPerMonth;
    assert.equal(capacityGateAllows(starterLimit, 9), true);
    assert.equal(capacityGateAllows(starterLimit, 10), false);

    const proLimit = PROFESSIONAL_CAPACITY.metaPostsPerMonth;
    assert.equal(capacityGateAllows(proLimit, 39), true);
    assert.equal(capacityGateAllows(proLimit, 40), false);

    assert.equal(capacityGateAllows(UNLIMITED_CAPACITY.metaPostsPerMonth, 999), true);
  });

  it("socialAccounts: first connect allowed, second connect blocked on Starter/Professional", () => {
    const starterLimit = STARTER_CAPACITY.socialAccounts;
    assert.equal(capacityGateAllows(starterLimit, 0), true);
    assert.equal(capacityGateAllows(starterLimit, 1), false);

    const proLimit = PROFESSIONAL_CAPACITY.socialAccounts;
    assert.equal(capacityGateAllows(proLimit, 0), true);
    assert.equal(capacityGateAllows(proLimit, 1), false);

    assert.equal(capacityGateAllows(UNLIMITED_CAPACITY.socialAccounts, 999), true);
  });
});
