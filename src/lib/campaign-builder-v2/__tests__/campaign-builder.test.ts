import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { playbookRelativeDay } from "../campaign-timing.ts";
import { normalizeCampaignBuilderSession } from "../normalize-session.ts";
import { buildDefaultSession } from "../seed-data.ts";
import {
  isStaleSeedNote,
  sanitizeSeedNotes,
  sanitizeSeedPurpose,
} from "../stale-seed-migration.ts";
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

describe("stale seed migration", () => {
  it("detects volunteer sign-up caption notes", () => {
    assert.equal(isStaleSeedNote("Mention volunteer sign-up link"), true);
    assert.equal(sanitizeSeedNotes("Mention volunteer sign-up link"), "");
  });

  it("detects volunteer artwork notes", () => {
    assert.equal(isStaleSeedNote("Highlight volunteer CTA"), true);
    assert.equal(sanitizeSeedNotes("Highlight volunteer CTA"), "");
  });

  it("rewrites volunteer-heavy purpose lines", () => {
    const purpose = sanitizeSeedPurpose(
      "Remind families about the event and encourage volunteer sign-ups",
      "Two-Week Reminder",
    );
    assert.match(purpose, /excitement/i);
    assert.doesNotMatch(purpose, /volunteer/i);
  });

  it("preserves custom user notes", () => {
    assert.equal(sanitizeSeedNotes("Feature our carnival theme colors"), "Feature our carnival theme colors");
  });
});

describe("normalizeCampaignBuilderSession", () => {
  it("renames Two-Week Reminder and strips stale volunteer notes", () => {
    const defaults = buildDefaultSession("evt-1", "Back to School Fair", "2026-08-17");
    const normalized = normalizeCampaignBuilderSession(
      {
        milestones: defaults.milestones.map((milestone) =>
          milestone.id === "ms-two-week"
            ? {
                ...milestone,
                name: "Two-Week Reminder",
                captionNotes: "Mention volunteer sign-up link",
                artworkNotes: "Highlight volunteer CTA",
                purpose: "Remind families about the event and encourage volunteer sign-ups",
              }
            : milestone,
        ),
        previewContents: defaults.previewContents.map((preview) =>
          preview.milestoneId === "ms-two-week"
            ? {
                ...preview,
                captions: [
                  {
                    platform: "facebook",
                    text: "Volunteer spots are open — sign up today",
                  },
                  { platform: "instagram", text: "" },
                ],
              }
            : preview,
        ),
      },
      "evt-1",
      "Back to School Fair",
      "2026-08-17",
    );

    const twoWeek = normalized.milestones.find((m) => m.id === "ms-two-week");
    assert.equal(twoWeek?.name, "Two-Week Push");
    assert.equal(twoWeek?.captionNotes, "");
    assert.equal(twoWeek?.artworkNotes, "");
    assert.doesNotMatch(twoWeek?.purpose ?? "", /volunteer/i);

    const preview = normalized.previewContents.find(
      (content) => content.milestoneId === "ms-two-week",
    );
    assert.equal(preview?.captions[0]?.text, "");
  });

  it("resets auto-enabled logo inclusion unless user explicitly opted in", () => {
    const normalized = normalizeCampaignBuilderSession(
      {
        inspiration: {
          includeLogoInArtwork: true,
          selectedLogoId: "logo-1",
        },
      },
      "evt-1",
      "Back to School Fair",
      "2026-08-17",
    );
    assert.equal(normalized.inspiration.includeLogoInArtwork, false);

    const explicit = normalizeCampaignBuilderSession(
      {
        inspiration: {
          includeLogoInArtwork: true,
          includeLogoInArtworkUserSet: true,
          selectedLogoId: "logo-1",
        },
      },
      "evt-1",
      "Back to School Fair",
      "2026-08-17",
    );
    assert.equal(explicit.inspiration.includeLogoInArtwork, true);
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
