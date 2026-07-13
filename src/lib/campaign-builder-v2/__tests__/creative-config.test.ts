import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  applyColorMode,
  clearAllCreativeSelections,
  migrateLegacyCreativeFields,
  normalizeCreativeSelections,
  normalizeMilestoneCreativeOverrides,
  resolveMilestoneInspiration,
  toCreativeConfiguration,
} from "../creative-config.ts";
import { buildDefaultInspiration } from "../seed-data.ts";
import type { CampaignBuilderInspiration } from "../types.ts";

function sampleInspiration(
  overrides: Partial<CampaignBuilderInspiration> = {},
): CampaignBuilderInspiration {
  return {
    ...buildDefaultInspiration("evt-1", "Spring Fair", "2026-05-01"),
    ...overrides,
  };
}

describe("creative setup None defaults", () => {
  it("starts new campaigns at explicit None for logo, colors, and tone", () => {
    const defaults = buildDefaultInspiration("evt-1", "Spring Fair", "2026-05-01");
    assert.equal(defaults.colorMode, "none");
    assert.equal(defaults.useSchoolColors, false);
    assert.equal(defaults.includeLogoInArtwork, false);
    assert.equal(defaults.selectedLogoId, null);
    assert.equal(defaults.voiceTone, "");
    assert.deepEqual(defaults.voiceToneValues, []);
    assert.equal(defaults.globalAiGuidance, "");
    assert.equal(defaults.inspirationImages.length, 0);

    const config = toCreativeConfiguration(defaults);
    assert.equal(config.inspiration.enabled, false);
    assert.equal(config.logo.enabled, false);
    assert.equal(config.colors.mode, "none");
    assert.equal(config.voiceTone.enabled, false);
    assert.equal(config.notesToAI, null);
  });
});

describe("normalizeCreativeSelections", () => {
  it("treats empty inspiration as disabled with empty assets", () => {
    const normalized = normalizeCreativeSelections(
      sampleInspiration({
        inspirationImages: [],
        inspirationOverallComment: "  ",
        globalAiGuidance: "  ",
      }),
    );
    const config = toCreativeConfiguration(normalized);
    assert.equal(config.inspiration.enabled, false);
    assert.deepEqual(config.inspiration.assets, []);
    assert.equal(config.notesToAI, null);
  });

  it("clears logo when None / not explicitly enabled", () => {
    const normalized = normalizeCreativeSelections(
      sampleInspiration({
        selectedLogoId: "logo-1",
        includeLogoInArtwork: false,
        includeLogoInArtworkUserSet: true,
      }),
    );
    assert.equal(normalized.selectedLogoId, null);
    assert.equal(normalized.includeLogoInArtwork, false);
  });
});

describe("applyColorMode", () => {
  it("clears custom palette when switching to none", () => {
    const current = sampleInspiration({
      colorMode: "custom_palette",
      customPaletteColors: ["#111111", "#222222"],
      useSchoolColors: false,
    });
    const patch = applyColorMode(current, "none", {
      primary: "#aa0000",
      secondary: "#00aa00",
    });
    assert.equal(patch.colorMode, "none");
    assert.equal(patch.useSchoolColors, false);
    assert.deepEqual(patch.customPaletteColors, []);
  });

  it("clears custom palette when switching to organization_palette", () => {
    const current = sampleInspiration({
      colorMode: "custom_palette",
      customPaletteColors: ["#111111"],
    });
    const patch = applyColorMode(current, "organization_palette", {
      primary: "#aa0000",
      secondary: "#00aa00",
    });
    assert.equal(patch.colorMode, "organization_palette");
    assert.equal(patch.useSchoolColors, true);
    assert.deepEqual(patch.customPaletteColors, []);
    assert.equal(patch.primarySchoolColor, "#aa0000");
    assert.equal(patch.secondarySchoolColor, "#00aa00");
  });

  it("seeds custom swatches when entering custom_palette", () => {
    const current = sampleInspiration({ colorMode: "none", customPaletteColors: [] });
    const patch = applyColorMode(current, "custom_palette");
    assert.equal(patch.colorMode, "custom_palette");
    assert.ok((patch.customPaletteColors?.length ?? 0) >= 2);
  });
});

