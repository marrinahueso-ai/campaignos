import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PLAN_MONTHLY_CREDITS } from "../../ai/credit-constants.ts";
import {
  BILLING_TRIAL,
  isPaidPlanId,
  PAID_PLANS,
  PRE_STRIPE_DEFAULT_PLAN_ID,
  planById,
} from "../plan-catalog.ts";

describe("plan catalog", () => {
  it("locks Starter / Professional / Premium prices and credits", () => {
    assert.equal(planById("starter").priceUsd, 49);
    assert.equal(planById("professional").priceUsd, 79);
    assert.equal(planById("premium").priceUsd, 129);
    assert.equal(planById("starter").monthlyCredits, PLAN_MONTHLY_CREDITS.starter);
    assert.equal(
      planById("professional").monthlyCredits,
      PLAN_MONTHLY_CREDITS.professional,
    );
    assert.equal(planById("premium").monthlyCredits, PLAN_MONTHLY_CREDITS.premium);
  });

  it("highlights Premium as the recommended destination", () => {
    assert.equal(PAID_PLANS.filter((p) => p.highlighted).length, 1);
    assert.equal(planById("premium").highlighted, true);
    assert.ok(planById("premium").badge);
  });

  it("defaults pre-Stripe metering to Professional", () => {
    assert.equal(PRE_STRIPE_DEFAULT_PLAN_ID, "professional");
  });

  it("documents 14-day trial with 600 credits", () => {
    assert.equal(BILLING_TRIAL.days, 14);
    assert.equal(BILLING_TRIAL.credits, 600);
  });

  it("narrows signup plan query ids", () => {
    assert.equal(isPaidPlanId("starter"), true);
    assert.equal(isPaidPlanId("premium"), true);
    assert.equal(isPaidPlanId("founding"), false);
    assert.equal(isPaidPlanId("nope"), false);
  });
});
