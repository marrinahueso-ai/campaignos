import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { computeStepperStates } from "../health.ts";
import { emptyMilestoneArtwork } from "../platform-utils.ts";
import type {
  CampaignBuilderInspiration,
  CampaignBuilderMilestone,
  MilestonePreviewContent,
} from "../types.ts";

const inspiration: CampaignBuilderInspiration = {
  campaignId: "evt-1",
  campaignName: "Back to School Fair",
  eventDate: "2026-08-17",
  playbookId: "school-6-week",
  inspirationImages: [],
  inspirationOverallComment: "",
  brandKitId: "ees-pto",
  voiceTone: "Friendly",
  voiceToneValues: ["Friendly"],
  globalAiGuidance: "",
  selectedLogoId: null,
  includeLogoInArtwork: false,
  uploadedLogoUrl: null,
  uploadedLogoLabel: null,
  colorMode: "none",
  customPaletteColors: [],
  useSchoolColors: false,
  primarySchoolColor: null,
  secondarySchoolColor: null,
};

const milestone: CampaignBuilderMilestone = {
  id: "ms-1",
  name: "Save the Date",
  category: "awareness",
  purpose: "Announce the event",
  suggestedDate: "2026-07-06",
  platforms: ["facebook", "instagram"],
  platformFormats: ["facebook-feed", "instagram-feed"],
  artworkNotes: "",
  captionNotes: "",
  statusTag: "ready",
  sortOrder: 0,
};

function readyPreview(): MilestonePreviewContent {
  return {
    milestoneId: "ms-1",
    status: "ready",
    generationStatus: "generated",
    generationStartedAt: null,
    artwork: {
      feedUrl: "https://example.com/feed.png",
      storyUrl: null,
    },
    captions: [
      { platform: "facebook", text: "See you at the fair!" },
      { platform: "instagram", text: "See you at the fair!" },
    ],
    enabledFormats: ["facebook-feed", "instagram-feed"],
    deliveryMethod: "auto-publish",
    scheduleDate: "2026-07-06",
    scheduleTime: "09:00",
    emailSendDate: "2026-07-06",
    emailSendTime: "09:00",
    manualEmailTo: "test@example.com",
    manualUploadLink: "",
    approvalStatuses: [
      {
        role: "admin",
        label: "Admin",
        status: "approved",
        timestamp: "2026-07-01T00:00:00.000Z",
      },
    ],
  };
}

describe("computeStepperStates", () => {
  it("marks completed steps as Complete even when the user is still on an earlier step", () => {
    const states = computeStepperStates(
      inspiration,
      [milestone],
      [readyPreview()],
      "inspiration",
    );

    assert.equal(states.inspiration.statusLabel, "Complete");
    assert.equal(states.milestones.statusLabel, "Complete");
    assert.equal(states.preview.statusLabel, "Complete");
    assert.equal(states.milestones.subtitle, "Complete");
    assert.equal(states.preview.subtitle, "Complete");
  });

  it("still shows Not started for incomplete future steps", () => {
    const states = computeStepperStates(
      inspiration,
      [milestone],
      [
        {
          ...readyPreview(),
          artwork: emptyMilestoneArtwork(),
          captions: [
            { platform: "facebook", text: "" },
            { platform: "instagram", text: "" },
          ],
          status: "draft",
          generationStatus: "ready_to_generate",
          approvalStatuses: [],
        },
      ],
      "inspiration",
    );

    assert.equal(states.preview.statusLabel, "Not started");
    assert.equal(states.preview.subtitle, "Not started");
  });
});
