import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  allMilestonesGenerated,
  countCompleteMilestones,
  findNextMilestoneToGenerate,
  inferGenerationStatus,
  isMilestoneContentComplete,
  milestoneHasArtwork,
} from "../milestone-status.ts";
import { emptyMilestoneArtwork, normalizeMilestoneArtwork } from "../platform-utils.ts";
import type {
  CampaignBuilderMilestone,
  MilestonePreviewContent,
} from "../types.ts";

const baseMilestone: CampaignBuilderMilestone = {
  id: "ms-1",
  name: "Save the Date",
  category: "awareness",
  purpose: "Announce the event",
  suggestedDate: "2026-07-01",
  platforms: ["facebook", "instagram"],
  platformFormats: ["facebook-feed", "instagram-feed"],
  artworkNotes: "",
  captionNotes: "",
  statusTag: "not-started",
  sortOrder: 0,
};

function buildPreview(
  overrides: Partial<MilestonePreviewContent> = {},
): MilestonePreviewContent {
  return {
    milestoneId: "ms-1",
    status: "draft",
    generationStatus: "ready_to_generate",
    generationStartedAt: null,
    artwork: emptyMilestoneArtwork(),
    captions: [
      { platform: "facebook", text: "" },
      { platform: "instagram", text: "" },
    ],
    enabledFormats: ["facebook-feed", "instagram-feed"],
    deliveryMethod: "auto-publish",
    scheduleDate: "2026-07-01",
    scheduleTime: "09:00",
    emailSendDate: "2026-07-01",
    emailSendTime: "09:00",
    manualEmailTo: "test@example.com",
    approvalStatuses: [],
    ...overrides,
  };
}

describe("milestone-status", () => {
  it("detects ready_to_generate when no content exists", () => {
    const preview = buildPreview();
    assert.equal(
      inferGenerationStatus(preview, preview.enabledFormats),
      "ready_to_generate",
    );
    assert.equal(isMilestoneContentComplete(preview, preview.enabledFormats), false);
  });

  it("detects generated when artwork exists", () => {
    const preview = buildPreview({
      artwork: {
        feedUrl: "https://example.com/feed.png",
        storyUrl: null,
      },
      captions: [
        { platform: "facebook", text: "Hello" },
        { platform: "instagram", text: "Hello" },
      ],
      status: "needs-review",
    });
    assert.equal(
      inferGenerationStatus(preview, preview.enabledFormats),
      "generated",
    );
    assert.equal(isMilestoneContentComplete(preview, preview.enabledFormats), true);
    assert.equal(milestoneHasArtwork(preview), true);
  });

  it("detects generated when artwork exists but enabled formats are empty", () => {
    const preview = buildPreview({
      artwork: {
        feedUrl: "https://example.com/feed.png",
        storyUrl: "https://example.com/story.png",
      },
      enabledFormats: [],
      status: "draft",
      generationStatus: "ready_to_generate",
    });
    assert.equal(
      inferGenerationStatus(preview, preview.enabledFormats),
      "generated",
    );
    assert.equal(isMilestoneContentComplete(preview, preview.enabledFormats), true);
  });

  it("ignores placeholder artwork URLs", () => {
    const preview = buildPreview({
      artwork: {
        feedUrl: "/api/placeholder-artwork",
        storyUrl: "https://placehold.co/600x600",
      },
      status: "draft",
      generationStatus: "ready_to_generate",
    });
    assert.equal(
      inferGenerationStatus(preview, preview.enabledFormats),
      "ready_to_generate",
    );
    assert.equal(milestoneHasArtwork(preview), false);
  });

  it("upgrades stale ready_to_generate when story artwork exists", () => {
    const preview = buildPreview({
      milestoneId: "ms-2",
      artwork: {
        feedUrl: null,
        storyUrl: "https://example.com/story.png",
      },
      captions: [],
      status: "draft",
      generationStatus: "ready_to_generate",
    });
    assert.equal(
      inferGenerationStatus(preview, preview.enabledFormats),
      "generated",
    );
  });

  it("detects generated from legacy artwork slot keys after normalization", () => {
    const artwork = normalizeMilestoneArtwork({
      feedUrl: null,
      storyUrl: null,
      facebookFeedUrl:
        "https://example.supabase.co/storage/v1/object/public/event-assets/evt-1/feed.png",
      instagramStoryUrl:
        "https://example.supabase.co/storage/v1/object/public/event-assets/evt-1/story.png",
    });
    const preview = buildPreview({
      artwork,
      captions: [],
      status: "draft",
      generationStatus: "ready_to_generate",
    });
    assert.equal(
      inferGenerationStatus(preview, preview.enabledFormats),
      "generated",
    );
    assert.equal(milestoneHasArtwork(preview), true);
  });

  it("detects generated from relative storage artwork paths", () => {
    const artwork = normalizeMilestoneArtwork({
      feedUrl: "/storage/v1/object/public/event-assets/evt-1/feed.png",
      storyUrl: null,
    });
    const preview = buildPreview({
      artwork,
      captions: [],
      status: "draft",
      generationStatus: "ready_to_generate",
    });
    assert.equal(
      inferGenerationStatus(preview, preview.enabledFormats),
      "generated",
    );
  });

  it("detects needs_review when only captions exist", () => {
    const preview = buildPreview({
      captions: [
        { platform: "facebook", text: "Caption only" },
        { platform: "instagram", text: "Caption only" },
      ],
      status: "draft",
      generationStatus: "ready_to_generate",
    });
    assert.equal(
      inferGenerationStatus(preview, preview.enabledFormats),
      "needs_review",
    );
  });

  it("finds next milestone to generate by sort order", () => {
    const milestones: CampaignBuilderMilestone[] = [
      baseMilestone,
      { ...baseMilestone, id: "ms-2", name: "Reminder", sortOrder: 1 },
    ];
    const previewContents: MilestonePreviewContent[] = [
      buildPreview({
        milestoneId: "ms-1",
        artwork: {
          feedUrl: "https://example.com/feed.png",
          storyUrl: null,
        },
        captions: [
          { platform: "facebook", text: "Done" },
          { platform: "instagram", text: "Done" },
        ],
        generationStatus: "generated",
        status: "ready",
      }),
      buildPreview({ milestoneId: "ms-2" }),
    ];

    const next = findNextMilestoneToGenerate(milestones, previewContents);
    assert.equal(next?.id, "ms-2");
    assert.equal(allMilestonesGenerated(milestones, previewContents), false);

    const progress = countCompleteMilestones(milestones, previewContents);
    assert.equal(progress.complete, 1);
    assert.equal(progress.total, 2);
  });

  it("reports all generated when every milestone has content", () => {
    const milestones: CampaignBuilderMilestone[] = [baseMilestone];
    const previewContents: MilestonePreviewContent[] = [
      buildPreview({
        artwork: {
          feedUrl: "https://example.com/feed.png",
          storyUrl: null,
        },
        captions: [
          { platform: "facebook", text: "Done" },
          { platform: "instagram", text: "Done" },
        ],
        generationStatus: "generated",
        status: "ready",
      }),
    ];

    assert.equal(findNextMilestoneToGenerate(milestones, previewContents), null);
    assert.equal(allMilestonesGenerated(milestones, previewContents), true);
  });
});
