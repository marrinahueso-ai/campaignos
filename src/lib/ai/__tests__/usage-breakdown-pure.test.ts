import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  AI_USAGE_CATEGORY_LABELS,
  AI_USAGE_CATEGORY_ORDER,
  aggregateUsageByCategory,
  categoryKeyForRow,
  categoryLabelForActionType,
  isRegenerationMetadata,
  ledgerActivityDescription,
  milestoneLabelFromMetadata,
  rankUsageByMember,
  relativeDayFromMetadata,
  type AiUsageAggregationRow,
} from "../usage-breakdown-pure.ts";

/**
 * usage-breakdown.ts itself is server-only (admin Supabase client + auth
 * membership check) and can't be imported directly in this test runner —
 * same constraint as gates.ts / capacity-usage.ts. These pure helpers are
 * exactly what usage-breakdown.ts delegates all math to.
 */

function row(overrides: Partial<AiUsageAggregationRow>): AiUsageAggregationRow {
  return {
    userId: "user-1",
    actionType: "ask_ralli",
    success: true,
    metadata: {},
    ...overrides,
  };
}

describe("metadata helpers", () => {
  it("isRegenerationMetadata only trusts an explicit true", () => {
    assert.equal(isRegenerationMetadata({ isRegeneration: true }), true);
    assert.equal(isRegenerationMetadata({ isRegeneration: false }), false);
    assert.equal(isRegenerationMetadata({ isRegeneration: "true" }), false);
    assert.equal(isRegenerationMetadata(null), false);
    assert.equal(isRegenerationMetadata(undefined), false);
    assert.equal(isRegenerationMetadata({}), false);
  });

  it("milestoneLabelFromMetadata trims and rejects blank/non-string", () => {
    assert.equal(milestoneLabelFromMetadata({ milestoneLabel: "  Day 3 Reminder  " }), "Day 3 Reminder");
    assert.equal(milestoneLabelFromMetadata({ milestoneLabel: "" }), null);
    assert.equal(milestoneLabelFromMetadata({ milestoneLabel: "   " }), null);
    assert.equal(milestoneLabelFromMetadata({ milestoneLabel: 42 }), null);
    assert.equal(milestoneLabelFromMetadata(null), null);
  });

  it("relativeDayFromMetadata only accepts finite numbers", () => {
    assert.equal(relativeDayFromMetadata({ relativeDay: 3 }), 3);
    assert.equal(relativeDayFromMetadata({ relativeDay: 0 }), 0);
    assert.equal(relativeDayFromMetadata({ relativeDay: Number.NaN }), null);
    assert.equal(relativeDayFromMetadata({ relativeDay: "3" }), null);
    assert.equal(relativeDayFromMetadata(null), null);
  });
});

describe("categoryKeyForRow / categoryLabelForActionType", () => {
  it("splits generate_artwork into generation vs regeneration via metadata", () => {
    assert.equal(
      categoryKeyForRow(row({ actionType: "generate_artwork", metadata: {} })),
      "artwork_generation",
    );
    assert.equal(
      categoryKeyForRow(row({ actionType: "generate_artwork", metadata: { isRegeneration: true } })),
      "artwork_regeneration",
    );
  });

  it("groups orchestrate_artwork under generation/regeneration the same way", () => {
    assert.equal(categoryKeyForRow(row({ actionType: "orchestrate_artwork" })), "artwork_generation");
    assert.equal(
      categoryKeyForRow(row({ actionType: "orchestrate_artwork", metadata: { isRegeneration: true } })),
      "artwork_regeneration",
    );
  });

  it("maps every documented non-artwork action_type to its own category (not Etc)", () => {
    const directMappings: Array<[string, string]> = [
      ["meta_social_caption", "Caption Count"],
      ["ask_ralli", "Ask Ralli"],
      ["tasks_generate", "Task Assistant"],
      ["inbox_ai", "Inbox AI"],
      ["calendar_import_parse", "Calendar Import"],
      ["playbook_insights", "Playbook Insights"],
      ["draft_communication", "Communication Draft"],
      ["generate_event_brief", "Event Brief"],
      ["generate_creative_brief", "Creative Brief"],
    ];
    for (const [actionType, label] of directMappings) {
      assert.equal(categoryLabelForActionType(actionType), label, actionType);
      assert.notEqual(categoryLabelForActionType(actionType), "Etc", actionType);
    }
  });

  it("falls back unknown action_types to Etc", () => {
    assert.equal(categoryLabelForActionType("some_future_action"), "Etc");
    assert.equal(categoryKeyForRow(row({ actionType: "some_future_action" })), "other");
  });

  it("every category key has a stable label and the order covers every key exactly once", () => {
    assert.deepEqual(
      [...AI_USAGE_CATEGORY_ORDER].sort(),
      (Object.keys(AI_USAGE_CATEGORY_LABELS) as (keyof typeof AI_USAGE_CATEGORY_LABELS)[]).sort(),
    );
  });
});

