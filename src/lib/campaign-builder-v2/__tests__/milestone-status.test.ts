import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  allMilestonesGenerated,
  canResendMilestoneForApproval,
  countCompleteMilestones,
  derivedPreviewStatus,
  findNextMilestoneToGenerate,
  inferGenerationStatus,
  isMilestoneContentComplete,
  isMilestoneEligibleForApprovalSubmit,
  milestoneHasArtwork,
  milestoneHasPartialContent,
  MILESTONE_STATUS_LABELS,
  preserveApprovalWorkflowStatus,
  previewAfterResendForApproval,
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
    approvalStatuses: [
      {
        role: "creator",
        label: "Creator",
        status: "not-started",
        timestamp: null,
      },
    ],
    ...overrides,
  };
}

function completeFeedPreview(
  overrides: Partial<MilestonePreviewContent> = {},
): MilestonePreviewContent {
  return buildPreview({
    artwork: {
      feedUrl: "https://example.com/feed.png",
      storyUrl: null,
    },
    captions: [
      { platform: "facebook", text: "Hello" },
      { platform: "instagram", text: "Hello" },
    ],
    enabledFormats: ["facebook-feed", "instagram-feed"],
    status: "ready",
    generationStatus: "generated",
    ...overrides,
  });
}

describe("milestone-status", () => {
  it("detects ready_to_generate when no content exists", () => {
    const preview = buildPreview();
    assert.equal(
      inferGenerationStatus(preview, preview.enabledFormats),
      "ready_to_generate",
    );
    assert.equal(isMilestoneContentComplete(preview, preview.enabledFormats), false);
    assert.equal(MILESTONE_STATUS_LABELS.ready_to_generate, "Not started");
  });

  it("marks artwork-only as In progress, not Complete", () => {
    const preview = buildPreview({
      artwork: {
        feedUrl: "https://example.com/feed.png",
        storyUrl: null,
      },
      captions: [
        { platform: "facebook", text: "" },
        { platform: "instagram", text: "" },
      ],
    });
    assert.equal(milestoneHasPartialContent(preview), true);
    assert.equal(isMilestoneContentComplete(preview, preview.enabledFormats), false);
    assert.equal(
      inferGenerationStatus(preview, preview.enabledFormats),
      "needs_review",
    );
    assert.equal(MILESTONE_STATUS_LABELS.needs_review, "In progress");
  });

  it("treats a shared caption on one platform as complete for Facebook and Instagram", () => {
    const preview = buildPreview({
      artwork: {
        feedUrl: "https://example.com/feed.png",
        storyUrl: "https://example.com/story.png",
      },
      captions: [{ platform: "facebook", text: "Shared caption" }],
      enabledFormats: [
        "facebook-feed",
        "instagram-feed",
        "instagram-story-manual",
      ],
    });
    assert.equal(milestoneHasPartialContent(preview), true);
    assert.equal(isMilestoneContentComplete(preview, preview.enabledFormats), true);
    assert.equal(
      inferGenerationStatus(preview, preview.enabledFormats),
      "generated",
    );

    const withBoth = buildPreview({
      ...preview,
      captions: [
        { platform: "facebook", text: "Shared" },
        { platform: "instagram", text: "Shared" },
      ],
    });
    assert.equal(
      isMilestoneContentComplete(withBoth, withBoth.enabledFormats),
      true,
    );
  });

  it("marks captions-only as In progress, not Complete", () => {
    const preview = buildPreview({
      captions: [
        { platform: "facebook", text: "Caption only" },
        { platform: "instagram", text: "Caption only" },
      ],
    });
    assert.equal(
      inferGenerationStatus(preview, preview.enabledFormats),
      "needs_review",
    );
    assert.equal(isMilestoneContentComplete(preview, preview.enabledFormats), false);
  });

  it("marks feed-only incomplete when story is also required", () => {
    const preview = buildPreview({
      artwork: {
        feedUrl: "https://example.com/feed.png",
        storyUrl: null,
      },
      captions: [
        { platform: "facebook", text: "Hello" },
        { platform: "instagram", text: "Hello" },
      ],
      enabledFormats: [
        "facebook-feed",
        "facebook-story",
        "instagram-feed",
        "instagram-story",
      ],
    });
    assert.equal(isMilestoneContentComplete(preview, preview.enabledFormats), false);
    assert.equal(
      inferGenerationStatus(preview, preview.enabledFormats),
      "needs_review",
    );
  });

  it("detects generated only when all required artwork and captions exist", () => {
    const preview = completeFeedPreview();
    assert.equal(
      inferGenerationStatus(preview, preview.enabledFormats),
      "generated",
    );
    assert.equal(isMilestoneContentComplete(preview, preview.enabledFormats), true);
    assert.equal(milestoneHasArtwork(preview), true);
    assert.equal(MILESTONE_STATUS_LABELS.generated, "Complete");
  });

  it("ignores placeholder artwork URLs", () => {
    const preview = buildPreview({
      artwork: {
        feedUrl: "/api/placeholder-artwork",
        storyUrl: "https://placehold.co/600x600",
      },
    });
    assert.equal(
      inferGenerationStatus(preview, preview.enabledFormats),
      "ready_to_generate",
    );
    assert.equal(milestoneHasArtwork(preview), false);
  });

  it("treats empty enabled formats as incomplete", () => {
    const preview = buildPreview({
      artwork: {
        feedUrl: "https://example.com/feed.png",
        storyUrl: "https://example.com/story.png",
      },
      captions: [
        { platform: "facebook", text: "Hello" },
        { platform: "instagram", text: "Hello" },
      ],
      enabledFormats: [],
    });
    assert.equal(isMilestoneContentComplete(preview, preview.enabledFormats), false);
    assert.equal(
      inferGenerationStatus(preview, preview.enabledFormats),
      "needs_review",
    );
  });

  it("detects complete from legacy artwork slot keys after normalization", () => {
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
      captions: [
        { platform: "facebook", text: "Hello" },
        { platform: "instagram", text: "Hello" },
      ],
      enabledFormats: [
        "facebook-feed",
        "instagram-feed",
        "facebook-story",
        "instagram-story",
      ],
      status: "ready",
    });
    assert.equal(
      inferGenerationStatus(preview, preview.enabledFormats),
      "generated",
    );
    assert.equal(milestoneHasArtwork(preview), true);
  });

  it("finds next milestone to generate including partial In progress items", () => {
    const milestones: CampaignBuilderMilestone[] = [
      baseMilestone,
      { ...baseMilestone, id: "ms-2", name: "Reminder", sortOrder: 1 },
    ];
    const previewContents: MilestonePreviewContent[] = [
      completeFeedPreview({ milestoneId: "ms-1" }),
      buildPreview({
        milestoneId: "ms-2",
        artwork: {
          feedUrl: "https://example.com/partial.png",
          storyUrl: null,
        },
      }),
    ];

    const next = findNextMilestoneToGenerate(milestones, previewContents);
    assert.equal(next?.id, "ms-2");
    assert.equal(allMilestonesGenerated(milestones, previewContents), false);

    const progress = countCompleteMilestones(milestones, previewContents);
    assert.equal(progress.complete, 1);
    assert.equal(progress.total, 2);
  });

  it("derives ready from full content even when raw status says needs-review", () => {
    const preview = completeFeedPreview({
      artwork: {
        feedUrl: "https://example.com/feed.png",
        storyUrl: "https://example.com/story.png",
      },
      enabledFormats: [
        "facebook-feed",
        "facebook-story",
        "instagram-feed",
        "instagram-story",
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

  it("derives draft from empty content even when raw status is stale ready", () => {
    const preview = buildPreview({
      status: "ready",
      generationStatus: "ready_to_generate",
    });

    assert.equal(derivedPreviewStatus(preview), "draft");
  });

  it("derives needs-review tri-state for partial content", () => {
    const preview = buildPreview({
      captions: [
        { platform: "facebook", text: "Caption only" },
        { platform: "instagram", text: "Caption only" },
      ],
    });

    assert.equal(derivedPreviewStatus(preview), "needs-review");
  });

  it("reports all generated when every milestone is fully complete", () => {
    const milestones: CampaignBuilderMilestone[] = [baseMilestone];
    const previewContents: MilestonePreviewContent[] = [
      completeFeedPreview(),
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
    assert.equal(baseMilestone.statusTag, "not-started");

    const preview = completeFeedPreview({
      status: "needs-review",
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
    const preview = completeFeedPreview({
      generationStatus: "generated",
      approvalStatuses: [
        {
          role: "creator",
          label: "Creator",
          status: "not-started",
          timestamp: null,
        },
        {
          role: "committee-chair",
          label: "Committee Chair",
          status: "pending",
          timestamp: "2026-07-01T00:00:00.000Z",
        },
      ],
    });

    const status = resolveMilestoneGenerationStatus(preview);
    assert.equal(status, "awaiting_approval");
    assert.equal(MILESTONE_STATUS_LABELS[status], "Needs approval");
  });

  it("preserves awaiting_approval generationStatus after send for approval", () => {
    const preview = completeFeedPreview({
      generationStatus: "awaiting_approval",
      approvalStatuses: [
        {
          role: "committee-chair",
          label: "Committee Chair",
          status: "pending",
          timestamp: "2026-07-01T00:00:00.000Z",
        },
      ],
    });
    assert.equal(
      inferGenerationStatus(preview, preview.enabledFormats),
      "awaiting_approval",
    );
  });
});

describe("changes_requested resend eligibility", () => {
  it("allows resend for changes_requested and awaiting_approval with artwork", () => {
    const changesRequested = completeFeedPreview({
      generationStatus: "changes_requested",
      changeRequestComment: "Warm the colors",
    });
    const awaiting = completeFeedPreview({
      generationStatus: "awaiting_approval",
    });
    const ready = completeFeedPreview({
      generationStatus: "generated",
    });

    assert.equal(canResendMilestoneForApproval(changesRequested), true);
    assert.equal(canResendMilestoneForApproval(awaiting), true);
    assert.equal(canResendMilestoneForApproval(ready), false);
  });

  it("bulk submit includes changes_requested and ready, skips awaiting", () => {
    const changesRequested = completeFeedPreview({
      generationStatus: "changes_requested",
    });
    const awaiting = completeFeedPreview({
      generationStatus: "awaiting_approval",
    });
    const ready = completeFeedPreview({
      generationStatus: "generated",
      status: "ready",
    });

    assert.equal(isMilestoneEligibleForApprovalSubmit(changesRequested), true);
    assert.equal(isMilestoneEligibleForApprovalSubmit(awaiting), false);
    assert.equal(isMilestoneEligibleForApprovalSubmit(ready), true);
  });

  it("clears change-request comment after resend patch", () => {
    const preview = completeFeedPreview({
      generationStatus: "changes_requested",
      changeRequestComment: "Fix caption",
    });
    const next = previewAfterResendForApproval(preview, "2026-07-21T12:00:00.000Z");
    assert.equal(next.generationStatus, "awaiting_approval");
    assert.equal(next.changeRequestComment, null);
  });

  it("preserves changes_requested while editing caption/artwork content status", () => {
    assert.equal(
      preserveApprovalWorkflowStatus("changes_requested", "generated"),
      "changes_requested",
    );
    assert.equal(
      preserveApprovalWorkflowStatus("changes_requested", "needs_review"),
      "changes_requested",
    );
    assert.equal(
      preserveApprovalWorkflowStatus("changes_requested", "awaiting_approval"),
      "awaiting_approval",
    );
  });
});
