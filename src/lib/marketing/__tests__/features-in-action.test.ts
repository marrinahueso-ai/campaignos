import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  FEATURES_IN_ACTION_STORIES,
  PUBLIC_FEATURES_IN_ACTION_STORIES,
} from "../features-in-action.ts";

describe("features-in-action public stories", () => {
  it("keeps Communications Hub and Ask Ralli off public Features until product videos exist", () => {
    const publicIds = PUBLIC_FEATURES_IN_ACTION_STORIES.map((story) => story.id);
    assert.deepEqual(publicIds, [
      "create-with-ai",
      "plan-your-year",
      "approvals",
      "volunteer-intelligence",
    ]);
    assert.ok(
      PUBLIC_FEATURES_IN_ACTION_STORIES.every((story) => story.productDemoId),
    );

    const registryIds = FEATURES_IN_ACTION_STORIES.map((story) => story.id);
    assert.ok(registryIds.includes("communications-hub"));
    assert.ok(registryIds.includes("ask-ralli"));
  });

  it("does not link Communications Hub or Ask Ralli from Resources topics", () => {
    const resources = readFileSync(
      new URL(
        "../../../components/marketing-wow/MarketingWowResourcesPage.tsx",
        import.meta.url,
      ),
      "utf8",
    );
    assert.doesNotMatch(resources, /id: "communications-hub"/);
    assert.doesNotMatch(resources, /id: "ask-ralli"/);
    assert.doesNotMatch(resources, /#communications-hub/);
    assert.doesNotMatch(resources, /#ask-ralli/);
  });
});
