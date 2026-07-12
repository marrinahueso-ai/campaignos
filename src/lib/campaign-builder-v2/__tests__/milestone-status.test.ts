import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  allMilestonesGenerated,
  countCompleteMilestones,
  findNextMilestoneToGenerate,
  inferGenerationStatus,
  isMilestoneContentComplete,
} from "../milestone-status.ts";
import { emptyMilestoneArtwork } from "../platform-utils.ts";
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

  it("detects needs_review when artwork exists", () => {
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
      "needs_review",
    );
    assert.equal(isMilestoneContentComplete(preview, preview.enabledFormats), true);
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
        generationStatus: "needs_review",
        status: "needs-review",
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
        generationStatus: "needs_review",
        status: "needs-review",
      }),
    ];

    assert.equal(findNextMilestoneToGenerate(milestones, previewContents), null);
    assert.equal(allMilestonesGenerated(milestones, previewContents), true);
  });
});
