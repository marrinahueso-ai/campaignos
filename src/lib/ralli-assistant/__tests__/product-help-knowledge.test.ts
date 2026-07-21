import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  formatTopicAnswer,
  matchProductHelpTopic,
} from "../product-help-knowledge.ts";

describe("matchProductHelpTopic", () => {
  it("matches create campaign questions", () => {
    const topic = matchProductHelpTopic("how do I create a campaign?");
    assert.equal(topic?.id, "create-campaign");
    assert.match(formatTopicAnswer(topic!), /Create Campaign/);
  });

  it("matches approvals questions", () => {
    const topic = matchProductHelpTopic("where do I find my approvals?");
    assert.equal(topic?.id, "find-approvals");
    assert.match(formatTopicAnswer(topic!), /Approvals/i);
    assert.ok(topic!.links.some((link) => link.href === "/approvals"));
  });

  it("matches after-approval questions", () => {
    const topic = matchProductHelpTopic(
      "what happens after something is approved",
    );
    assert.equal(topic?.id, "after-approval");
  });

  it("returns null for unrelated questions", () => {
    assert.equal(matchProductHelpTopic("write me a facebook caption"), null);
  });
});
