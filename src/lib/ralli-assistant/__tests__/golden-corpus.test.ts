import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  shouldRouteToInsightsAsk,
  shouldRouteToOpsAsk,
  shouldRouteToOrgBriefing,
} from "../ask-routing.ts";
import { isOpsIntent, shouldPreferProductHelpFaq } from "../ops-intent.ts";
import { isInsightsIntent } from "../insights-intent.ts";
import { isVolunteersIntent } from "../volunteers-intent.ts";
import { isOrgBriefingIntent, isOrgPriorityListIntent } from "../org-intent.ts";
import { matchProductHelpTopic } from "../product-help-knowledge.ts";
import { matchPtoAdvisorTopic, shouldPreferPtoAdvisor } from "../pto-advisor-knowledge.ts";

/**
 * Golden Q&A corpus from the "Ask Ralli QA script" plan — Daily Assistant,
 * Recommendations, and everyday natural-language questions. These are eval
 * fixtures for intent routing, not literal answer text: we assert each
 * question reaches a *live, grounded* path (org/ops/insights/volunteers)
 * rather than falling through to a generic product-help FAQ non-answer.
 */
describe("Golden corpus: Daily Assistant questions", () => {
  const dailyAssistant = [
    "Catch me up.",
    "Give me my daily briefing.",
    "What did I miss?",
    "What's happening tomorrow?",
    "Before I log off, what should I finish?",
  ];

  for (const question of dailyAssistant) {
    it(`routes to org briefing: ${question}`, () => {
      assert.equal(
        isOrgBriefingIntent(question),
        true,
        `expected ${JSON.stringify(question)} to be detected as an org briefing intent`,
      );
      assert.equal(shouldRouteToOrgBriefing(question), true);
    });
  }
});

describe("Golden corpus: Recommendations / conversational questions", () => {
  it('"What would you do?" reaches the org priority-list path', () => {
    const question = "What would you do?";
    assert.equal(isOrgPriorityListIntent(question), true);
    assert.equal(shouldRouteToOrgBriefing(question), true);
  });

  it('"What worries you about this?" reaches insights, not a bare FAQ', () => {
    const question = "What worries you about this?";
    assert.equal(isInsightsIntent(question), true);
    assert.equal(shouldRouteToInsightsAsk(question), true);
  });

  it('"Is anything likely to become a problem if I wait?" reaches PTO playbook advice', () => {
    const question = "Is anything likely to become a problem if I wait?";
    assert.equal(shouldPreferPtoAdvisor(question), true);
    assert.equal(matchPtoAdvisorTopic(question)?.id, "problem-if-wait");
  });

  it('"What should I prepare before next week?" reaches PTO playbook advice', () => {
    const question = "What should I prepare before next week?";
    assert.equal(shouldPreferPtoAdvisor(question), true);
    assert.equal(matchPtoAdvisorTopic(question)?.id, "prepare-next-week");
  });

  const genericConversational = [
    "Can you take a look at this?",
    "What do you think?",
    "Is there a better way?",
    "Does this feel right?",
    "Can you double-check my work?",
    "Would you change anything?",
    "What would make this easier?",
    "Can you think ahead for me?",
    "What can I automate?",
  ];

  for (const question of genericConversational) {
    it(`does not get hijacked by an unrelated FAQ topic: ${question}`, () => {
      // These are intentionally open-ended (no event/content in view). The bar
      // is that they never resolve to an unrelated product-help topic —
      // they should fall through to the general AI assistant path instead.
      assert.equal(matchProductHelpTopic(question), null);
    });
  }
});

describe("Golden corpus: status/approval/volunteer follow-ups", () => {
  it('"Who still needs to approve this?" is treated as a live ops question, not FAQ navigation', () => {
    const question = "Who still needs to approve this?";
    assert.equal(isOpsIntent(question), true);
    // Even though "approvals" also matches the find-approvals FAQ keyword,
    // the live ops/org path must win so the answer names real approvers.
    assert.equal(shouldPreferProductHelpFaq(question), false);
    assert.equal(shouldRouteToOrgBriefing(question), true);
  });

  it('"Should I be worried?" reaches insights for a live health read', () => {
    const question = "Should I be worried?";
    assert.equal(isInsightsIntent(question), true);
    assert.equal(shouldRouteToInsightsAsk(question), true);
  });

  it('"How is this event doing?" reaches insights (event-scoped)', () => {
    const question = "How is this event doing?";
    assert.equal(isInsightsIntent(question), true);
    assert.equal(shouldRouteToInsightsAsk(question), true);
  });

  it('"Who hasn\'t volunteered yet?" is treated as a volunteers question, not a generic answer', () => {
    const question = "Who hasn't volunteered yet?";
    assert.equal(isVolunteersIntent(question), true);
    assert.equal(shouldRouteToOrgBriefing(question), true);
  });

  it('"Which events need attention?" stays on the org path even though it is ops-shaped', () => {
    const question = "Which events need attention?";
    assert.equal(shouldRouteToOrgBriefing(question), true);
    assert.equal(shouldRouteToOpsAsk(question, null), false);
  });
});
