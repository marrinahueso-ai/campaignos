import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  shouldRouteToOpsAsk,
  shouldRouteToOrgBriefing,
} from "../ask-routing.ts";
import { shouldPreferProductHelpFaq } from "../ops-intent.ts";
import { matchProductHelpTopic } from "../product-help-knowledge.ts";
import {
  isVolunteersIntent,
  shouldPreferVolunteersOps,
} from "../volunteers-intent.ts";

describe("volunteers intent detection", () => {
  it("detects Phase 3 volunteer questions", () => {
    const questions = [
      "Do I need more volunteers?",
      "Which shifts still need help?",
      "Which volunteers haven't responded?",
      "Do I need another signup reminder?",
      "Have all committee chairs assigned volunteers?",
      "Which committee is behind?",
    ];

    for (const question of questions) {
      assert.equal(isVolunteersIntent(question), true, question);
      assert.equal(shouldPreferVolunteersOps(question), true, question);
    }
  });

  it("keeps where-to-find volunteers on FAQ path", () => {
    const question = "Where do I find volunteers?";
    assert.equal(shouldPreferVolunteersOps(question), false);
    assert.equal(shouldPreferProductHelpFaq(question), true);
    assert.equal(matchProductHelpTopic(question)?.id, "find-volunteers");
  });
});

describe("Phase 3 volunteers routing", () => {
  const events = [
    {
      id: "evt-1",
      title: "Back to School Fair",
      date: "2026-08-20",
      status: "scheduled",
    },
  ];

  it("routes org-level volunteer questions to org briefing", () => {
    const question = "Do I need more volunteers?";
    assert.equal(shouldRouteToOrgBriefing(question, events, null), true);
    assert.equal(shouldRouteToOpsAsk(question, null, events), false);
  });

  it("routes event-scoped volunteer questions to ops", () => {
    const question = "Do I need more volunteers for Back to School Fair?";
    assert.equal(shouldRouteToOrgBriefing(question, events, null), false);
    assert.equal(shouldRouteToOpsAsk(question, null, events), true);
  });

  it("routes volunteer questions on an event page to ops", () => {
    const question = "Which shifts still need help?";
    assert.equal(
      shouldRouteToOrgBriefing(
        question,
        events,
        "/events/a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      ),
      false,
    );
    assert.equal(
      shouldRouteToOpsAsk(
        question,
        "/events/a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        events,
      ),
      true,
    );
  });
});
