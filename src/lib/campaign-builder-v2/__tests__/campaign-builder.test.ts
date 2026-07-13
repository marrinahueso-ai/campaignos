import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { playbookRelativeDay } from "../campaign-timing.ts";
import {
  hydrateCampaignBuilderSession,
  mergeCampaignBuilderSessions,
  normalizeCampaignBuilderSession,
} from "../normalize-session.ts";
import { buildDefaultSession, localSessionKey } from "../seed-data.ts";
import { toCreativeConfiguration } from "../creative-config.ts";
import {
  isStaleSeedNote,
  sanitizeGlobalAiGuidance,
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
  resolveSingleGenerationTarget,
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
  inspirationOverallComment: "",
  brandKitId: "ees-pto",
  voiceTone: "Friendly, Exciting, Welcoming",
  voiceToneValues: ["Friendly", "Exciting", "Welcoming"],
  globalAiGuidance: "Vintage school look",
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

describe("resolveSingleGenerationTarget", () => {
  const milestones: CampaignBuilderMilestone[] = [
    baseMilestone,
    { ...baseMilestone, id: "ms-2", name: "Reminder", sortOrder: 1 },
    { ...baseMilestone, id: "ms-3", name: "Recap", sortOrder: 2 },
  ];

  it("resolves exactly one milestone that belongs to the campaign", () => {
    const result = resolveSingleGenerationTarget({
      milestones,
      milestoneIds: ["ms-2"],
    });
    assert.equal(result.error, null);
    assert.equal(result.milestone?.id, "ms-2");
  });

  it("rejects zero milestone ids — must never fall back to generating everything", () => {
    const result = resolveSingleGenerationTarget({
      milestones,
      milestoneIds: [],
    });
    assert.equal(result.milestone, null);
    assert.match(result.error ?? "", /exactly one milestone/i);
  });

  it("rejects more than one milestone id — must never fan out to multiple milestones", () => {
    const result = resolveSingleGenerationTarget({
      milestones,
      milestoneIds: ["ms-1", "ms-2"],
    });
    assert.equal(result.milestone, null);
    assert.match(result.error ?? "", /exactly one milestone/i);
  });

  it("rejects a milestone id that does not belong to this campaign's milestone list", () => {
    const result = resolveSingleGenerationTarget({
      milestones,
      milestoneIds: ["ms-from-another-campaign"],
    });
    assert.equal(result.milestone, null);
    assert.match(result.error ?? "", /does not belong/i);
  });

  it("rejects undefined milestone ids", () => {
    const result = resolveSingleGenerationTarget({
      milestones,
      milestoneIds: undefined,
    });
    assert.equal(result.milestone, null);
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

  it("never auto-fills a brand-new campaign's milestone notes or AI guidance with seed/demo text", () => {
    // Reproduces Bug 3: a brand-new event (no saved session) previously
    // bypassed normalization entirely (page.tsx used buildDefaultSession()
    // directly), so hardcoded example copy like "Bold headline, vintage
    // school poster style" and the canned global AI guidance paragraph
    // landed in real form fields — and in real generation prompts — before
    // the user ever typed anything.
    const normalized = normalizeCampaignBuilderSession(
      {},
      "evt-1",
      "Back to School Fair",
      "2026-08-17",
    );

    assert.equal(normalized.inspiration.globalAiGuidance, "");
    assert.equal(normalized.inspiration.colorMode, "none");
    assert.equal(normalized.inspiration.voiceTone, "");
    assert.deepEqual(normalized.inspiration.voiceToneValues, []);
    assert.equal(normalized.inspiration.includeLogoInArtwork, false);
    assert.equal(normalized.inspiration.selectedLogoId, null);
    assert.equal(normalized.inspiration.useSchoolColors, false);
    for (const milestone of normalized.milestones) {
      assert.equal(
        milestone.artworkNotes,
        "",
        `expected empty artworkNotes for ${milestone.name}`,
      );
      assert.equal(
        milestone.captionNotes,
        "",
        `expected empty captionNotes for ${milestone.name}`,
      );
    }
  });

  it("sanitizes a legacy saved session that still carries the demo global AI guidance", () => {
    const normalized = normalizeCampaignBuilderSession(
      {
        inspiration: {
          globalAiGuidance:
            "Vintage school look. Cream background. Navy and green are our primary colors. Include playful school elements like pencils, apples, and chalkboard textures. Keep text readable and welcoming for families.",
        },
      },
      "evt-1",
      "Back to School Fair",
      "2026-08-17",
    );
    assert.equal(normalized.inspiration.globalAiGuidance, "");
  });

  it("preserves real user-authored global AI guidance", () => {
    const normalized = normalizeCampaignBuilderSession(
      {
        inspiration: {
          globalAiGuidance: "Use our maroon and gold colors with a retro font.",
        },
      },
      "evt-1",
      "Back to School Fair",
      "2026-08-17",
    );
    assert.equal(
      normalized.inspiration.globalAiGuidance,
      "Use our maroon and gold colors with a retro font.",
    );
  });
});

describe("sanitizeGlobalAiGuidance", () => {
  it("strips the known demo guidance paragraph", () => {
    assert.equal(
      sanitizeGlobalAiGuidance(
        "Vintage school look. Cream background. Navy and green are our primary colors. Include playful school elements like pencils, apples, and chalkboard textures. Keep text readable and welcoming for families.",
      ),
      "",
    );
  });

  it("preserves real user guidance", () => {
    assert.equal(
      sanitizeGlobalAiGuidance("Bright colors, modern sans-serif fonts."),
      "Bright colors, modern sans-serif fonts.",
    );
  });

  it("treats empty/whitespace as empty", () => {
    assert.equal(sanitizeGlobalAiGuidance("   "), "");
    assert.equal(sanitizeGlobalAiGuidance(null), "");
    assert.equal(sanitizeGlobalAiGuidance(undefined), "");
  });
});

describe("localSessionKey — per-campaign isolation", () => {
  it("keys local storage by eventId so two campaigns never share a slot", () => {
    const keyA = localSessionKey("event-aaa");
    const keyB = localSessionKey("event-bbb");
    assert.notEqual(keyA, keyB);
    assert.match(keyA, /event-aaa$/);
    assert.match(keyB, /event-bbb$/);
  });
});

describe("hydrateCampaignBuilderSession — persistence, reload, and isolation", () => {
  it("save + reload survives explicit None, comments, custom colors, tone, and empty notes", () => {
    const saved = normalizeCampaignBuilderSession(
      {
        inspiration: {
          inspirationImages: [
            { id: "img-1", label: "poster", url: "https://x/a.png", comment: "Keep the sunset colors" },
          ],
          inspirationOverallComment: "Bright and playful",
          selectedLogoId: null,
          includeLogoInArtwork: false,
          includeLogoInArtworkUserSet: true,
          colorMode: "custom_palette",
          customPaletteColors: ["#ff00aa", "#00aaff"],
          voiceToneValues: [],
          voiceTone: "",
          globalAiGuidance: "",
        },
      },
      "evt-reload",
      "Fall Festival",
      "2026-10-10",
    );

    // Simulate a page reload: re-hydrate the exact same saved shape again.
    const reloaded = hydrateCampaignBuilderSession(
      saved,
      null,
      "evt-reload",
      "Fall Festival",
      "2026-10-10",
      true,
    );

    assert.equal(
      reloaded.inspiration.inspirationImages[0]?.comment,
      "Keep the sunset colors",
    );
    assert.equal(reloaded.inspiration.inspirationOverallComment, "Bright and playful");
    assert.equal(reloaded.inspiration.includeLogoInArtwork, false);
    assert.equal(reloaded.inspiration.selectedLogoId, null);
    assert.equal(reloaded.inspiration.colorMode, "custom_palette");
    assert.deepEqual(reloaded.inspiration.customPaletteColors, ["#ff00aa", "#00aaff"]);
    assert.deepEqual(reloaded.inspiration.voiceToneValues, []);
    assert.equal(reloaded.inspiration.globalAiGuidance, "");

    const config = toCreativeConfiguration(reloaded.inspiration);
    assert.equal(config.logo.enabled, false);
    assert.equal(config.voiceTone.enabled, false);
    assert.equal(config.notesToAI, null);
  });

  it("two campaigns never leak inspiration/logo/color selections into each other", () => {
    const campaignA = normalizeCampaignBuilderSession(
      {
        inspiration: {
          selectedLogoId: "logo-a",
          includeLogoInArtwork: true,
          includeLogoInArtworkUserSet: true,
          colorMode: "organization_palette",
        },
      },
      "evt-a",
      "Campaign A",
      "2026-09-01",
    );
    const campaignB = normalizeCampaignBuilderSession(
      {},
      "evt-b",
      "Campaign B",
      "2026-09-15",
    );

    assert.equal(campaignA.inspiration.includeLogoInArtwork, true);
    assert.equal(campaignB.inspiration.includeLogoInArtwork, false);
    assert.equal(campaignB.inspiration.selectedLogoId, null);
    assert.equal(campaignB.inspiration.colorMode, "none");
    assert.notEqual(campaignA.eventId, campaignB.eventId);
  });

  it("falls back to the local copy (not seed defaults) when the server read fails, so a failed read never resurrects deleted milestones", () => {
    const defaults = buildDefaultSession("evt-1", "Back to School Fair", "2026-08-17");
    const localOnly = {
      ...defaults,
      milestones: defaults.milestones.slice(0, 2),
      previewContents: defaults.previewContents.slice(0, 2),
    };

    // base === {} simulates a failed/empty server read (serverLoadSucceeded=false).
    const hydrated = hydrateCampaignBuilderSession(
      {},
      localOnly,
      "evt-1",
      "Back to School Fair",
      "2026-08-17",
      false,
    );

    assert.equal(hydrated.milestones.length, 2);
  });

  it("trusts the server copy over local when the server read succeeded", () => {
    const defaults = buildDefaultSession("evt-1", "Back to School Fair", "2026-08-17");
    const serverCopy = {
      ...defaults,
      milestones: defaults.milestones.slice(0, 3),
      previewContents: defaults.previewContents.slice(0, 3),
    };
    const staleLocal = {
      ...defaults,
      milestones: defaults.milestones.slice(0, 1),
      previewContents: defaults.previewContents.slice(0, 1),
    };

    const hydrated = hydrateCampaignBuilderSession(
      serverCopy,
      staleLocal,
      "evt-1",
      "Back to School Fair",
      "2026-08-17",
      true,
    );

    assert.equal(hydrated.milestones.length, 3);
  });

  it("legacy campaign migration: a saved session predating Creative Setup fields normalizes to explicit None, not invented defaults", () => {
    const legacyRaw = {
      inspiration: {
        campaignId: "evt-legacy",
        campaignName: "Legacy Campaign",
        eventDate: "2026-08-17",
        playbookId: "school-6-week",
        inspirationImages: [],
        brandKitId: "ees-pto",
        // Legacy shape: only the old single checkbox + string tone existed.
        useSchoolColors: true,
        voiceTone: "Friendly, Exciting, Welcoming",
      },
    };

    const migrated = normalizeCampaignBuilderSession(
      legacyRaw,
      "evt-legacy",
      "Legacy Campaign",
      "2026-08-17",
    );

    assert.equal(migrated.inspiration.colorMode, "none");
    assert.equal(migrated.inspiration.useSchoolColors, false);
    assert.deepEqual(migrated.inspiration.voiceToneValues, []);
    const config = toCreativeConfiguration(migrated.inspiration);
    assert.equal(config.colors.mode, "none");
    assert.equal(config.voiceTone.enabled, false);
  });
});

describe("mergeCampaignBuilderSessions", () => {
  it("prefers the richer (artwork-bearing) preview content between two copies", () => {
    const defaults = buildDefaultSession("evt-1", "Back to School Fair", "2026-08-17");
    const withArtwork = {
      ...defaults,
      previewContents: defaults.previewContents.map((content, index) =>
        index === 0
          ? { ...content, artwork: { feedUrl: "https://x/feed.png", storyUrl: null } }
          : content,
      ),
    };
    const withoutArtwork = defaults;

    const merged = mergeCampaignBuilderSessions(withoutArtwork, withArtwork);
    assert.equal(merged.previewContents?.[0]?.artwork.feedUrl, "https://x/feed.png");
  });

  it("keeps local playbook milestones + artwork when server list has different ids", () => {
    const server = buildDefaultSession("evt-2", "Back to School Fair", "2026-08-17");
    const localMilestone = {
      ...server.milestones[0],
      id: "playbook-14-days",
      name: "14 Days Out",
      sortOrder: 0,
    };
    const local = {
      ...server,
      milestones: [localMilestone],
      milestonesPlaybookId: "pb-back-to-school",
      previewContents: [
        {
          ...server.previewContents[0],
          milestoneId: "playbook-14-days",
          generationStatus: "generated" as const,
          artwork: { feedUrl: "https://x/14-days.png", storyUrl: null },
          captions: [
            { platform: "facebook" as const, text: "See you at the fair!" },
            { platform: "instagram" as const, text: "See you at the fair!" },
          ],
        },
      ],
    };

    // Server is primary (restoredFromServer=true hydrate path) but stale.
    const merged = mergeCampaignBuilderSessions(server, local);
    assert.equal(merged.milestones?.length, 1);
    assert.equal(merged.milestones?.[0]?.id, "playbook-14-days");
    assert.equal(merged.previewContents?.[0]?.artwork.feedUrl, "https://x/14-days.png");
    assert.equal(merged.milestonesPlaybookId, "pb-back-to-school");
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
