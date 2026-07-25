import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ARTWORK_CREDIT_WEIGHT,
  DEFAULT_PAID_PLAN_TIER,
  PLAN_MONTHLY_CREDITS,
  AI_RESERVE_SKUS,
  TEXT_AI_CREDIT_WEIGHT,
  creditCostForAction,
  monthlyAllowanceForTier,
  periodYmUtc,
} from "../credit-constants.ts";
import {
  canAffordAiCredits,
  isAiCreditsExhausted,
  splitBurnAcrossBuckets,
} from "../credits-pure.ts";
import {
  resetLabelForPeriodYm,
  toAiCreditsWidgetData,
} from "../ai-credits-widget-data.ts";

describe("ai credit constants", () => {
  it("locks plan monthly allowances", () => {
    assert.equal(PLAN_MONTHLY_CREDITS.starter, 400);
    assert.equal(PLAN_MONTHLY_CREDITS.professional, 1200);
    assert.equal(PLAN_MONTHLY_CREDITS.premium, 2500);
    assert.equal(PLAN_MONTHLY_CREDITS.trial, 600);
    assert.equal(DEFAULT_PAID_PLAN_TIER, "professional");
    assert.equal(monthlyAllowanceForTier("founding"), null);
  });

  it("weights artwork heavier than text", () => {
    assert.equal(ARTWORK_CREDIT_WEIGHT, 8);
    assert.equal(TEXT_AI_CREDIT_WEIGHT, 1);
    assert.equal(creditCostForAction("generate_artwork", true), 8);
    assert.equal(creditCostForAction("orchestrate_artwork", true), 8);
    assert.equal(creditCostForAction("ask_ralli", true), 1);
    assert.equal(creditCostForAction("meta_social_caption", true), 1);
    assert.equal(creditCostForAction("inbox_ai", true), 1);
  });

  it("failed calls cost zero", () => {
    assert.equal(creditCostForAction("generate_artwork", false), 0);
    assert.equal(creditCostForAction("ask_ralli", false), 0);
  });

  it("formats UTC period_ym", () => {
    assert.equal(periodYmUtc(new Date("2026-07-24T12:00:00.000Z")), "2026-07");
    assert.equal(periodYmUtc(new Date("2026-01-01T00:00:00.000Z")), "2026-01");
  });

  it("defines safe-at-full-burn Reserve SKUs", () => {
    assert.equal(AI_RESERVE_SKUS.reserve.credits, 18_000);
    assert.equal(AI_RESERVE_SKUS.reserve_star.credits, 40_000);
    assert.equal(AI_RESERVE_SKUS.reserve_max.credits, 85_000);
  });
});

describe("ai credits widget data", () => {
  it("formats reset label for next UTC month", () => {
    assert.equal(resetLabelForPeriodYm("2026-07"), "Resets Aug 1");
    assert.equal(resetLabelForPeriodYm("2026-12"), "Resets Jan 1");
  });

  it("maps snapshot fields for the client widget", () => {
    const data = toAiCreditsWidgetData({
      unlimited: false,
      used: 100,
      allowance: 1200,
      reserveBalance: 500,
      softWarn: false,
      periodYm: "2026-07",
    });
    assert.equal(data.resetLabel, "Resets Aug 1");
    assert.equal(data.reserveBalance, 500);
    assert.equal(data.exhausted, false);
  });

  it("marks widget exhausted when period and reserve are zero", () => {
    const data = toAiCreditsWidgetData({
      unlimited: false,
      used: 1200,
      allowance: 1200,
      reserveBalance: 0,
      softWarn: true,
      periodYm: "2026-07",
    });
    assert.equal(data.exhausted, true);
    assert.equal(data.softWarn, false);
  });
});

describe("Phase 6 hard-block helpers", () => {
  it("treats zero period+reserve as exhausted", () => {
    assert.equal(
      isAiCreditsExhausted({
        unlimited: false,
        periodRemaining: 0,
        reserveBalance: 0,
      }),
      true,
    );
    assert.equal(
      isAiCreditsExhausted({
        unlimited: true,
        periodRemaining: 0,
        reserveBalance: 0,
      }),
      false,
    );
  });

  it("blocks when remaining is below action cost", () => {
    assert.equal(
      canAffordAiCredits({
        unlimited: false,
        periodRemaining: 3,
        reserveBalance: 0,
        cost: 8,
      }),
      false,
    );
    assert.equal(
      canAffordAiCredits({
        unlimited: false,
        periodRemaining: 3,
        reserveBalance: 5,
        cost: 8,
      }),
      true,
    );
    assert.equal(
      canAffordAiCredits({
        unlimited: true,
        periodRemaining: 0,
        reserveBalance: 0,
        cost: 8,
      }),
      true,
    );
  });
});

describe("splitBurnAcrossBuckets", () => {
  it("burns period allowance before reserve", () => {
    const split = splitBurnAcrossBuckets({
      allowance: 100,
      used: 90,
      reserveBalance: 50,
      cost: 20,
    });
    assert.equal(split.periodBurn, 10);
    assert.equal(split.reserveBurn, 10);
    assert.equal(split.usedAfter, 100);
    assert.equal(split.reserveAfter, 40);
  });

  it("uses only period when enough remains", () => {
    const split = splitBurnAcrossBuckets({
      allowance: 1200,
      used: 0,
      reserveBalance: 18_000,
      cost: 8,
    });
    assert.equal(split.periodBurn, 8);
    assert.equal(split.reserveBurn, 0);
    assert.equal(split.usedAfter, 8);
    assert.equal(split.reserveAfter, 18_000);
  });

  it("partially burns when both buckets insufficient", () => {
    const split = splitBurnAcrossBuckets({
      allowance: 10,
      used: 8,
      reserveBalance: 3,
      cost: 10,
    });
    assert.equal(split.periodBurn, 2);
    assert.equal(split.reserveBurn, 3);
    assert.equal(split.usedAfter, 10);
    assert.equal(split.reserveAfter, 0);
  });

  it("does not touch reserve when cost is zero", () => {
    const split = splitBurnAcrossBuckets({
      allowance: 100,
      used: 0,
      reserveBalance: 50,
      cost: 0,
    });
    assert.equal(split.periodBurn, 0);
    assert.equal(split.reserveBurn, 0);
    assert.equal(split.usedAfter, 0);
    assert.equal(split.reserveAfter, 50);
  });
});