describe("migrateLegacyCreativeFields", () => {
  it("does not treat legacy default useSchoolColors as an explicit selection", () => {
    const defaults = buildDefaultInspiration("evt-1", "Spring Fair", "2026-05-01");
    const migrated = migrateLegacyCreativeFields(
      {
        useSchoolColors: true,
        selectedLogoId: "logo-1",
        includeLogoInArtwork: true,
        voiceTone: "Friendly, Exciting, Welcoming",
      },
      defaults,
    );
    assert.equal(migrated.colorMode, "none");
    assert.equal(migrated.useSchoolColors, false);
    assert.equal(migrated.includeLogoInArtwork, false);
    assert.equal(migrated.selectedLogoId, null);
    assert.deepEqual(migrated.voiceToneValues, []);
  });

  it("preserves explicit logo opt-in and custom voice strings", () => {
    const defaults = buildDefaultInspiration("evt-1", "Spring Fair", "2026-05-01");
    const migrated = migrateLegacyCreativeFields(
      {
        includeLogoInArtwork: true,
        includeLogoInArtworkUserSet: true,
        selectedLogoId: "logo-1",
        voiceTone: "Professional, Informative",
        colorMode: "organization_palette",
        useSchoolColors: true,
      },
      defaults,
    );
    assert.equal(migrated.includeLogoInArtwork, true);
    assert.equal(migrated.selectedLogoId, "logo-1");
    assert.equal(migrated.colorMode, "organization_palette");
    assert.deepEqual(migrated.voiceToneValues, ["Professional, Informative"]);
  });
});

describe("Creative Setup category combinations (Phase 15 matrix)", () => {
  it("all-None → nothing enabled downstream", () => {
    const config = toCreativeConfiguration(sampleInspiration());
    assert.equal(config.inspiration.enabled, false);
    assert.equal(config.logo.enabled, false);
    assert.equal(config.colors.mode, "none");
    assert.equal(config.voiceTone.enabled, false);
    assert.equal(config.notesToAI, null);
  });

  it("inspiration only — everything else stays None", () => {
    const config = toCreativeConfiguration(
      sampleInspiration({
        inspirationImages: [
          { id: "img-1", label: "poster", url: "https://x/a.png", comment: "Use this layout" },
        ],
        inspirationOverallComment: "Bright and playful",
      }),
    );
    assert.equal(config.inspiration.enabled, true);
    assert.equal(config.inspiration.assets[0]?.comment, "Use this layout");
    assert.equal(config.inspiration.overallComment, "Bright and playful");
    assert.equal(config.logo.enabled, false);
    assert.equal(config.colors.mode, "none");
    assert.equal(config.voiceTone.enabled, false);
    assert.equal(config.notesToAI, null);
  });

  it("logo + inspiration colors — no school colors sent", () => {
    const config = toCreativeConfiguration(
      sampleInspiration({
        inspirationImages: [{ id: "img-1", label: "poster", url: "https://x/a.png" }],
        selectedLogoId: "logo-1",
        includeLogoInArtwork: true,
        includeLogoInArtworkUserSet: true,
        colorMode: "inspiration_palette",
      }),
    );
    assert.equal(config.logo.enabled, true);
    assert.equal(config.colors.mode, "inspiration_palette");
    assert.deepEqual(config.colors.colors, []);
  });

  it("inspiration + school colors, no logo", () => {
    const config = toCreativeConfiguration(
      sampleInspiration({
        inspirationImages: [{ id: "img-1", label: "poster", url: "https://x/a.png" }],
        colorMode: "organization_palette",
        primarySchoolColor: "#123456",
        secondarySchoolColor: "#abcdef",
      }),
    );
    assert.equal(config.inspiration.enabled, true);
    assert.equal(config.logo.enabled, false);
    assert.deepEqual(config.colors.colors, ["#123456", "#abcdef"]);
  });

  it("logo + school colors — inspiration and custom stay empty", () => {
    const config = toCreativeConfiguration(
      sampleInspiration({
        selectedLogoId: "logo-1",
        includeLogoInArtwork: true,
        includeLogoInArtworkUserSet: true,
        colorMode: "organization_palette",
        primarySchoolColor: "#111111",
        secondarySchoolColor: "#222222",
      }),
    );
    assert.equal(config.logo.enabled, true);
    assert.equal(config.inspiration.enabled, false);
    assert.deepEqual(config.colors.colors, ["#111111", "#222222"]);
  });

  it("inspiration + logo + school colors — everything selected", () => {
    const config = toCreativeConfiguration(
      sampleInspiration({
        inspirationImages: [{ id: "img-1", label: "poster", url: "https://x/a.png" }],
        selectedLogoId: "logo-1",
        includeLogoInArtwork: true,
        includeLogoInArtworkUserSet: true,
        colorMode: "organization_palette",
        primarySchoolColor: "#111111",
        secondarySchoolColor: "#222222",
        voiceToneValues: ["Friendly", "Exciting"],
        voiceTone: "Friendly, Exciting",
        globalAiGuidance: "Keep it warm",
      }),
    );
    assert.equal(config.inspiration.enabled, true);
    assert.equal(config.logo.enabled, true);
    assert.equal(config.colors.mode, "organization_palette");
    assert.equal(config.voiceTone.enabled, true);
    assert.equal(config.notesToAI, "Keep it warm");
  });

  it("custom palette colors are only sent when mode is custom_palette", () => {
    const config = toCreativeConfiguration(
      sampleInspiration({
        colorMode: "custom_palette",
        customPaletteColors: ["#ff0000", "#00ff00"],
        primarySchoolColor: "#111111",
      }),
    );
    assert.deepEqual(config.colors.colors, ["#ff0000", "#00ff00"]);

    const switchedToNone = toCreativeConfiguration(
      sampleInspiration({
        colorMode: "none",
        customPaletteColors: ["#ff0000", "#00ff00"],
      }),
    );
    assert.deepEqual(switchedToNone.colors.colors, []);
  });
});

