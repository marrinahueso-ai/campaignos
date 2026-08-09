import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildCampaignBuilderCaptionPrompts } from "../caption-prompts.ts";
import { CAMPAIGN_BUILDER_INTERPRET_DIRECTION_RULES } from "../prompt-guardrails.ts";
import { deriveAiInstructionsFromNote } from "../../approvals-revision/revision-notes.ts";
import type {
  CampaignBuilderInspiration,
  CampaignBuilderMilestone,
} from "../types.ts";

/**
 * Full prompt-builder coverage (needs path-alias resolution via tsx).
 * Run: npx tsx --test src/lib/campaign-builder-v2/__tests__/caption-prompts-revision.test.ts
 */

const baseInspiration: CampaignBuilderInspiration = {
  campaignId: "evt-1",
  campaignName: "Fall Festival",
  eventDate: "2026-10-10",
  playbookId: "school-6-week",
  inspirationImages: [],
  inspirationOverallComment: "",
  brandKitId: "none",
  voiceTone: "Friendly",
  voiceToneValues: ["Friendly"],
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

function buildPrompt(overrides: {
  milestone?: Partial<CampaignBuilderMilestone>;
  revisionInstructions?: string | null;
  existingCaption?: string | null;
} = {}) {
  return buildCampaignBuilderCaptionPrompts({
    inspiration: baseInspiration,
    milestone: { ...baseMilestone, ...overrides.milestone },
    platform: "facebook",
    revisionInstructions: overrides.revisionInstructions,
    existingCaption: overrides.existingCaption,
  });
}

describe("buildCampaignBuilderCaptionPrompts revision framing (tsx)", () => {
  it("marks regenerate notes as revision direction, not bare User instructions", () => {
    const { userPrompt } = buildPrompt({
      revisionInstructions: "Make it shorter and more excited",
      existingCaption: "Long calm caption about the fair.",
    });

    assert.match(userPrompt, /User revision direction:/);
    assert.match(userPrompt, /Make it shorter and more excited/);
    assert.match(userPrompt, /Do not quote, repeat, mention, or paste/);
    assert.doesNotMatch(userPrompt, /User instructions:/);
    assert.ok(userPrompt.includes(CAMPAIGN_BUILDER_INTERPRET_DIRECTION_RULES));
  });

  it("frames volunteer/content direction notes as non-literal", () => {
    const { userPrompt } = buildPrompt({
      revisionInstructions: "Say less about volunteers and emphasize Friday",
    });
    assert.match(userPrompt, /User revision direction:/);
    assert.match(userPrompt, /Say less about volunteers and emphasize Friday/);
    assert.match(userPrompt, /Do not paste user notes verbatim/);
  });

  it("dedupes identical milestone captionNotes and regenerate instructions", () => {
    const note = "Make it shorter and more excited";
    const { userPrompt } = buildPrompt({
      milestone: { captionNotes: note },
      revisionInstructions: note,
    });

    assert.doesNotMatch(
      userPrompt,
      /Milestone caption direction \(interpret intent — do not copy verbatim\):/,
    );
    assert.equal(userPrompt.match(/User revision direction:/g)?.length, 1);
    assert.equal(userPrompt.split(note).length - 1, 1);
  });

  it("keeps distinct captionNotes and regenerate instructions", () => {
    const { userPrompt } = buildPrompt({
      milestone: { captionNotes: "Mention the Friday ice cream social" },
      revisionInstructions: "Make it shorter and more excited",
    });

    assert.match(
      userPrompt,
      /Milestone caption direction \(interpret intent — do not copy verbatim\): Mention the Friday ice cream social/,
    );
    assert.match(userPrompt, /User revision direction:/);
    assert.match(userPrompt, /Make it shorter and more excited/);
  });

  it("treats Approvals Instruct AI notes as revision direction in the prompt", () => {
    const derived = deriveAiInstructionsFromNote(
      "Please make this warmer and remove the exclamation points",
    );
    const { userPrompt } = buildPrompt({
      revisionInstructions: derived,
      existingCaption: "Come join us!!!!!",
    });
    assert.match(userPrompt, /User revision direction:/);
    assert.match(userPrompt, /Do not quote, repeat, mention, or paste/);
    assert.match(userPrompt, /make this warmer and remove the exclamation points/i);
  });
});
