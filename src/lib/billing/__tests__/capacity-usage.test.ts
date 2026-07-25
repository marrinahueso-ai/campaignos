import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { PlanCapacityKey } from "../entitlements.ts";
import { buildOrgBillingSnapshot } from "../org-billing-pure.ts";
import { CAPACITY_DISPLAY_ORDER, pairCapacityUsage } from "../capacity-usage-pure.ts";

/**
 * capacity-usage.ts itself is server-only (imports next/headers via
 * @/lib/supabase/server) and can't be imported directly in this test
 * runner — same constraint as gates.ts in gates-plan-matrix.test.ts.
 * pairCapacityUsage (capacity-usage-pure.ts) is the exact pairing logic
 * getOrgCapacityUsage delegates to after running its 5 DB counters.
 */

const ZERO_COUNTS: Record<PlanCapacityKey, number> = {
  eventsPerSchoolYear: 0,
  teamMembers: 0,
  committeeChairs: 0,
  metaPostsPerMonth: 0,
  socialAccounts: 0,
};

describe("pairCapacityUsage", () => {
  it("covers every PlanCapacityKey in the documented display order", () => {
    const snap = buildOrgBillingSnapshot({ id: "org-starter", plan_tier: "starter" });
    const entries = pairCapacityUsage(snap, ZERO_COUNTS);
    assert.deepEqual(
      entries.map((e) => e.key),
      CAPACITY_DISPLAY_ORDER,
    );
    assert.deepEqual(
      [...entries.map((e) => e.key)].sort(),
      (Object.keys(ZERO_COUNTS) as PlanCapacityKey[]).sort(),
    );
  });

  it("Starter (capped plan): pairs used counts with numeric plan limits", () => {
    const snap = buildOrgBillingSnapshot({ id: "org-starter", plan_tier: "starter" });
    const counts: Record<PlanCapacityKey, number> = {
      eventsPerSchoolYear: 3,
      teamMembers: 4,
      committeeChairs: 1,
      metaPostsPerMonth: 2,
      socialAccounts: 1,
    };
    const entries = pairCapacityUsage(snap, counts);

    const byKey = new Map(entries.map((e) => [e.key, e]));
    assert.deepEqual(byKey.get("teamMembers"), {
      key: "teamMembers",
      label: "Team Members",
      used: 4,
      limit: 5,
    });
    assert.deepEqual(byKey.get("committeeChairs"), {
      key: "committeeChairs",
      label: "Committee Chairs",
      used: 1,
      limit: 2,
    });
    assert.deepEqual(byKey.get("eventsPerSchoolYear"), {
      key: "eventsPerSchoolYear",
      label: "Events / School Year",
      used: 3,
      limit: 15,
    });
    assert.deepEqual(byKey.get("metaPostsPerMonth"), {
      key: "metaPostsPerMonth",
      label: "Meta Posts / Month",
      used: 2,
      limit: 10,
    });
    assert.deepEqual(byKey.get("socialAccounts"), {
      key: "socialAccounts",
      label: "Social Accounts",
      used: 1,
      limit: 1,
    });
  });

  it("Premium / unlimited plan: every limit is null regardless of used count", () => {
    const snap = buildOrgBillingSnapshot({ id: "org-premium", plan_tier: "premium" });
    const counts: Record<PlanCapacityKey, number> = {
      eventsPerSchoolYear: 500,
      teamMembers: 200,
      committeeChairs: 40,
      metaPostsPerMonth: 999,
      socialAccounts: 12,
    };
    const entries = pairCapacityUsage(snap, counts);

    for (const entry of entries) {
      assert.equal(entry.limit, null, `${entry.key} should be unlimited on Premium`);
      assert.equal(entry.used, counts[entry.key]);
    }
  });

  it("Founding / billing-exempt org: unlimited on every capacity key too", () => {
    const snap = buildOrgBillingSnapshot({
      id: "org-founding",
      billing_exempt_at: "2026-01-01T00:00:00.000Z",
      plan_tier: "starter",
    });
    const entries = pairCapacityUsage(snap, {
      ...ZERO_COUNTS,
      teamMembers: 999,
    });
    for (const entry of entries) {
      assert.equal(entry.limit, null);
    }
    assert.equal(entries.find((e) => e.key === "teamMembers")?.used, 999);
  });

  it("used at or over the limit is preserved as-is (UI decides capping/coloring)", () => {
    const snap = buildOrgBillingSnapshot({ id: "org-starter", plan_tier: "starter" });
    const entries = pairCapacityUsage(snap, {
      ...ZERO_COUNTS,
      socialAccounts: 5,
    });
    const socialAccounts = entries.find((e) => e.key === "socialAccounts");
    assert.equal(socialAccounts?.limit, 1);
    assert.equal(socialAccounts?.used, 5);
  });
});
