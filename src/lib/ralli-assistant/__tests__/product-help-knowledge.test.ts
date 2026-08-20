import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  formatTopicAnswer,
  matchProductHelpTopic,
  withHelpCenterLink,
} from "../product-help-knowledge.ts";

describe("matchProductHelpTopic", () => {
  it("matches create campaign questions", () => {
    const topic = matchProductHelpTopic("how do I create a campaign?");
    assert.equal(topic?.id, "create-campaign");
    assert.match(formatTopicAnswer(topic!), /Create event/i);
  });

  it("matches approvals questions", () => {
    const topic = matchProductHelpTopic("where do I find my approvals?");
    assert.equal(topic?.id, "find-approvals");
    assert.match(formatTopicAnswer(topic!), /Approvals/i);
    assert.ok(topic!.links.some((link) => link.href === "/approvals"));
    assert.equal(topic!.helpArticleId, "approvals");
  });

  it("matches Meta connect how-tos", () => {
    const topic = matchProductHelpTopic(
      "How do I connect Facebook and Instagram?",
    );
    assert.equal(topic?.id, "connect-meta");
    assert.ok(
      topic!.links.some((link) => link.href === "/settings/integrations"),
    );
    assert.equal(topic!.helpArticleId, "connect-meta");
  });

  it("matches after-approval questions", () => {
    const topic = matchProductHelpTopic(
      "what happens after something is approved",
    );
    assert.equal(topic?.id, "after-approval");
  });

  it("does not send brand-voice questions to a customer AI Brain screen", () => {
    const topic = matchProductHelpTopic("where is AI Brain training library?");
    assert.equal(topic?.id, "ai-brain-vs-ask");
    assert.doesNotMatch(formatTopicAnswer(topic!), /Settings → AI Brain/);
    assert.ok(
      topic!.links.every((link) => link.href !== "/settings/ai-brain"),
    );
  });

  it("returns null for unrelated questions", () => {
    assert.equal(matchProductHelpTopic("write me a facebook caption"), null);
  });

  it("does not match Create with AI on bare milestone status asks", () => {
    assert.equal(
      matchProductHelpTopic("are all my milestones done for this week"),
      null,
    );
    assert.equal(
      matchProductHelpTopic("what is create with ai?")?.id,
      "create-with-ai",
    );
  });
});

describe("withHelpCenterLink", () => {
  it("appends Help Center home or article anchor", () => {
    const withHome = withHelpCenterLink([{ label: "Approvals", href: "/approvals" }]);
    assert.deepEqual(withHome.at(-1), {
      label: "Help Center",
      href: "/help",
    });

    const withArticle = withHelpCenterLink(
      [{ label: "Integrations", href: "/settings/integrations" }],
      "connect-meta",
    );
    assert.deepEqual(withArticle.at(-1), {
      label: "Help Center",
      href: "/help#connect-meta",
    });
  });

  it("replaces an existing /help chip instead of duplicating", () => {
    const links = withHelpCenterLink(
      [
        { label: "Old", href: "/help" },
        { label: "Approvals", href: "/approvals" },
      ],
      "approvals",
    );
    assert.equal(links.filter((link) => link.href.startsWith("/help")).length, 1);
    assert.equal(links.at(-1)?.href, "/help#approvals");
  });
});
