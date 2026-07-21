import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  shouldRouteToOpsAsk,
  shouldRouteToOrgBriefing,
} from "../ask-routing.ts";
import {
  isHowToNavigationQuestion,
  shouldPreferProductHelpFaq,
} from "../ops-intent.ts";
import {
  isOrgBriefingIntent,
  shouldPreferOrgBriefing,
} from "../org-intent.ts";
import { matchProductHelpTopic } from "../product-help-knowledge.ts";

describe("org briefing intent detection", () => {
  it("detects Phase 2 org / role briefing questions", () => {
    const orgQuestions = [
      "What needs my approval?",
      "Which events need attention?",
      "What's behind schedule?",
      "Give me today's summary",
      "What's today's summary?",
      "What happened this week?",
      "Which committees need help?",
      "Give me a board briefing",
      "What's on my plate?",
      "What should I focus on today?",
      "What's the busiest week?",
    ];

    for (const question of orgQuestions) {
      assert.equal(isOrgBriefingIntent(question), true, question);
      assert.equal(shouldPreferOrgBriefing(question), true, question);
      assert.equal(shouldPreferProductHelpFaq(question), false, question);
    }
  });

  it("keeps clear how-to on FAQ path", () => {
    assert.equal(isHowToNavigationQuestion("How do I create a campaign?"), true);
    assert.equal(isOrgBriefingIntent("How do I create a campaign?"), false);
    assert.equal(shouldPreferOrgBriefing("How do I create a campaign?"), false);
  });
});

describe("shouldRouteToOrgBriefing", () => {
  const events = [
    {
      id: "evt-1",
      title: "Back to School Fair",
      date: "2026-08-20",
      status: "scheduled",
    },
    {
      id: "evt-2",
      title: "Spring Carnival",
      date: "2026-04-10",
      status: "draft",
    },
  ];

  it("routes org briefings without an event name", () => {
    assert.equal(
      shouldRouteToOrgBriefing("What needs my approval?", events),
      true,
    );
    assert.equal(
      shouldRouteToOrgBriefing("Give me today's summary", events),
      true,
    );
    assert.equal(
      shouldRouteToOrgBriefing("Which events need attention?", events),
      true,
    );
    assert.equal(
      shouldRouteToOpsAsk("What needs my approval?", null, events),
      false,
    );
  });

  it("keeps event-scoped phrasing on Phase 1 ops path", () => {
    const question = "What's behind schedule for Back to School Fair?";
    assert.equal(isOrgBriefingIntent(question), true);
    assert.equal(shouldRouteToOrgBriefing(question, events), false);
    assert.equal(shouldRouteToOpsAsk(question, null, events), true);
  });

  it("does not require pathname for org briefings", () => {
    assert.equal(
      shouldRouteToOrgBriefing(
        "What needs my approval?",
        events,
      ),
      true,
    );
    // Even on an event page, org queue questions stay org-scoped.
    assert.equal(
      shouldRouteToOpsAsk(
        "What needs my approval?",
        "/events/a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        events,
      ),
      false,
    );
  });
});

/** Eval-style fixtures: Phase 2 acceptance questions → org path. */
describe("Phase 2 org routing fixtures", () => {
  const fixtures = [
    "What needs my approval?",
    "Which events need attention?",
    "What's behind schedule?",
    "Give me today's summary",
    "What happened this week?",
  ];

  for (const question of fixtures) {
    it(`maps to org path: ${question}`, () => {
      assert.equal(isOrgBriefingIntent(question), true);
      assert.equal(shouldRouteToOrgBriefing(question), true);
      assert.equal(shouldRouteToOpsAsk(question, null), false);
      assert.equal(shouldPreferProductHelpFaq(question), false);
    });
  }

  it("keeps how-to on FAQ path", () => {
    const question = "Where do I find my approvals?";
    assert.equal(shouldPreferProductHelpFaq(question), true);
    assert.equal(shouldRouteToOrgBriefing(question), false);
    assert.equal(matchProductHelpTopic(question)?.id, "find-approvals");
  });
});
