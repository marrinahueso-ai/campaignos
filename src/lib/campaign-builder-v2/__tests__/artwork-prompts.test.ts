import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildCampaignBuilderArtworkPrompt } from "../artwork-prompts.ts";
import type {
  CampaignBuilderInspiration,
  CampaignBuilderMilestone,
} from "../types.ts";

const baseInspiration: CampaignBuilderInspiration = {
  campaignId: "evt-1",
  campaignName: "Fall Festival",
  eventDate: "2026-10-10",
  playbookId: "school-6-week",
  inspirationImages: [],
  inspirationOverallComment: "",
  brandKitId: "none",
  voiceTone: "",
  voiceToneValues: [],
  globalAiGuidance: "",
  selectedLogoId: null,
  includeLogoInArtwork: false,
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
  suggestedDate: "2026-09-01",
  platforms: ["facebook", "instagram"],
  platformFormats: ["facebook-feed", "instagram-feed"],
  artworkNotes: "",
  captionNotes: "",
  statusTag: "not-started",
  sortOrder: 0,
};

function buildPrompt(
  overrides: {
    inspiration?: Partial<CampaignBuilderInspiration>;
    milestone?: Partial<CampaignBuilderMilestone>;
    hasInspirationImages?: boolean;
    hasAttachedLogo?: boolean;
    extraInstructions?: string | null;
    styleStrength?: number;
  } = {},
) {
  return buildCampaignBuilderArtworkPrompt({
    inspiration: { ...baseInspiration, ...overrides.inspiration },
    milestone: { ...baseMilestone, ...overrides.milestone },
    view: "feed",
    brandGuidance: null,
    hasInspirationImages: overrides.hasInspirationImages ?? false,
    storyFromFeed: false,
    hasAttachedLogo: overrides.hasAttachedLogo ?? false,
    extraInstructions: overrides.extraInstructions,
    styleStrength: overrides.styleStrength,
  });
}

describe("buildCampaignBuilderArtworkPrompt", () => {
  it("includes Overall inspiration comment as Inspiration notes", () => {
    const prompt = buildPrompt({
      inspiration: {
        inspirationOverallComment: "Bright playground energy, soft pastels",
      },
    });
    assert.match(
      prompt,
      /Inspiration notes \(interpret — do not paste on graphic\): Bright playground energy, soft pastels/,
    );
  });

  it("includes per-image comments when inspiration images are attached", () => {
    const prompt = buildPrompt({
      hasInspirationImages: true,
      inspiration: {
        inspirationImages: [
          {
            id: "img-1",
            label: "poster",
            url: "https://example.com/a.png",
            comment: "Keep the sunset gradient",
          },
          {
            id: "img-2",
            label: "flyer",
            url: "https://example.com/b.png",
            comment: "Bold headline treatment",
          },
        ],
      },
    });
    assert.match(prompt, /Per-image inspiration notes/);
    assert.match(prompt, /Image 1 \(poster\): Keep the sunset gradient/);
    assert.match(prompt, /Image 2 \(flyer\): Bold headline treatment/);
  });

  it("does not require or surface legacy globalAiGuidance (Notes to AI)", () => {
    const prompt = buildPrompt({
      inspiration: {
        inspirationOverallComment: "Warm community fair look",
        globalAiGuidance: "LEGACY_NOTES_TO_AI_SHOULD_NOT_APPEAR",
      },
    });
    assert.match(prompt, /Warm community fair look/);
    assert.doesNotMatch(prompt, /LEGACY_NOTES_TO_AI_SHOULD_NOT_APPEAR/);
    assert.doesNotMatch(prompt, /Global creative direction/);
  });

  it("includes voice / tone when set", () => {
    const prompt = buildPrompt({
      inspiration: {
        voiceTone: "Friendly, Playful",
        voiceToneValues: ["Friendly", "Playful"],
      },
    });
    assert.match(prompt, /Voice \/ tone: Friendly, Playful/);
  });

  it("includes organization palette color lines", () => {
    const prompt = buildPrompt({
      inspiration: {
        colorMode: "organization_palette",
        useSchoolColors: true,
        primarySchoolColor: "#1e3a5f",
        secondarySchoolColor: "#c4a35a",
      },
    });
    assert.match(prompt, /Primary organization color: #1e3a5f/);
    assert.match(prompt, /Secondary organization color: #c4a35a/);
  });

  it("includes inspiration palette and custom palette lines", () => {
    const inspirationPalette = buildPrompt({
      hasInspirationImages: true,
      inspiration: { colorMode: "inspiration_palette" },
    });
    assert.match(
      inspirationPalette,
      /Color palette: derive colors from the attached inspiration images/,
    );

    const customPalette = buildPrompt({
      inspiration: {
        colorMode: "custom_palette",
        customPaletteColors: ["#ff00aa", "#00aaff"],
      },
    });
    assert.match(customPalette, /Custom palette colors: #ff00aa, #00aaff/);
  });

  it("includes logo line only when logo is enabled and attached", () => {
    const withLogo = buildPrompt({
      hasAttachedLogo: true,
      inspiration: {
        includeLogoInArtwork: true,
        selectedLogoId: "logo-1",
      },
    });
    assert.match(
      withLogo,
      /Include the attached logo image as a visual brand element/,
    );

    const withoutAttach = buildPrompt({
      hasAttachedLogo: false,
      inspiration: {
        includeLogoInArtwork: true,
        selectedLogoId: "logo-1",
      },
    });
    assert.doesNotMatch(
      withoutAttach,
      /Include the attached logo image as a visual brand element/,
    );
  });

  it("includes artwork notes and Edit Artwork extra instructions", () => {
    const prompt = buildPrompt({
      milestone: { artworkNotes: "Add confetti accents" },
      extraInstructions: "Make the headline larger",
    });
    assert.match(prompt, /Artwork direction from the user/);
    assert.match(prompt, /Add confetti accents/);
    assert.match(prompt, /Make the headline larger/);
  });

  it("includes style strength guidance on regenerate", () => {
    const loose = buildPrompt({ styleStrength: 20 });
    assert.match(loose, /Take more creative liberty/);

    const tight = buildPrompt({ styleStrength: 80 });
    assert.match(tight, /Stay very close to the reference style/);
  });

  it("includes brand kit guidance block when provided", () => {
    const prompt = buildCampaignBuilderArtworkPrompt({
      inspiration: baseInspiration,
      milestone: baseMilestone,
      view: "feed",
      brandGuidance:
        "Color — Primary: #0F766E\nColor — Accent: #22C55E\nMascot: Globe",
      hasInspirationImages: false,
      storyFromFeed: false,
    });
    assert.match(prompt, /Brand kit \(colors, fonts, voice/);
    assert.match(prompt, /Color — Primary: #0F766E/);
    assert.match(prompt, /Mascot: Globe/);
  });
});
