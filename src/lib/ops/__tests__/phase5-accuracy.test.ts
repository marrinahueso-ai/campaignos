import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  AI_APIS_AGGREGATE_ROW_CAP,
  AI_APIS_CSV_EXPORT_CAP,
  AI_APIS_RECONCILE_COST_TOLERANCE_PCT,
  AI_APIS_RECONCILE_TOKEN_TOLERANCE_PCT,
  AI_APIS_TABLE_PAGE_SIZE,
} from "../ai-apis-constants.ts";
import {
  evaluateOpenAiReconcile,
  formatAiUsageDayRollup,
  rollupAiUsageDay,
  utcDayBounds,
  withinTolerancePct,
} from "../ai-usage-reconcile.ts";
import {
  featureFromAiActionType,
  scrubApiUsageMetadata,
  truncateUsageErrorMessage,
} from "../usage-log-shared.ts";

describe("phase5 accuracy lock", () => {
  it("keeps aggregate and page sizes bounded (F4)", () => {
    assert.ok(AI_APIS_AGGREGATE_ROW_CAP <= 10_000);
    assert.ok(AI_APIS_CSV_EXPORT_CAP <= AI_APIS_AGGREGATE_ROW_CAP);
    assert.equal(AI_APIS_TABLE_PAGE_SIZE, 25);
  });

  it("scrubs secret-ish metadata keys (F5)", () => {
    const scrubbed = scrubApiUsageMetadata({
      path: "/me",
      access_token: "secret-token",
      pageAccessToken: "also-secret",
      api_key: "sk-test",
      authorization: "Bearer x",
      password: "nope",
      ok: true,
      long: "x".repeat(250),
    });
    assert.deepEqual(Object.keys(scrubbed).sort(), ["long", "ok", "path"]);
    assert.equal(scrubbed.ok, true);
    assert.equal(scrubbed.path, "/me");
    assert.equal((scrubbed.long as string).length, 200);
  });

  it("truncates error messages and never stores prompt bodies in shared helpers (F5)", () => {
    assert.equal(truncateUsageErrorMessage("short"), "short");
    assert.ok((truncateUsageErrorMessage("e".repeat(600)) ?? "").length <= 500);
    // Schema privacy: feature mapping exists; no prompt/completion body helpers.
    assert.equal(featureFromAiActionType("ask_ralli"), "ask_ralli");
    assert.equal(
      featureFromAiActionType("draft_communication"),
      "create_with_ai_draft",
    );
  });

  it("rolls up a UTC day for OpenAI reconcile (F3)", () => {
    const bounds = utcDayBounds("2026-07-23");
    assert.equal(bounds.fromIso, "2026-07-23T00:00:00.000Z");
    assert.equal(bounds.toIso, "2026-07-23T23:59:59.999Z");

    const rollup = rollupAiUsageDay("2026-07-23", [
      {
        model: "gpt-4o-mini",
        feature: "ask_ralli",
        success: true,
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150,
        estimatedCostUsd: 0.001,
      },
      {
        model: "gpt-4o-mini",
        feature: "create_with_ai_draft",
        success: false,
        promptTokens: 200,
        completionTokens: 0,
        totalTokens: 200,
        estimatedCostUsd: 0.002,
      },
    ]);

    assert.equal(rollup.requests, 2);
    assert.equal(rollup.successes, 1);
    assert.equal(rollup.failures, 1);
    assert.equal(rollup.totalTokens, 350);
    assert.equal(rollup.estimatedCostUsd, 0.003);
    assert.equal(rollup.byModel[0]?.model, "gpt-4o-mini");
    assert.equal(rollup.byFeature.length, 2);
    assert.match(formatAiUsageDayRollup(rollup), /UTC day 2026-07-23/);
  });

  it("evaluates OpenAI reconcile tolerances (F3)", () => {
    assert.equal(withinTolerancePct(100, 100, 15), true);
    assert.equal(withinTolerancePct(110, 100, 15), true);
    assert.equal(withinTolerancePct(120, 100, 15), false);

    const ok = evaluateOpenAiReconcile({
      appTokens: 1000,
      openAiTokens: 1050,
      appCostUsd: 1.0,
      openAiCostUsd: 1.1,
    });
    assert.equal(ok.tokensOk, true);
    assert.equal(ok.costOk, true);
    // Keep helper defaults aligned with ai-apis-constants.
    assert.equal(ok.tokenTolerancePct, AI_APIS_RECONCILE_TOKEN_TOLERANCE_PCT);
    assert.equal(ok.costTolerancePct, AI_APIS_RECONCILE_COST_TOLERANCE_PCT);
    assert.equal(AI_APIS_RECONCILE_TOKEN_TOLERANCE_PCT, 15);
    assert.equal(AI_APIS_RECONCILE_COST_TOLERANCE_PCT, 25);
  });
});
