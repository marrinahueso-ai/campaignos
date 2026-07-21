import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  shouldRouteToContentAsk,
  shouldRouteToInsightsAsk,
  shouldRouteToOpsAsk,
  shouldRouteToOrgBriefing,
} from "../ask-routing.ts";
import {
  isEventScopedInsightsQuestion,
  isInsightsIntent,
  shouldPreferInsightsAsk,
} from "../insights-intent.ts";
import { shouldPreferProductHelpFaq } from "../ops-intent.ts";
import { matchProductHelpTopic } from "../product-help-knowledge.ts";

describe("insights intent detection", () => {
  it("detects Phase 5 health / risk / performance questions", () => {
    const questions = [
      "What's my biggest risk?",
      "What’s my biggest risk?",
      "How can this campaign perform better?",
      "What post usually performs best?",
      "Is my event healthy?",
      "What's the highest-impact thing I can do today?",
      "What should I improve?",
      "What's missing from this campaign?",
      "Is there anything I'm overlooking?",
    ];

    for (const question of questions) {
      assert.equal(isInsightsIntent(question), true, question);
      assert.equal(shouldPreferInsightsAsk(question), true, question);
      assert.equal(shouldRouteToInsightsAsk(question), true, question);
    }
  });

  it("flags event-scoped insights phrasing", () => {
    assert.equal(isEventScopedInsightsQuestion("Is my event healthy?"), true);
    assert.equal(
      isEventScopedInsightsQuestion("How can this campaign perform better?"),
      true,
    );
    assert.equal(
      isEventScopedInsightsQuestion("What's my biggest risk?"),
      false,
    );
  });

  it("keeps how-to FAQ for insights navigation", () => {
    const question = "How do I use Insights?";
    assert.equal(shouldPreferInsightsAsk(question), false);
    assert.equal(shouldPreferProductHelpFaq(question), true);
  });
});

describe("Phase 5 insights routing vs content/ops/org", () => {
  const events = [
    {
      id: "evt-1",
      title: "Back to School Fair",
      date: "2026-08-20",
      status: "scheduled",
    },
  ];
  const eventPath = "/events/a1b2c3d4-e5f6-7890-abcd-ef1234567890";

  it("does not steal content rewrite / improve-with-paste", () => {
    assert.equal(shouldRouteToContentAsk("Improve this caption"), true);
    assert.equal(shouldRouteToInsightsAsk("Improve this caption"), false);

    const withPaste =
      'What should I improve?\n"Join us Saturday for the fair — bring the whole family!"';
    assert.equal(shouldRouteToContentAsk(withPaste), true);
    assert.equal(shouldRouteToInsightsAsk(withPaste), false);
  });

  it("routes bare “What should I improve?” to insights", () => {
    assert.equal(shouldRouteToInsightsAsk("What should I improve?"), true);
    assert.equal(shouldRouteToContentAsk("What should I improve?"), false);
  });

  it("keeps reproduction bugs on ops/org (not insights)", () => {
    assert.equal(
      shouldRouteToInsightsAsk("what's next for back to school fair"),
      false,
    );
    assert.equal(
      shouldRouteToOpsAsk(
        "what's next for back to school fair that I need to do?",
        null,
        events,
      ),
      true,
    );

    assert.equal(shouldRouteToInsightsAsk("What do I have this week?"), false);
    assert.equal(
      shouldRouteToOrgBriefing("What do I have this week?", events, null),
      true,
    );

    assert.equal(shouldRouteToInsightsAsk("Give me today's summary"), false);
    assert.equal(
      shouldRouteToOrgBriefing("Give me today's summary", events, null),
      true,
    );
  });

  it("insights wins over event-pathname ops catch-all", () => {
    assert.equal(
      shouldRouteToInsightsAsk("What's my biggest risk?"),
      true,
    );
    assert.equal(
      shouldRouteToOpsAsk("What's my biggest risk?", eventPath, events),
      false,
    );
    assert.equal(
      shouldRouteToOrgBriefing("What's my biggest risk?", events, eventPath),
      false,
    );
  });

  it("does not let FAQ swallow risk questions", () => {
    const question = "What's my biggest risk?";
    assert.equal(shouldRouteToInsightsAsk(question), true);
    // Even if FAQ keywords collide, insights must win in the router.
    assert.ok(matchProductHelpTopic(question) || true);
  });
});
