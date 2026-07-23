import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  AI_PRICING_VERSION,
  estimateAiUsageCostUsd,
  estimateApiUsageCostUsd,
  estimateImageCostUsd,
  estimateTokenCostUsd,
  resolveImageModelPricing,
  resolveTokenModelPricing,
  roundCostUsd,
} from "../ai-pricing.ts";
import {
  featureFromAiActionType,
  truncateUsageErrorMessage,
} from "../usage-log-shared.ts";

describe("ai-pricing", () => {
  it("exports a pricing version stamp", () => {
    assert.equal(typeof AI_PRICING_VERSION, "string");
    assert.match(AI_PRICING_VERSION, /^\d{4}-\d{2}-\d{2}$/);
  });

  it("resolves token pricing by exact and prefix model keys", () => {
    assert.ok(resolveTokenModelPricing("gpt-4o-mini"));
    assert.ok(resolveTokenModelPricing("gpt-4o-mini-2024-07-18"));
    assert.equal(resolveTokenModelPricing("unknown-model-xyz"), null);
  });

  it("estimates token cost from input/output rates", () => {
    const cost = estimateTokenCostUsd({
      model: "gpt-4o-mini",
      promptTokens: 1_000_000,
      completionTokens: 1_000_000,
    });
    assert.equal(cost, 0.15 + 0.6);
  });

  it("returns null token cost when tokens are missing/zero", () => {
    assert.equal(
      estimateTokenCostUsd({
        model: "gpt-4o-mini",
        promptTokens: null,
        completionTokens: null,
      }),
      null,
    );
  });

  it("estimates image cost for gpt-image and dall-e families", () => {
    assert.ok(resolveImageModelPricing("gpt-image-1"));
    assert.equal(
      estimateImageCostUsd({ model: "gpt-image-1", imageUnits: 2 }),
      0.08,
    );
    assert.equal(
      estimateImageCostUsd({ model: "dall-e-3", imageUnits: 1 }),
      0.04,
    );
  });

  it("combines token + image costs and honors overrides", () => {
    const combined = estimateAiUsageCostUsd({
      model: "gpt-4o-mini",
      promptTokens: 1_000_000,
      completionTokens: 0,
      imageUnits: null,
    });
    assert.equal(combined, 0.15);

    assert.equal(
      estimateAiUsageCostUsd({
        model: "gpt-4o-mini",
        estimatedCostUsd: 1.25,
      }),
      1.25,
    );
  });

  it("estimates Resend unit cost and leaves Meta unset", () => {
    assert.equal(
      estimateApiUsageCostUsd({ provider: "resend", units: 3 }),
      0.003,
    );
    assert.equal(estimateApiUsageCostUsd({ provider: "meta" }), null);
  });

  it("rounds costs to micros", () => {
    assert.equal(roundCostUsd(0.123456789), 0.123457);
    assert.equal(roundCostUsd(null), null);
  });
});

describe("usage-log-shared", () => {
  it("maps action types to Owner feature keys", () => {
    assert.equal(featureFromAiActionType("ask_ralli"), "ask_ralli");
    assert.equal(
      featureFromAiActionType("draft_communication"),
      "create_with_ai_draft",
    );
    assert.equal(featureFromAiActionType("generate_artwork"), "artwork");
  });

  it("truncates long error messages", () => {
    const long = "x".repeat(600);
    const truncated = truncateUsageErrorMessage(long);
    assert.ok(truncated);
    assert.ok(truncated.length <= 500);
    assert.ok(truncated.endsWith("…"));
  });
});
