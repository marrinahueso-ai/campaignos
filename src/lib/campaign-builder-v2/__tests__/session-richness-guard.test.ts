import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { protectSessionFromRichnessDowngrade } from "../normalize-session.ts";
import type {
  CampaignBuilderSession,
  MilestonePreviewContent,
} from "../types.ts";

function preview(
  overrides: Partial<MilestonePreviewContent> = {},
): MilestonePreviewContent {
  return {
    milestoneId: "ms-1",
    status: "draft",
    generationStatus: "ready_to_generate",
    generationStartedAt: null,
    artwork: { feedUrl: null, storyUrl: null },
    captions: [
      { platform: "facebook", text: "" },
      { platform: "instagram", text: "" },
    ],
    enabledFormats: ["facebook-feed", "facebook-story"],
    deliveryMethod: "auto-publish",
    scheduleDate: "2026-08-01",
    scheduleTime: "09:00",
    emailSendDate: "2026-08-01",
    emailSendTime: "09:00",
    manualEmailTo: "",
    manualUploadLink: "",
    approvalStatuses: [],
    ...overrides,
  };
}

function session(
  previewContents: MilestonePreviewContent[],
): CampaignBuilderSession {
  return {
    eventId: "evt-1",
    currentStep: "preview",
    previewTab: "all",
    selectedMilestoneId: "ms-1",
    inspiration: {
      campaignName: "Test",
      eventDate: "2026-08-14",
      playbookId: null,
      brandKitId: null,
      voiceToneId: null,
      globalAiGuidance: "",
      primarySchoolColor: null,
      secondarySchoolColor: null,
      inspirationImages: [],
    },
    milestones: [
      {
        id: "ms-1",
        name: "Announcement",
        purpose: "Announce",
        sortOrder: 0,
        category: "pre_event",
        suggestedDate: "2026-08-01",
        platforms: ["facebook", "instagram"],
        platformFormats: ["facebook-feed", "facebook-story"],
        statusTag: "not-started",
        artworkNotes: "",
        creativeOverrides: null,
      },
    ],
    milestonesPlaybookId: null,
    previewContents,
    expandedReviewMilestoneIds: [],
  };
}

describe("protectSessionFromRichnessDowngrade", () => {
  it("keeps server artwork when incoming client snapshot is empty/failed", () => {
    const existing = session([
      preview({
        status: "ready",
        generationStatus: "awaiting_approval",
        artwork: {
          feedUrl: "https://example.com/feed.png",
          storyUrl: "https://example.com/story.png",
        },
        captions: [
          { platform: "facebook", text: "Join us" },
          { platform: "instagram", text: "Join us" },
        ],
      }),
    ]);
    const incoming = session([
      preview({
        generationStatus: "failed",
        artwork: { feedUrl: null, storyUrl: null },
      }),
    ]);

    const protectedSession = protectSessionFromRichnessDowngrade(
      incoming,
      existing,
    );

    assert.equal(
      protectedSession.previewContents[0]?.artwork.feedUrl,
      "https://example.com/feed.png",
    );
    assert.match(
      protectedSession.previewContents[0]?.captions[0]?.text ?? "",
      /Join us/,
    );
  });

  it("allows a richer incoming snapshot to replace an empty server row", () => {
    const existing = session([preview()]);
    const incoming = session([
      preview({
        artwork: { feedUrl: "https://example.com/new.png", storyUrl: null },
        captions: [
          { platform: "facebook", text: "New" },
          { platform: "instagram", text: "New" },
        ],
      }),
    ]);

    const protectedSession = protectSessionFromRichnessDowngrade(
      incoming,
      existing,
    );

    assert.equal(
      protectedSession.previewContents[0]?.artwork.feedUrl,
      "https://example.com/new.png",
    );
  });
});
