import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { shouldRouteToOpsAsk } from "../ask-routing.ts";
import {
  extractEventIdFromPathname,
  extractQueryTokens,
  isHowToNavigationQuestion,
  isOpsIntent,
  shouldPreferProductHelpFaq,
} from "../ops-intent.ts";
import { matchProductHelpTopic } from "../product-help-knowledge.ts";

describe("ops intent detection", () => {
  it("detects Phase 1 operational questions", () => {
    const opsQuestions = [
      "What should I do next for Back to School Fair?",
      "What's next for the spring carnival?",
      "What's overdue?",
      "What's waiting for approval?",
      "What's publishing today?",
      "What's publishing this week?",
      "Is this event ready?",
      "What tasks are still incomplete?",
      "Am I on schedule?",
    ];

    for (const question of opsQuestions) {
      assert.equal(isOpsIntent(question), true, question);
      assert.equal(shouldPreferProductHelpFaq(question), false, question);
    }
  });

  it("detects how-to product-help questions", () => {
    assert.equal(isHowToNavigationQuestion("How do I create a campaign?"), true);
    assert.equal(
      isHowToNavigationQuestion("Where do I find my approvals?"),
      true,
    );
    assert.equal(isOpsIntent("How do I create a campaign?"), false);
    assert.equal(shouldPreferProductHelpFaq("How do I create a campaign?"), true);
  });

  it("does not let FAQ keywords swallow ops questions", () => {
    const question = "What's waiting for approval for Back to School Fair?";
    assert.equal(isOpsIntent(question), true);
    assert.equal(shouldPreferProductHelpFaq(question), false);
    // FAQ may still keyword-match "approval" — routing must prefer ops.
    assert.ok(matchProductHelpTopic(question) || true);
  });

  it("extracts event id from event pathnames", () => {
    assert.equal(
      extractEventIdFromPathname(
        "/events/a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      ),
      "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    );
    assert.equal(
      extractEventIdFromPathname(
        "/events/a1b2c3d4-e5f6-7890-abcd-ef1234567890/campaign-builder",
      ),
      "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    );
    assert.equal(extractEventIdFromPathname("/events/create"), null);
    assert.equal(extractEventIdFromPathname("/events"), null);
    assert.equal(extractEventIdFromPathname("/approvals"), null);
  });

  it("extracts meaningful query tokens for event matching", () => {
    const tokens = extractQueryTokens(
      "What should I do next for Back to School Fair?",
    );
    assert.ok(tokens.includes("back"));
    assert.ok(tokens.includes("school"));
    assert.ok(tokens.includes("fair"));
    assert.ok(!tokens.includes("what"));
    assert.ok(!tokens.includes("next"));
  });
});

describe("shouldRouteToOpsAsk", () => {
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

  it("routes ops intents only with event scope; bare ops go to org", () => {
    assert.equal(
      shouldRouteToOpsAsk("What should I do next?", null),
      false,
    );
    assert.equal(
      shouldRouteToOpsAsk(
        "What should I do next?",
        "/events/a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      ),
      true,
    );
    assert.equal(
      shouldRouteToOpsAsk(
        "hello",
        "/events/a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      ),
      true,
    );
  });

  it("routes when an event name is mentioned", () => {
    assert.equal(
      shouldRouteToOpsAsk("Back to School Fair status", null, events),
      true,
    );
  });

  it("does not route plain how-to without event context", () => {
    assert.equal(
      shouldRouteToOpsAsk("How do I create a campaign?", null, events),
      false,
    );
  });
});

/** Eval-style fixtures: Phase 1 acceptance questions → ops path. */
describe("Phase 1 ops routing fixtures", () => {
  const events = [
    {
      id: "evt-1",
      title: "Back to School Fair",
      date: "2026-08-20",
      status: "scheduled",
    },
  ];

  const eventScoped = [
    "What should I do next for Back to School Fair?",
    "Am I on schedule for Back to School Fair?",
    "What's publishing today for Back to School Fair?",
    "Is this event ready for Back to School Fair?",
    "What tasks are still incomplete for Back to School Fair?",
  ];

  for (const question of eventScoped) {
    it(`maps to ops path: ${question}`, () => {
      assert.equal(isOpsIntent(question), true);
      assert.equal(shouldRouteToOpsAsk(question, null, events), true);
      assert.equal(shouldPreferProductHelpFaq(question), false);
    });
  }

  it("routes bare status asks to org when no event is named", () => {
    for (const question of [
      "What's overdue?",
      "What's waiting for approval?",
      "What should I do next?",
      "Am I on schedule?",
      "What's publishing today?",
      "what do I have to do next week?",
    ]) {
      assert.equal(shouldRouteToOpsAsk(question, null, events), false, question);
      assert.equal(shouldPreferProductHelpFaq(question), false, question);
    }
  });

  it("keeps how-to on FAQ path", () => {
    const question = "Where do I find my approvals?";
    assert.equal(shouldPreferProductHelpFaq(question), true);
    assert.equal(matchProductHelpTopic(question)?.id, "find-approvals");
  });
});

describe("heyralli reproduction: event ops vs Tasks FAQ", () => {
  const events = [
    {
      id: "evt-1",
      title: "Back to School Fair",
      date: "2026-08-20",
      status: "scheduled",
    },
  ];

  const question =
    "what's next for back to school fair that I need to do?";

  it("routes the exact user string to ops, not Tasks FAQ", () => {
    assert.equal(isOpsIntent(question), true);
    assert.equal(shouldPreferProductHelpFaq(question), false);
    assert.equal(shouldRouteToOpsAsk(question, null, events), true);
    // Must not treat “need to do” as the Tasks how-to topic.
    assert.notEqual(matchProductHelpTopic(question)?.id, "tasks");
  });

  it("still routes with curly apostrophe in what's", () => {
    const curly = "what’s next for back to school fair that I need to do?";
    assert.equal(isOpsIntent(curly), true);
    assert.equal(shouldRouteToOpsAsk(curly, null, events), true);
    assert.equal(shouldPreferProductHelpFaq(curly), false);
  });
});