describe("resolveMilestoneInspiration — per-milestone logo/colors overrides", () => {
  const campaignWithLogoAndColors = sampleInspiration({
    selectedLogoId: "campaign-logo",
    includeLogoInArtwork: true,
    includeLogoInArtworkUserSet: true,
    uploadedLogoUrl: null,
    colorMode: "organization_palette",
    primarySchoolColor: "#111111",
    secondarySchoolColor: "#222222",
  });

  it("inherit (absent override) uses the campaign logo and colors", () => {
    const resolved = resolveMilestoneInspiration(campaignWithLogoAndColors, undefined);
    assert.equal(resolved.includeLogoInArtwork, true);
    assert.equal(resolved.selectedLogoId, "campaign-logo");
    assert.equal(resolved.colorMode, "organization_palette");
  });

  it("inherit (explicit mode:'inherit') uses the campaign logo and colors", () => {
    const resolved = resolveMilestoneInspiration(campaignWithLogoAndColors, {
      logo: { mode: "inherit" },
      colors: { mode: "inherit" },
    });
    assert.equal(resolved.includeLogoInArtwork, true);
    assert.equal(resolved.colorMode, "organization_palette");
  });

  it("explicit none override removes the logo — never falls back to the campaign logo", () => {
    const resolved = resolveMilestoneInspiration(campaignWithLogoAndColors, {
      logo: { mode: "none" },
    });
    assert.equal(resolved.includeLogoInArtwork, false);
    assert.equal(resolved.selectedLogoId, null);
    assert.equal(resolved.uploadedLogoUrl, null);
    // Colors were not overridden — still inherited.
    assert.equal(resolved.colorMode, "organization_palette");
  });

  it("explicit none override removes colors — never falls back to the campaign palette", () => {
    const resolved = resolveMilestoneInspiration(campaignWithLogoAndColors, {
      colors: { mode: "none" },
    });
    assert.equal(resolved.colorMode, "none");
    assert.equal(resolved.useSchoolColors, false);
    assert.deepEqual(resolved.customPaletteColors, []);
    // Logo was not overridden — still inherited.
    assert.equal(resolved.includeLogoInArtwork, true);
  });

  it("selected override replaces the logo with a milestone-specific value", () => {
    const resolved = resolveMilestoneInspiration(campaignWithLogoAndColors, {
      logo: {
        mode: "selected",
        value: { logoId: "milestone-only-logo", logoUrl: "https://x/logo.png", logoName: "Other logo" },
      },
    });
    assert.equal(resolved.includeLogoInArtwork, true);
    assert.equal(resolved.selectedLogoId, "milestone-only-logo");
    assert.equal(resolved.uploadedLogoUrl, "https://x/logo.png");
  });

  it("selected override replaces colors with a milestone-specific custom palette", () => {
    const resolved = resolveMilestoneInspiration(campaignWithLogoAndColors, {
      colors: { mode: "selected", value: { mode: "custom_palette", colors: ["#abcabc"] } },
    });
    assert.equal(resolved.colorMode, "custom_palette");
    assert.deepEqual(resolved.customPaletteColors, ["#abcabc"]);
  });

  it("never mutates the campaign inspiration object passed in", () => {
    const before = JSON.stringify(campaignWithLogoAndColors);
    resolveMilestoneInspiration(campaignWithLogoAndColors, { logo: { mode: "none" }, colors: { mode: "none" } });
    assert.equal(JSON.stringify(campaignWithLogoAndColors), before);
  });

  it("one milestone's override never affects another milestone's resolution", () => {
    const milestoneAOverrides = { logo: { mode: "none" as const } };
    const milestoneBOverrides = undefined;

    const resolvedA = resolveMilestoneInspiration(campaignWithLogoAndColors, milestoneAOverrides);
    const resolvedB = resolveMilestoneInspiration(campaignWithLogoAndColors, milestoneBOverrides);

    assert.equal(resolvedA.includeLogoInArtwork, false);
    assert.equal(resolvedB.includeLogoInArtwork, true);
    assert.equal(resolvedB.selectedLogoId, "campaign-logo");
  });
});