describe("aggregateUsageByCategory", () => {
  it("always includes every category, zero-filled when unused", () => {
    const entries = aggregateUsageByCategory([]);
    assert.equal(entries.length, AI_USAGE_CATEGORY_ORDER.length);
    for (const entry of entries) {
      assert.equal(entry.count, 0);
      assert.equal(entry.credits, 0);
    }
  });

  it("weights artwork generation at 8 credits and text actions at 1", () => {
    const entries = aggregateUsageByCategory([
      row({ actionType: "generate_artwork" }),
      row({ actionType: "generate_artwork", metadata: { isRegeneration: true } }),
      row({ actionType: "ask_ralli" }),
      row({ actionType: "ask_ralli" }),
    ]);
    const byKey = new Map(entries.map((e) => [e.key, e]));
    assert.deepEqual(byKey.get("artwork_generation"), {
      key: "artwork_generation",
      label: "Artwork Generation",
      count: 1,
      credits: 8,
    });
    assert.deepEqual(byKey.get("artwork_regeneration"), {
      key: "artwork_regeneration",
      label: "Artwork Regeneration",
      count: 1,
      credits: 8,
    });
    assert.deepEqual(byKey.get("ask_ralli"), {
      key: "ask_ralli",
      label: "Ask Ralli",
      count: 2,
      credits: 2,
    });
  });

  it("failed actions count toward usage but never burn credits", () => {
    const entries = aggregateUsageByCategory([
      row({ actionType: "generate_artwork", success: false }),
    ]);
    const artwork = entries.find((e) => e.key === "artwork_generation");
    assert.equal(artwork?.count, 1);
    assert.equal(artwork?.credits, 0);
  });

  it("sorts highest usage first (by credits, then count), unused categories stay in a stable order at the bottom", () => {
    const entries = aggregateUsageByCategory([
      row({ actionType: "ask_ralli" }),
      row({ actionType: "ask_ralli" }),
      row({ actionType: "generate_artwork" }),
    ]);
    assert.equal(entries[0]?.key, "artwork_generation");
    assert.equal(entries[0]?.credits, 8);
    assert.equal(entries[1]?.key, "ask_ralli");
    assert.equal(entries[1]?.credits, 2);
    const remaining = entries.slice(2);
    assert.ok(remaining.every((entry) => entry.credits === 0 && entry.count === 0));
    // Stable order among zero-usage categories mirrors AI_USAGE_CATEGORY_ORDER.
    assert.equal(remaining[0]?.key, "artwork_regeneration");
  });
});

describe("rankUsageByMember", () => {
  it("sorts descending by credits, weighting artwork over text", () => {
    const rows = [
      row({ userId: "heavy-texter", actionType: "ask_ralli" }),
      row({ userId: "heavy-texter", actionType: "ask_ralli" }),
      row({ userId: "heavy-texter", actionType: "ask_ralli" }),
      row({ userId: "artwork-user", actionType: "generate_artwork" }),
    ];
    const ranked = rankUsageByMember(rows);
    assert.equal(ranked[0]?.userId, "artwork-user");
    assert.equal(ranked[0]?.credits, 8);
    assert.equal(ranked[1]?.userId, "heavy-texter");
    assert.equal(ranked[1]?.credits, 3);
    assert.equal(ranked[1]?.count, 3);
  });

  it("groups rows with no userId under a single null entry (historical / unattributed usage)", () => {
    const rows = [
      row({ userId: null, actionType: "generate_artwork" }),
      row({ userId: null, actionType: "generate_artwork" }),
      row({ userId: "known-user", actionType: "ask_ralli" }),
    ];
    const ranked = rankUsageByMember(rows);
    const unknown = ranked.find((entry) => entry.userId === null);
    assert.equal(unknown?.count, 2);
    assert.equal(unknown?.credits, 16);
  });

  it("breaks credit ties by higher action count", () => {
    const rows = [
      row({ userId: "one-artwork", actionType: "generate_artwork" }), // 8 credits, 1 action
      ...Array.from({ length: 8 }, () => row({ userId: "eight-texts", actionType: "ask_ralli" })), // 8 credits, 8 actions
    ];
    const ranked = rankUsageByMember(rows);
    assert.equal(ranked[0]?.credits, 8);
    assert.equal(ranked[1]?.credits, 8);
    assert.equal(ranked[0]?.userId, "eight-texts");
    assert.equal(ranked[1]?.userId, "one-artwork");
  });
});

describe("ledgerActivityDescription", () => {
  it("builds a member + category + event/milestone line for burns", () => {
    const description = ledgerActivityDescription({
      actorLabel: "sarah@school.org",
      actionType: "generate_artwork",
      isRegeneration: true,
      eventTitle: "Fall Fundraiser",
      milestoneLabel: "Day 3 Reminder",
      note: "generate_artwork: 8 period + 0 reserve",
    });
    assert.equal(
      description,
      "sarah@school.org — Artwork Regeneration — Fall Fundraiser · Day 3 Reminder",
    );
  });

  it("omits event/milestone segment when absent", () => {
    const description = ledgerActivityDescription({
      actorLabel: "sarah@school.org",
      actionType: "ask_ralli",
      isRegeneration: false,
      eventTitle: null,
      milestoneLabel: null,
      note: null,
    });
    assert.equal(description, "sarah@school.org — Ask Ralli");
  });

  it("falls back to actor + note for grants/adjustments with no actionType", () => {
    const description = ledgerActivityDescription({
      actorLabel: null,
      actionType: null,
      isRegeneration: false,
      eventTitle: null,
      milestoneLabel: null,
      note: "Monthly grant (professional)",
    });
    assert.equal(description, "Monthly grant (professional)");
  });

  it("falls back to an em dash when there is nothing to show", () => {
    const description = ledgerActivityDescription({
      actorLabel: null,
      actionType: null,
      isRegeneration: false,
      eventTitle: null,
      milestoneLabel: null,
      note: null,
    });
    assert.equal(description, "—");
  });
});
