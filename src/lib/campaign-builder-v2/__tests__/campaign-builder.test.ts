import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  formatValidationErrors,
  validateBeforeGeneration,
  validateInspirationForGeneration,
  validateMilestonesForGeneration,
} from "../validation.ts";
import { syncCaptionsToPlatforms, getSharedCaptionText } from "../caption-utils.ts";
import { mergeInspirationImageUrls } from "../inspiration-utils.ts";
import { isNoBrandKit, brandKitIdForAi, NO_BRAND_KIT_ID } from "../brand-kit.ts";
import type {
  CampaignBuilderInspiration,
  CampaignBuilderMilestone,
} from "../types.ts";

const baseInspiration: CampaignBuilderInspiration = {
  campaignId: "evt-1",
  campaignName: "Back to School Fair",
  eventDate: "2026-08-15",
  playbookId: "school-6-week",
  inspirationImages: [],
  brandKitId: "ees-pto",
  voiceTone: "Friendly, Exciting, Welcoming",
  globalAiGuidance: "Vintage school look",
};

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

describe("validateInspirationForGeneration", () => {
  it("accepts complete inspiration", () => {
    const result = validateInspirationForGeneration(baseInspiration);
    assert.equal(result.valid, true);
    assert.equal(result.errors.length, 0);
  });

  it("rejects missing campaign name", () => {
    const result = validateInspirationForGeneration({
      ...baseInspiration,
      campaignName: "  ",
    });
    assert.equal(result.valid, false);
    assert.match(result.message ?? "", /campaign name/i);
  });

  it("rejects missing playbook", () => {
    const result = validateInspirationForGeneration({
      ...baseInspiration,
      playbookId: "",
    });
    assert.equal(result.valid, false);
    assert.match(result.message ?? "", /playbook/i);
  });
});

describe("validateMilestonesForGeneration", () => {
  it("rejects empty milestone list", () => {
    const result = validateMilestonesForGeneration([]);
    assert.equal(result.valid, false);
  });

  it("rejects milestones missing purpose", () => {
    const result = validateMilestonesForGeneration([
      { ...baseMilestone, purpose: "" },
    ]);
    assert.equal(result.valid, false);
    assert.match(result.message ?? "", /purpose/i);
  });
});

describe("validateBeforeGeneration", () => {
  it("validates only targeted milestones", () => {
    const result = validateBeforeGeneration({
      inspiration: baseInspiration,
      milestones: [
        baseMilestone,
        { ...baseMilestone, id: "ms-2", name: "", sortOrder: 1 },
      ],
      milestoneIds: ["ms-1"],
    });
    assert.equal(result.valid, true);
  });

  it("formats multiple errors", () => {
    const message = formatValidationErrors(["First issue.", "Second issue."]);
    assert.equal(message, "First issue. Second issue.");
  });
});

describe("caption-utils", () => {
  it("syncs shared caption across platforms", () => {
    const captions = syncCaptionsToPlatforms("Hello families!", [
      "facebook",
      "instagram",
    ]);
    assert.equal(captions.length, 2);
    assert.equal(captions[0]?.text, "Hello families!");
    assert.equal(captions[1]?.text, "Hello families!");
  });

  it("reads shared caption text", () => {
    const text = getSharedCaptionText([
      { platform: "facebook", text: "Shared copy" },
      { platform: "instagram", text: "Shared copy" },
    ]);
    assert.equal(text, "Shared copy");
  });
});

describe("brand-kit helpers", () => {
  it("treats none as no brand kit", () => {
    assert.equal(isNoBrandKit(NO_BRAND_KIT_ID), true);
    assert.equal(brandKitIdForAi(NO_BRAND_KIT_ID), null);
  });

  it("passes through real brand kit ids", () => {
    assert.equal(brandKitIdForAi("ees-pto"), "ees-pto");
  });
});

describe("mergeInspirationImageUrls", () => {
  it("prioritizes brand logos and caps at four images", () => {
    const merged = mergeInspirationImageUrls(
      ["insp-1", "insp-2", "insp-3", "insp-4"],
      ["logo-1", "logo-2"],
    );
    assert.deepEqual(merged, ["logo-1", "logo-2", "insp-1", "insp-2"]);
  });
});