describe("normalizeMilestoneCreativeOverrides", () => {
  it("passes through a valid none override", () => {
    const normalized = normalizeMilestoneCreativeOverrides({ logo: { mode: "none" } });
    assert.deepEqual(normalized, { logo: { mode: "none" } });
  });

  it("drops a malformed selected override missing a logoId", () => {
    const normalized = normalizeMilestoneCreativeOverrides({
      // @ts-expect-error — intentionally malformed for the defensive-normalization test
      logo: { mode: "selected", value: {} },
    });
    assert.equal(normalized, undefined);
  });

  it("drops a malformed selected colors override with an invalid mode", () => {
    const normalized = normalizeMilestoneCreativeOverrides({
      // @ts-expect-error — intentionally malformed for the defensive-normalization test
      colors: { mode: "selected", value: { mode: "not-a-real-mode" } },
    });
    assert.equal(normalized, undefined);
  });

  it("returns undefined for an empty/undefined override (inherit)", () => {
    assert.equal(normalizeMilestoneCreativeOverrides(undefined), undefined);
    assert.equal(normalizeMilestoneCreativeOverrides({}), undefined);
  });
});

describe("clearAllCreativeSelections", () => {
  it("resets every creative section to None", () => {
    const cleared = clearAllCreativeSelections(
      sampleInspiration({
        inspirationImages: [
          { id: "img-1", label: "poster", url: "https://example.com/a.png" },
        ],
        selectedLogoId: "logo-1",
        includeLogoInArtwork: true,
        includeLogoInArtworkUserSet: true,
        colorMode: "custom_palette",
        customPaletteColors: ["#fff"],
        voiceToneValues: ["Friendly"],
        voiceTone: "Friendly",
        globalAiGuidance: "Keep it bright",
      }),
    );
    const config = toCreativeConfiguration(cleared);
    assert.equal(config.inspiration.enabled, false);
    assert.equal(config.logo.enabled, false);
    assert.equal(config.colors.mode, "none");
    assert.equal(config.voiceTone.enabled, false);
    assert.equal(config.notesToAI, null);
  });
});
