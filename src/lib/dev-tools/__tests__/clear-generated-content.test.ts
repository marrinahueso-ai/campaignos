import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildDefaultSession } from "../../campaign-builder-v2/seed-data.ts";
import { MILESTONE_STATUS_LABELS } from "../../campaign-builder-v2/milestone-status.ts";
import { STALE_CONTENT_NOTE } from "../constants.ts";
import {
  changeRequestDisplayComment,
  clearSessionGeneratedContent,
  hasStaleContentNote,
  isGeneratedPathForEvent,
  isGeneratedPathForMilestone,
  withStaleContentNote,
} from "../clear-generated-content.ts";

describe("clear generated content helpers", () => {
  it("scopes clear to exact milestone id and leaves sibling names untouched", () => {
    const session = buildDefaultSession(
      "evt-clear",
      "Back to School Fair",
      "2026-08-17",
    );
    const firstId = session.milestones[0]!.id;
    const secondId = session.milestones[1]!.id;

    const withContent = {
      ...session,
      previewContents: session.previewContents.map((preview) => {
        if (preview.milestoneId === firstId) {
          return {
            ...preview,
            generationStatus: "generated" as const,
            artwork: {
              feedUrl: `https://cdn.example/${session.eventId}/campaign-builder-v2/generated/${firstId}/feed.png`,
              storyUrl: `https://cdn.example/${session.eventId}/campaign-builder-v2/generated/${firstId}/story.png`,
            },
            captions: [
              { platform: "facebook" as const, text: "First caption" },
              { platform: "instagram" as const, text: "First caption" },
            ],
          };
        }
        if (preview.milestoneId === secondId) {
          return {
            ...preview,
            generationStatus: "generated" as const,
            artwork: {
              feedUrl: `https://cdn.example/${session.eventId}/campaign-builder-v2/generated/${secondId}/feed.png`,
              storyUrl: null,
            },
            captions: [
              { platform: "facebook" as const, text: "Second caption" },
              { platform: "instagram" as const, text: "Second caption" },
            ],
          };
        }
        return preview;
      }),
    };

    const cleared = clearSessionGeneratedContent(withContent, [firstId]);

    assert.equal(cleared.artworkCleared, 2);
    assert.equal(cleared.captionsCleared, 2);
    assert.deepEqual(cleared.clearedMilestoneIds, [firstId]);

    const first = cleared.next.previewContents.find(
      (preview) => preview.milestoneId === firstId,
    );
    const second = cleared.next.previewContents.find(
      (preview) => preview.milestoneId === secondId,
    );

    assert.ok(first);
    assert.ok(second);
    assert.equal(first.artwork.feedUrl, null);
    assert.equal(first.artwork.storyUrl, null);
    assert.equal(first.captions.every((caption) => caption.text === ""), true);
    assert.equal(first.generationStatus, "ready_to_generate");
    assert.equal(
      MILESTONE_STATUS_LABELS[first.generationStatus],
      "Not started",
    );

    assert.equal(
      second.artwork.feedUrl,
      `https://cdn.example/${session.eventId}/campaign-builder-v2/generated/${secondId}/feed.png`,
    );
    assert.equal(second.captions[0]?.text, "Second caption");
  });

  it("never matches generated paths by milestone name", () => {
    const eventId = "evt-a";
    const milestoneId = "ms-14";
    const path = `${eventId}/campaign-builder-v2/generated/${milestoneId}/feed.png`;

    assert.equal(isGeneratedPathForMilestone(path, eventId, milestoneId), true);
    assert.equal(
      isGeneratedPathForMilestone(path, eventId, "14 Days Out"),
      false,
    );
    assert.equal(
      isGeneratedPathForMilestone(path, "evt-other", milestoneId),
      false,
    );
    assert.equal(isGeneratedPathForEvent(path, eventId), true);
    assert.equal(isGeneratedPathForEvent(path, "evt-other"), false);
  });

  it("campaign-wide clear empties all previews in that session only", () => {
    const session = buildDefaultSession("evt-one", "One", "2026-08-17");

    const filled = {
      ...session,
      previewContents: session.previewContents.map((preview) => ({
        ...preview,
        artwork: {
          feedUrl: `https://cdn.example/${session.eventId}/campaign-builder-v2/generated/${preview.milestoneId}/feed.png`,
          storyUrl: null,
        },
        captions: [
          { platform: "facebook" as const, text: "Caption" },
          { platform: "instagram" as const, text: "Caption" },
        ],
      })),
    };

    const cleared = clearSessionGeneratedContent(filled, "all");
    assert.ok(cleared.artworkCleared >= 1);
    assert.ok(cleared.captionsCleared >= 1);
    assert.equal(cleared.next.eventId, "evt-one");
    assert.equal(
      cleared.next.previewContents.every(
        (preview) =>
          !preview.artwork.feedUrl &&
          preview.captions.every((caption) => caption.text === "") &&
          preview.generationStatus === "ready_to_generate",
      ),
      true,
    );
  });

  it("stale note marker is idempotent", () => {
    const once = withStaleContentNote("Existing note");
    assert.ok(once.includes(STALE_CONTENT_NOTE));
    assert.equal(hasStaleContentNote(once), true);

    const twice = withStaleContentNote(once);
    assert.equal(twice, once);
  });

  it("strips stale marker from change-request display comments", () => {
    assert.equal(
      changeRequestDisplayComment(`Please use warmer colors.\n${STALE_CONTENT_NOTE}`),
      "Please use warmer colors.",
    );
    assert.equal(changeRequestDisplayComment(STALE_CONTENT_NOTE), null);
    assert.equal(changeRequestDisplayComment(null), null);
  });
});
