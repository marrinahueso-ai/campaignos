import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { playbookRelativeDay } from "../campaign-timing.ts";
import {
  CAMPAIGN_BUILDER_ON_GRAPHIC_TEXT_RULES,
  CAMPAIGN_BUILDER_MILESTONE_LABEL_RULES,
  CAMPAIGN_BUILDER_ANTI_HALLUCINATION_RULES,
} from "../prompt-guardrails.ts";
import { syncCaptionsToPlatforms, getSharedCaptionText } from "../caption-utils.ts";
import { mergeInspirationImageUrls } from "../inspiration-utils.ts";
import { isNoBrandKit, brandKitIdForAi, NO_BRAND_KIT_ID } from "../brand-kit.ts";
import {
  formatValidationErrors,
  validateBeforeGeneration,
  validateInspirationForGeneration,
  validateMilestonesForGeneration,
} from "../validation.ts";
import type {
  CampaignBuilderInspiration,
  CampaignBuilderMilestone,
} from "../types.ts";

const baseInspiration: CampaignBuilderInspiration = {
  campaignId: "evt-1",
  campaignName: "Back to School Fair",
  eventDate: "2026-08-17",
  playbookId: "school-6-week",
  inspirationImages: [],
  brandKitId: "ees-pto",
  voiceTone: "Friendly, Exciting, Welcoming",
  globalAiGuidance: "Vintage school look",
  selectedLogoId: null,
  includeLogoInArtwork: false,
  useSchoolColors: false,
  primarySchoolColor: null,
  secondarySchoolColor: null,
};

const baseMilestone: CampaignBuilderMilestone = {
  id: "ms-1",
  name: "Save the Date",
  category: "awareness",
  purpose: "Announce the event",
  suggestedDate: "2026-07-06",
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

describe("campaign timing", () => {
  it("uses playbook convention (negative = before event)", () => {
    assert.equal(
      playbookRelativeDay("2026-08-17", "2026-07-06"),
      -42,
    );
    assert.equal(
      playbookRelativeDay("2026-08-17", "2026-08-03"),
      -14,
    );
  });
});

describe("prompt guardrails for artwork generation", () => {
  it("forbids scheduled post dates on artwork", () => {
    assert.match(
      CAMPAIGN_BUILDER_ON_GRAPHIC_TEXT_RULES,
      /Never render scheduled post dates/,
    );
    assert.match(
      CAMPAIGN_BUILDER_ON_GRAPHIC_TEXT_RULES,
      /never the internal post or milestone schedule date/,
    );
    assert.match(
      CAMPAIGN_BUILDER_ON_GRAPHIC_TEXT_RULES,
      /Milestone:, Post date:, or Suggested date:/,
    );
  });

  it("forbids reminder milestone copy on artwork", () => {
    assert.match(
      CAMPAIGN_BUILDER_MILESTONE_LABEL_RULES,
      /Never use the words reminder, two-week reminder, or milestone on the graphic/,
    );
  });

  it("forbids organization names unless user asks", () => {
    assert.match(
      CAMPAIGN_BUILDER_ANTI_HALLUCINATION_RULES,
      /Do not use the school, PTO, organization, or campaign name as on-graphic text/,
    );
  });
});
