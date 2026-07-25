import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  BILLING_CANCELED_PATH,
  isCanceledSubscriptionLockout,
  isSnapshotCanceledLockout,
} from "../subscription-lockout.ts";

/**
 * Proves the "actually canceled" signal distinguishes every org shape that
 * must NOT be locked out from the one shape that must be:
 *  - never subscribed (fresh trial, expired-trial Starter fallback)
 *  - founding / billing-exempt
 *  - actually canceled (had a real Stripe subscription, Stripe canceled it)
 */
describe("isCanceledSubscriptionLockout (raw org row — Edge middleware shape)", () => {
  it("never-subscribed trial org (subscription_status defaults to 'none') is not locked out", () => {
    assert.equal(
      isCanceledSubscriptionLockout({
        billing_exempt_at: null,
        subscription_status: "none",
      }),
      false,
    );
  });

  it("active app trial (plan_tier=trial, subscription_status=trialing) is not locked out", () => {
    assert.equal(
      isCanceledSubscriptionLockout({
        billing_exempt_at: null,
        subscription_status: "trialing",
      }),
      false,
    );
  });

  it("expired-trial Starter fallback (never subscribed, still subscription_status=none) is not locked out", () => {
    assert.equal(
      isCanceledSubscriptionLockout({
        billing_exempt_at: null,
        subscription_status: "none",
      }),
      false,
    );
  });

  it("active paid subscription is not locked out", () => {
    assert.equal(
      isCanceledSubscriptionLockout({
        billing_exempt_at: null,
        subscription_status: "active",
      }),
      false,
    );
  });

  it("past_due paid subscription is not locked out (soft state, not this gate)", () => {
    assert.equal(
      isCanceledSubscriptionLockout({
        billing_exempt_at: null,
        subscription_status: "past_due",
      }),
      false,
    );
  });

  it("founding / billing-exempt org is never locked out, even with a stale canceled status", () => {
    assert.equal(
      isCanceledSubscriptionLockout({
        billing_exempt_at: "2026-01-01T00:00:00.000Z",
        subscription_status: "canceled",
      }),
      false,
    );
  });

  it("a real subscription that Stripe then canceled IS locked out", () => {
    assert.equal(
      isCanceledSubscriptionLockout({
        billing_exempt_at: null,
        subscription_status: "canceled",
      }),
      true,
    );
  });

  it("missing/undefined subscription_status is treated as not-canceled (fail open)", () => {
    assert.equal(
      isCanceledSubscriptionLockout({
        billing_exempt_at: null,
        subscription_status: undefined,
      }),
      false,
    );
    assert.equal(isCanceledSubscriptionLockout({}), false);
  });
});

describe("isSnapshotCanceledLockout (OrgBillingSnapshot shape — server actions/pages)", () => {
  it("mirrors the raw-row rule for the four key org shapes", () => {
    assert.equal(
      isSnapshotCanceledLockout({
        billingExempt: false,
        subscriptionStatus: "none",
      }),
      false,
      "never subscribed",
    );
    assert.equal(
      isSnapshotCanceledLockout({
        billingExempt: false,
        subscriptionStatus: "trialing",
      }),
      false,
      "trial",
    );
    assert.equal(
      isSnapshotCanceledLockout({
        billingExempt: true,
        subscriptionStatus: "canceled",
      }),
      false,
      "founding exempt bypasses even a canceled status",
    );
    assert.equal(
      isSnapshotCanceledLockout({
        billingExempt: false,
        subscriptionStatus: "canceled",
      }),
      true,
      "actually canceled",
    );
  });
});

describe("BILLING_CANCELED_PATH", () => {
  it("is a dedicated, stable route", () => {
    assert.equal(BILLING_CANCELED_PATH, "/billing/canceled");
  });
});
