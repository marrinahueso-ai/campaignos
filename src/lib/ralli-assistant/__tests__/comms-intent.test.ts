import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  shouldRouteToOpsAsk,
  shouldRouteToOrgBriefing,
} from "../ask-routing.ts";
import {
  isCommsIntent,
  shouldPreferCommsOps,
} from "../comms-intent.ts";
import { shouldPreferProductHelpFaq } from "../ops-intent.ts";
import { matchProductHelpTopic } from "../product-help-knowledge.ts";

describe("comms intent detection", () => {
  it("detects Phase 3 communications questions", () => {
    const questions = [
      "Have I emailed families yet?",
      "Did I post on Facebook?",
      "What social posts are missing?",
      "Which milestone should I publish today?",
      "What communication is due next?",
      "What should I send tomorrow?",
      "Have I reminded volunteers?",
      "Which emails are still drafts?",
      "Which flyers haven't been created?",
    ];

    for (const question of questions) {
      assert.equal(isCommsIntent(question), true, question);
      assert.equal(shouldPreferCommsOps(question), true, question);
    }
  });

  it("keeps Communications Hub how-to on FAQ path", () => {
    const question = "Where is the Communications Hub?";
    assert.equal(shouldPreferCommsOps(question), false);
    assert.equal(shouldPreferProductHelpFaq(question), true);
    assert.equal(matchProductHelpTopic(question)?.id, "communications-hub");
  });
});

describe("Phase 3 communications routing", () => {
  const events = [
    {
      id: "evt-1",
      title: "Back to School Fair",
      date: "2026-08-20",
      status: "scheduled",
    },
  ];

  it("routes org-level comms questions to org briefing", () => {
    const question = "What social posts are missing?";
    assert.equal(shouldRouteToOrgBriefing(question, events, null), true);
    assert.equal(shouldRouteToOpsAsk(question, null, events), false);
  });

  it("routes named-event comms questions to ops", () => {
    const question = "Have I emailed families yet for Back to School Fair?";
    assert.equal(shouldRouteToOrgBriefing(question, events, null), false);
    assert.equal(shouldRouteToOpsAsk(question, null, events), true);
  });
});
