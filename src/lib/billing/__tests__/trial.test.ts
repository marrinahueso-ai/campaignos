import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildOrgBillingSnapshot,
  creditTierFromSnapshot,
} from "../org-billing-pure.ts";
import {
  shouldAttachStripeTrial,
  stripeTrialPeriodDays,
  trialEndIsoFromStripeUnix,
} from "../trial.ts";

describe("stripe trial helpers", () => {
  it("attaches trial for new app-trial orgs", () => {
    const ends = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString();
    const snap = buildOrgBillingSnapshot({
      id: "org-1",
      plan_tier: "trial",
      subscription_status: "none",
      trial_ends_at: ends,
    });
    assert.equal(shouldAttachStripeTrial(snap), true);
    assert.ok(stripeTrialPeriodDays(snap) <= 14);
    assert.ok(stripeTrialPeriodDays(snap) >= 1);
  });

  it("skips trial when app trial already expired", () => {
    const snap = buildOrgBillingSnapshot({
      id: "org-1",
      plan_tier: "trial",
      subscription_status: "none",
      trial_ends_at: "2020-01-01T00:00:00.000Z",
    });
    assert.equal(snap.trialExpired, true);
    assert.equal(shouldAttachStripeTrial(snap), false);
  });

  it("skips trial when a Stripe subscription already exists", () => {
    const snap = buildOrgBillingSnapshot({
      id: "org-1",
      plan_tier: "professional",
      subscription_status: "canceled",
      stripe_subscription_id: "sub_123",
    });
    assert.equal(shouldAttachStripeTrial(snap), false);
  });

  it("maps Stripe trial_end unix to ISO", () => {
    assert.equal(
      trialEndIsoFromStripeUnix(1_700_000_000),
      new Date(1_700_000_000 * 1000).toISOString(),
    );
    assert.equal(trialEndIsoFromStripeUnix(null), null);
  });
});

describe("stripe trialing snapshot", () => {
  it("keeps selected plan features and trial credit tier while Stripe trialing", () => {
    const ends = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
    const snap = buildOrgBillingSnapshot({
      id: "org-1",
      plan_tier: "premium",
      subscription_status: "trialing",
      trial_ends_at: ends,
      stripe_subscription_id: "sub_abc",
    });
    assert.equal(snap.trialActive, true);
    assert.equal(snap.effectiveTier, "premium");
    assert.equal(snap.entitlements.features.inbox_ai, true);
    assert.equal(creditTierFromSnapshot(snap), "trial");
  });
});
