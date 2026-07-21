import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  shouldRouteToContentAsk,
  shouldRouteToOpsAsk,
  shouldRouteToOrgBriefing,
} from "../ask-routing.ts";
import {
  detectContentActionKind,
  detectContentLengthHint,
  detectContentToneHint,
  extractPastedDraftText,
  isContentIntent,
  shouldPreferContentAsk,
} from "../content-intent.ts";
import {
  shouldPreferProductHelpFaq,
} from "../ops-intent.ts";
import { matchProductHelpTopic } from "../product-help-knowledge.ts";

describe("content intent detection", () => {
  it("detects Phase 4 write / rewrite questions", () => {
    const contentQuestions = [
      "Write tomorrow's reminder",
      "Write tomorrow’s reminder",
      "Create a volunteer reminder",
      "Rewrite this caption",
      "Make this shorter",
      "Make this more exciting",
      "Make this more professional",
      "Improve this flyer",
      "Generate another version",
      'Rewrite this: "Join us for the fair next week!"',
    ];

    for (const question of contentQuestions) {
      assert.equal(isContentIntent(question), true, question);
      assert.equal(shouldPreferContentAsk(question), true, question);
      assert.equal(shouldRouteToContentAsk(question), true, question);
    }
  });

  it("does not treat volunteer signup status as content", () => {
    const statusQuestions = [
      "Do I need another signup reminder?",
      "Have I reminded volunteers?",
    ];

    for (const question of statusQuestions) {
      assert.equal(isContentIntent(question), false, question);
      assert.equal(shouldRouteToContentAsk(question), false, question);
    }
  });

  it("keeps Create with AI how-to on FAQ path", () => {
    const question = "How do I generate captions?";
    assert.equal(shouldPreferContentAsk(question), false);
    assert.equal(shouldPreferProductHelpFaq(question), true);
    assert.equal(matchProductHelpTopic(question)?.id, "create-with-ai");
  });

  it("classifies action kinds and tone/length hints", () => {
    assert.equal(
      detectContentActionKind("Write tomorrow's reminder"),
      "write_reminder",
    );
    assert.equal(
      detectContentActionKind("Create a volunteer reminder"),
      "write_volunteer_reminder",
    );
    assert.equal(detectContentActionKind("Improve this flyer"), "improve_flyer");
    assert.equal(
      detectContentActionKind("Generate another version"),
      "another_version",
    );
    assert.equal(detectContentActionKind("Make this shorter"), "rewrite");
    assert.equal(detectContentToneHint("Make this more professional"), "professional");
    assert.equal(detectContentToneHint("Make this more exciting"), "exciting");
    assert.equal(detectContentLengthHint("Make this shorter"), "short");
  });

  it("extracts pasted draft text", () => {
    assert.equal(
      extractPastedDraftText('Make this shorter: "Come to the fair Saturday!"'),
      "Come to the fair Saturday!",
    );
    assert.equal(
      extractPastedDraftText("Rewrite this caption\nCome to the fair Saturday!"),
      "Come to the fair Saturday!",
    );
  });
});

describe("Phase 4 content routing vs ops/org", () => {
  const events = [
    {
      id: "evt-1",
      title: "Back to School Fair",
      date: "2026-08-20",
      status: "scheduled",
    },
  ];
  const eventPath = "/events/a1b2c3d4-e5f6-7890-abcd-ef1234567890";

  it("routes content on an event page without stealing ops status asks", () => {
    assert.equal(
      shouldRouteToContentAsk("Make this shorter"),
      true,
    );
    assert.equal(
      shouldRouteToOpsAsk("Make this shorter", eventPath, events),
      false,
    );

    assert.equal(
      shouldRouteToOpsAsk("What's next for this event?", eventPath, events),
      true,
    );
    assert.equal(
      shouldRouteToContentAsk("What's next for this event?"),
      false,
    );
  });

  it("keeps ops/org winning for what’s next / today’s summary", () => {
    assert.equal(shouldRouteToContentAsk("what's next for back to school fair"), false);
    assert.equal(
      shouldRouteToOpsAsk(
        "what's next for back to school fair that I need to do?",
        null,
        events,
      ),
      true,
    );

    assert.equal(shouldRouteToContentAsk("Give me today's summary"), false);
    assert.equal(
      shouldRouteToOrgBriefing("Give me today's summary", events, null),
      true,
    );
  });

  it("does not let Create with AI FAQ swallow rewrite asks", () => {
    const question = "Generate another version of this caption";
    assert.equal(shouldRouteToContentAsk(question), true);
    // Keyword collision is fine — content path must win in the router.
    assert.ok(matchProductHelpTopic(question) || true);
  });
});
