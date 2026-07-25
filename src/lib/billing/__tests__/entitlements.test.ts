import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { entitlementsForEffectiveTier } from "../entitlements.ts";
import {
  buildOrgBillingSnapshot,
  creditTierFromSnapshot,
} from "../org-billing-pure.ts";

describe("plan entitlements", () => {
  it("locks Premium-only features off for Starter and Professional", () => {
    assert.equal(entitlementsForEffectiveTier("starter").features.ask_ralli, false);
    assert.equal(entitlementsForEffectiveTier("starter").features.inbox_ai, false);
    assert.equal(entitlementsForEffectiveTier("professional").features.ask_ralli, true);
    assert.equal(entitlementsForEffectiveTier("professional").features.inbox_ai, false);
    assert.equal(entitlementsForEffectiveTier("premium").features.inbox_ai, true);
    assert.equal(entitlementsForEffectiveTier("trial").features.ask_ralli, true);
  });

  it("caps Starter events and seats", () => {
    assert.equal(
      entitlementsForEffectiveTier("starter").capacity.eventsPerSchoolYear,
      15,
    );
    assert.equal(entitlementsForEffectiveTier("starter").capacity.teamMembers, 5);
    assert.equal(
      entitlementsForEffectiveTier("premium").capacity.teamMembers,
      null,
    );
  });
});

describe("org billing snapshot", () => {
  it("treats billing_exempt as founding unlimited", () => {
    const snap = buildOrgBillingSnapshot({
      id: "org-1",
      billing_exempt_at: "2026-01-01T00:00:00.000Z",
      plan_tier: "professional",
    });
    assert.equal(snap.effectiveTier, "founding");
    assert.equal(snap.unlimitedCredits, true);
    assert.equal(creditTierFromSnapshot(snap), "founding");
  });

  it("marks active trial and maps credits to trial tier", () => {
    const ends = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
    const snap = buildOrgBillingSnapshot({
      id: "org-1",
      plan_tier: "trial",
      subscription_status: "trialing",
      trial_ends_at: ends,
    });
    assert.equal(snap.trialActive, true);
    assert.equal(snap.entitlements.features.ask_ralli, true);
    assert.equal(creditTierFromSnapshot(snap), "trial");
  });

  it("expired trial falls back to starter entitlements and credits", () => {
    const snap = buildOrgBillingSnapshot({
      id: "org-1",
      plan_tier: "trial",
      subscription_status: "trialing",
      trial_ends_at: "2020-01-01T00:00:00.000Z",
    });
    assert.equal(snap.trialExpired, true);
    assert.equal(snap.effectiveTier, "expired_trial");
    assert.equal(snap.entitlements.features.ask_ralli, false);
    assert.equal(creditTierFromSnapshot(snap), "starter");
  });
});
