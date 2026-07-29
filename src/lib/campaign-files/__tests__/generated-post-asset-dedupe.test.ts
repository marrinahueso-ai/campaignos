import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  dedupePostGraphicCandidates,
  pickPreferredPostGraphicCandidate,
} from "../generated-post-asset-dedupe.ts";

describe("generated post asset dedupe", () => {
  it("collapses hero-sync feed mirror rows that share storage_path", () => {
    const rows = [
      {
        id: "legacy-square",
        asset_type: "square_graphic" as const,
        storage_path: "events/abc/feed.png",
        plan_label: "Reminder Only — Feed 1:1",
        updated_at: "2026-07-01T12:00:00.000Z",
      },
      {
        id: "canonical-feed",
        asset_type: "instagram_graphic" as const,
        storage_path: "events/abc/feed.png",
        plan_label: "Reminder Only — Feed (1:1)",
        updated_at: "2026-07-01T11:00:00.000Z",
      },
    ];

    const deduped = dedupePostGraphicCandidates(rows);

    assert.equal(deduped.length, 1);
    assert.equal(deduped[0]?.id, "canonical-feed");
    assert.equal(deduped[0]?.plan_label, "Reminder Only — Feed (1:1)");
  });

  it("keeps distinct images even when plan labels match", () => {
    const rows = [
      {
        id: "v1",
        asset_type: "instagram_graphic" as const,
        storage_path: "events/abc/feed-v1.png",
        plan_label: "Reminder Only — Feed (1:1)",
      },
      {
        id: "v2",
        asset_type: "instagram_graphic" as const,
        storage_path: "events/abc/feed-v2.png",
        plan_label: "Reminder Only — Feed (1:1)",
      },
    ];

    const deduped = dedupePostGraphicCandidates(rows);

    assert.equal(deduped.length, 2);
  });

  it("keeps feed and story when storage paths differ", () => {
    const rows = [
      {
        id: "feed",
        asset_type: "instagram_graphic" as const,
        storage_path: "events/abc/feed.png",
        plan_label: "Reminder Only — Feed (1:1)",
      },
      {
        id: "story",
        asset_type: "instagram_story" as const,
        storage_path: "events/abc/story.png",
        plan_label: "Reminder Only — Story",
      },
    ];

    const deduped = dedupePostGraphicCandidates(rows);

    assert.equal(deduped.length, 2);
  });

  it("prefers phase-aligned feed label over legacy square_graphic", () => {
    const preferred = pickPreferredPostGraphicCandidate([
      {
        id: "legacy",
        asset_type: "square_graphic",
        storage_path: "events/abc/feed.png",
        plan_label: "Save the Date — Feed 1:1",
      },
      {
        id: "canonical",
        asset_type: "instagram_graphic",
        storage_path: "events/abc/feed.png",
        plan_label: "Save the Date — Feed (1:1)",
      },
    ]);

    assert.equal(preferred.id, "canonical");
  });
});
