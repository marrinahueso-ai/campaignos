import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  allMilestonesGenerated,
  countCompleteMilestones,
  derivedPreviewStatus,
  findNextMilestoneToGenerate,
  inferGenerationStatus,
  isMilestoneContentComplete,
  milestoneHasArtwork,
  MILESTONE_STATUS_LABELS,
  resolveMilestoneGenerationStatus,
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
    manualUploadLink: "",
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

  it("derives ready from content even when the raw status field says needs-review (Edit artwork/caption apply)", () => {
    // Reproduces the exact scenario from EditArtworkModal/EditCaptionModal's
    // onApply handlers, which set status: "needs-review" whenever the user
    // applies an edit — even when full content already exists. Every
    // consumer must treat this milestone as complete/"ready", not just the
    // rail's inferGenerationStatus.
    const preview = buildPreview({
      artwork: {
        feedUrl: "https://example.com/feed.png",
        storyUrl: "https://example.com/story.png",
      },
      captions: [
        { platform: "facebook", text: "Hello" },
        { platform: "instagram", text: "Hello" },
      ],
      status: "needs-review",
      generationStatus: "needs_review",
    });

    assert.equal(derivedPreviewStatus(preview), "ready");
    assert.equal(
      inferGenerationStatus(preview, preview.enabledFormats),
      "generated",
    );
  });

  it("derives draft from content even when the raw status field is stale ready", () => {
    const preview = buildPreview({
      artwork: emptyMilestoneArtwork(),
      captions: [
        { platform: "facebook", text: "" },
        { platform: "instagram", text: "" },
      ],
      status: "ready",
      generationStatus: "ready_to_generate",
    });

    assert.equal(derivedPreviewStatus(preview), "draft");
  });

  it("derives needs-review when only captions exist regardless of raw status", () => {
    const preview = buildPreview({
      artwork: emptyMilestoneArtwork(),
      captions: [
        { platform: "facebook", text: "Caption only" },
        { platform: "instagram", text: "Caption only" },
      ],
      status: "draft",
      generationStatus: "ready_to_generate",
    });

    assert.equal(derivedPreviewStatus(preview), "needs-review");
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

describe("resolveMilestoneGenerationStatus — timeline vs opened detail", () => {
  it("shows Not started when there is no preview content", () => {
    const status = resolveMilestoneGenerationStatus(null, [
      "facebook-feed",
      "instagram-feed",
    ]);
    assert.equal(status, "ready_to_generate");
    assert.equal(MILESTONE_STATUS_LABELS[status], "Not started");
  });

  it("does not show Not started for a completed milestone even when statusTag is stale", () => {
    // Simulate the regression: milestone.statusTag stayed "not-started" after
    // generation, but preview content is complete.
    assert.equal(baseMilestone.statusTag, "not-started");

    const preview = buildPreview({
      artwork: {
        feedUrl: "https://example.com/feed.png",
        storyUrl: null,
      },
      captions: [
        { platform: "facebook", text: "See you at the fair!" },
        { platform: "instagram", text: "See you at the fair!" },
      ],
      generationStatus: "generated",
      status: "needs-review",
      // Empty approvalStatuses would make Array.every() true — keep an
      // explicit non-approved entry so this case stays content-complete.
      approvalStatuses: [
        {
          role: "creator",
          label: "Creator",
          status: "not-started",
          timestamp: null,
        },
      ],
    });

    const status = resolveMilestoneGenerationStatus(
      preview,
      baseMilestone.platformFormats,
    );
    assert.equal(status, "generated");
    assert.equal(MILESTONE_STATUS_LABELS[status], "Complete");
    assert.notEqual(MILESTONE_STATUS_LABELS[status], "Not started");
  });

  it("matches rail and editor for awaiting approval", () => {
    const preview = buildPreview({
      artwork: {
        feedUrl: "https://example.com/feed.png",
        storyUrl: null,
      },
      captions: [
        { platform: "facebook", text: "Hello" },
        { platform: "instagram", text: "Hello" },
      ],
      generationStatus: "generated",
      status: "ready",
      approvalStatuses: [
        {
          role: "creator",
          label: "Creator",
          status: "pending",
          timestamp: null,
        },
      ],
    });

    const status = resolveMilestoneGenerationStatus(preview);
    assert.equal(status, "awaiting_approval");
    assert.equal(MILESTONE_STATUS_LABELS[status], "Needs approval");
  });
});
