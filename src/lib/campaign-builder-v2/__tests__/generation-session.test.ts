import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { applyGenerationResultsToSession } from "../generation-session.ts";
import type { CampaignBuilderSession } from "../types.ts";

function emptySession(): CampaignBuilderSession {
  return {
    eventId: "evt-1",
    currentStep: "preview",
    selectedMilestoneId: "m1",
    inspiration: {
      campaignId: "evt-1",
      campaignName: "Fair",
      eventDate: "2026-08-17",
      playbookId: "school-6-week",
      inspirationImages: [],
      inspirationOverallComment: "",
      brandKitId: null,
      voiceTone: "",
      voiceToneValues: [],
      globalAiGuidance: "",
      selectedLogoId: null,
      includeLogoInArtwork: false,
      includeLogoInArtworkUserSet: true,
      uploadedLogoUrl: null,
      uploadedLogoLabel: null,
      colorMode: "none",
      useSchoolColors: false,
      primarySchoolColor: null,
      secondarySchoolColor: null,
      customPaletteColors: [],
    },
    milestones: [],
    previewContents: [
      {
        milestoneId: "m1",
        status: "draft",
        generationStatus: "generating",
        generationStartedAt: "2026-07-17T23:50:00.000Z",
        artwork: { feedUrl: null, storyUrl: null },
        captions: [{ platform: "facebook", text: "" }],
        enabledFormats: ["instagram-feed"],
        deliveryMethod: "auto-publish",
        scheduleDate: "2026-08-01",
        scheduleTime: "09:00",
        emailSendDate: "2026-08-01",
        emailSendTime: "09:00",
        manualEmailTo: "",
        manualUploadLink: "",
        approvalStatuses: [],
      },
    ],
  };
}

describe("applyGenerationResultsToSession", () => {
  it("writes artwork URLs and clears generating state for the target milestone", () => {
    const next = applyGenerationResultsToSession(emptySession(), [
      {
        milestoneId: "m1",
        artwork: {
          feedUrl: "https://cdn.example/feed.png",
          storyUrl: null,
        },
        captions: [{ platform: "facebook", text: "Join us!" }],
        status: "ready",
        generationStatus: "generated",
      },
    ]);

    const preview = next.previewContents[0]!;
    assert.equal(preview.artwork.feedUrl, "https://cdn.example/feed.png");
    assert.equal(preview.captions[0]?.text, "Join us!");
    assert.equal(preview.generationStatus, "generated");
    assert.equal(preview.generationStartedAt, null);
    assert.equal(preview.status, "ready");
  });
});
