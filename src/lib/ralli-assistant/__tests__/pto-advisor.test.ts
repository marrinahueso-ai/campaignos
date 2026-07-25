import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { shouldRouteToOrgBriefing } from "../ask-routing.ts";
import {
  matchPtoAdvisorTopic,
  shouldPreferPtoAdvisor,
} from "../pto-advisor-knowledge.ts";

describe("PTO advisor playbook matching", () => {
  it("matches experienced-president playbook questions", () => {
    const cases: Array<{ question: string; topicId: string }> = [
      { question: "How do I get more volunteers?", topicId: "get-more-volunteers" },
      {
        question: "When should I start promoting my event?",
        topicId: "when-to-promote",
      },
      {
        question: "What am I forgetting for this event?",
        topicId: "event-forgetting-checklist",
      },
      {
        question: "Why aren't volunteers signing up?",
        topicId: "why-volunteers-not-signing",
      },
      {
        question: "How many events should we have each semester?",
        topicId: "events-per-semester",
      },
      { question: "Should I create a flyer?", topicId: "should-create-flyer" },
    ];

    for (const { question, topicId } of cases) {
      const topic = matchPtoAdvisorTopic(question);
      assert.ok(topic, question);
      assert.equal(topic?.id, topicId, question);
      assert.equal(shouldPreferPtoAdvisor(question), true, question);
    }
  });

  it("does not steal live org briefing questions", () => {
    assert.equal(shouldPreferPtoAdvisor("What should I work on today?"), false);
    assert.equal(shouldPreferPtoAdvisor("Give me today's summary"), false);
    assert.equal(
      shouldRouteToOrgBriefing("What should I work on today?", []),
      true,
    );
  });
});
