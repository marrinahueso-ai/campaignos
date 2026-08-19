import { NO_BRAND_KIT_ID } from "./brand-kit.ts";
import type {
  CampaignBuilderInspiration,
  CreativeColorMode,
  InspirationImage,
  MilestoneCreativeOverrides,
} from "./types.ts";

export const CREATIVE_COLOR_MODES: CreativeColorMode[] = [
  "none",
  "organization_palette",
  "inspiration_palette",
  "custom_palette",
];

export const DEFAULT_VOICE_TONE_CHOICES = [
  "Friendly",
  "Exciting",
  "Welcoming",
  "Professional",
  "Informative",
  "Playful",
  "Energetic",
  "Warm",
  "Community-focused",
] as const;

/** View model for Creative Setup — maps onto session.inspiration. */
export type CampaignCreativeConfiguration = {
  campaignId: string;
  organizationId?: string;
  inspiration: {
    enabled: boolean;
    assets: Array<{
      assetId: string;
      url: string;
      label: string;
      comment?: string;
      previewUrl?: string | null;
    }>;
    overallComment?: string;
  };
  logo: {
    enabled: boolean;
    logoId: string | null;
    logoUrl?: string;
    logoName?: string;
  };
  colors: {
    mode: CreativeColorMode;
    paletteId?: string | null;
    colors?: string[];
  };
  voiceTone: {
    enabled: boolean;
    values: string[];
  };
  notesToAI: string | null;
};

export function isCreativeColorMode(value: unknown): value is CreativeColorMode {
  return (
    typeof value === "string" &&
    (CREATIVE_COLOR_MODES as string[]).includes(value)
  );
}

export function buildEmptyCreativeConfiguration(
  campaignId: string,
): CampaignCreativeConfiguration {
  return {
    campaignId,
    inspiration: { enabled: false, assets: [], overallComment: undefined },
    logo: { enabled: false, logoId: null },
    colors: { mode: "none", colors: [] },
    voiceTone: { enabled: false, values: [] },
    notesToAI: null,
  };
}

export function inspirationImagesToAssets(
  images: InspirationImage[],
): CampaignCreativeConfiguration["inspiration"]["assets"] {
  return images.map((image) => ({
    assetId: image.id,
    url: image.url ?? image.previewUrl ?? "",
    label: image.label,
    comment: image.comment?.trim() ? image.comment.trim() : undefined,
    previewUrl: image.previewUrl ?? image.url,
  }));
}

/**
 * Project session inspiration fields into the Creative Setup view model.
 * Explicit None means disabled / empty — never invent org defaults here.
 */
export function toCreativeConfiguration(
  inspiration: CampaignBuilderInspiration,
): CampaignCreativeConfiguration {
  const assets = inspirationImagesToAssets(inspiration.inspirationImages ?? []);
  const notes = (inspiration.globalAiGuidance ?? "").trim();
  const voiceTone = (inspiration.voiceTone ?? "").trim();
  const voiceValues =
    inspiration.voiceToneValues?.length > 0
      ? inspiration.voiceToneValues.filter((value) => value.trim())
      : voiceTone
        ? [voiceTone]
        : [];

  const colorMode = isCreativeColorMode(inspiration.colorMode)
    ? inspiration.colorMode
    : "none";

  const customColors = (inspiration.customPaletteColors ?? []).filter(Boolean);

  return {
    campaignId: inspiration.campaignId,
    inspiration: {
      enabled: assets.length > 0,
      assets,
      overallComment: inspiration.inspirationOverallComment?.trim() || undefined,
    },
    logo: {
      enabled:
        Boolean(inspiration.includeLogoInArtwork) &&
        Boolean(inspiration.selectedLogoId),
      logoId: inspiration.includeLogoInArtwork
        ? inspiration.selectedLogoId
        : null,
      logoUrl: inspiration.uploadedLogoUrl ?? undefined,
      logoName: inspiration.uploadedLogoLabel ?? undefined,
    },
    colors: {
      mode: colorMode,
      colors:
        colorMode === "custom_palette"
          ? customColors
          : colorMode === "organization_palette"
            ? [
                inspiration.primarySchoolColor,
                inspiration.secondarySchoolColor,
              ].filter((color): color is string => Boolean(color))
            : [],
    },
    voiceTone: {
      enabled: voiceValues.length > 0,
      values: voiceValues,
    },
    notesToAI: notes || null,
  };
}

/** Clear previous mode-specific values when switching color modes. */
export function applyColorMode(
  inspiration: CampaignBuilderInspiration,
  mode: CreativeColorMode,
  schoolColors?: { primary: string | null; secondary: string | null },
): Partial<CampaignBuilderInspiration> {
  const base: Partial<CampaignBuilderInspiration> = {
    colorMode: mode,
    useSchoolColors: mode === "organization_palette",
  };

  if (mode === "none" || mode === "inspiration_palette") {
    return {
      ...base,
      customPaletteColors: [],
      // Keep org color values available for later selection, but do not
      // treat them as "selected" unless organization_palette is active.
      primarySchoolColor: schoolColors?.primary ?? inspiration.primarySchoolColor,
      secondarySchoolColor:
        schoolColors?.secondary ?? inspiration.secondarySchoolColor,
    };
  }

  if (mode === "organization_palette") {
    return {
      ...base,
      customPaletteColors: [],
      primarySchoolColor:
        schoolColors?.primary ?? inspiration.primarySchoolColor,
      secondarySchoolColor:
        schoolColors?.secondary ?? inspiration.secondarySchoolColor,
    };
  }

  // custom_palette — clear org-driven usage; keep any custom swatches
  return {
    ...base,
    customPaletteColors:
      inspiration.customPaletteColors?.length > 0
        ? inspiration.customPaletteColors
        : ["#1e3a5f", "#c4a35a"],
  };
}

/** Quiet cap so Setup Brand Colors stays a short row of pills, not a dump. */
export const SETUP_BRAND_COLOR_MAX = 6;
export const SETUP_BRAND_COLOR_FALLBACK = "#2f4a3c";
export const SETUP_NEW_BRAND_COLOR = "#ffffff";

/** Normalize a stored color to a native `<input type="color">` value. */
export function toSetupColorInputValue(
  value: string,
  fallback = SETUP_BRAND_COLOR_FALLBACK,
): string {
  const cleaned = value.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(cleaned)) return cleaned.toLowerCase();
  if (/^[0-9a-fA-F]{6}$/.test(cleaned)) return `#${cleaned.toLowerCase()}`;
  if (/^#[0-9a-fA-F]{3}$/.test(cleaned)) {
    const r = cleaned[1];
    const g = cleaned[2];
    const b = cleaned[3];
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return fallback;
}

function compactSetupColors(
  colors: Array<string | null | undefined>,
): string[] {
  const seen = new Set<string>();
  const next: string[] = [];
  for (const color of colors) {
    if (typeof color !== "string") continue;
    const trimmed = color.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    next.push(trimmed);
    if (next.length >= SETUP_BRAND_COLOR_MAX) break;
  }
  return next;
}

/**
 * Colors shown on Social Creative Setup Brand Colors.
 * Chosen custom / org palette first; otherwise brand-kit colors as suggestions.
 */
export function resolveSetupBrandColors(
  inspiration: CampaignBuilderInspiration,
): string[] {
  const colorMode = isCreativeColorMode(inspiration.colorMode)
    ? inspiration.colorMode
    : "none";

  if (colorMode === "custom_palette") {
    return compactSetupColors(inspiration.customPaletteColors ?? []);
  }

  if (colorMode === "organization_palette") {
    return compactSetupColors([
      inspiration.primarySchoolColor,
      inspiration.secondarySchoolColor,
    ]);
  }

  // none / inspiration_palette — brand-kit values are suggestions only until
  // the user clicks, adds, or removes a swatch (then they become custom).
  return compactSetupColors([
    inspiration.primarySchoolColor,
    inspiration.secondarySchoolColor,
  ]);
}

/**
 * Persist Setup Brand Colors as the custom palette generation already reads.
 * Empty list = explicit None (no color guidance).
 */
export function commitSetupBrandColors(
  colors: string[],
): Partial<CampaignBuilderInspiration> {
  const next = compactSetupColors(
    colors.map((color) => toSetupColorInputValue(color)),
  );

  if (next.length === 0) {
    return {
      colorMode: "none",
      useSchoolColors: false,
      customPaletteColors: [],
    };
  }

  return {
    colorMode: "custom_palette",
    useSchoolColors: false,
    customPaletteColors: next,
  };
}

export function replaceSetupBrandColor(
  current: string[],
  index: number,
  color: string,
): string[] {
  if (index < 0 || index >= current.length) return current;
  const next = [...current];
  next[index] = toSetupColorInputValue(color);
  return compactSetupColors(next);
}

const SETUP_ADD_COLOR_CANDIDATES = [
  SETUP_NEW_BRAND_COLOR,
  SETUP_BRAND_COLOR_FALLBACK,
  "#c4922e",
  "#0b2f5b",
  "#6b8171",
];

export function addSetupBrandColor(current: string[]): string[] {
  if (current.length >= SETUP_BRAND_COLOR_MAX) return current;
  const existing = new Set(current.map((color) => toSetupColorInputValue(color)));
  const next =
    SETUP_ADD_COLOR_CANDIDATES.find((color) => !existing.has(color)) ??
    SETUP_NEW_BRAND_COLOR;
  return [...current, next];
}

export function removeSetupBrandColor(
  current: string[],
  index: number,
): string[] {
  return current.filter((_, itemIndex) => itemIndex !== index);
}

export function clearAllCreativeSelections(
  inspiration: CampaignBuilderInspiration,
): CampaignBuilderInspiration {
  return {
    ...inspiration,
    inspirationImages: [],
    inspirationOverallComment: "",
    selectedLogoId: null,
    includeLogoInArtwork: false,
    includeLogoInArtworkUserSet: true,
    uploadedLogoUrl: null,
    uploadedLogoLabel: null,
    colorMode: "none",
    customPaletteColors: [],
    useSchoolColors: false,
    voiceTone: "",
    voiceToneValues: [],
    globalAiGuidance: "",
    // Clear all resets Creative Setup toggles only (logo / colors / tone / images).
  };
}

/**
 * Normalize creative fields for persistence / continue.
 * Empty inspiration → enabled=false conceptually (no assets).
 * Blank notes → "".
 */
export function normalizeCreativeSelections(
  inspiration: CampaignBuilderInspiration,
): CampaignBuilderInspiration {
  const images = (inspiration.inspirationImages ?? []).map((image) => ({
    ...image,
    comment: image.comment?.trim() ? image.comment.trim() : undefined,
  }));

  const colorMode = isCreativeColorMode(inspiration.colorMode)
    ? inspiration.colorMode
    : "none";

  const voiceToneValues = (inspiration.voiceToneValues ?? [])
    .map((value) => value.trim())
    .filter(Boolean);

  const includeLogo =
    inspiration.includeLogoInArtworkUserSet === true
      ? Boolean(inspiration.includeLogoInArtwork && inspiration.selectedLogoId)
      : false;

  return {
    ...inspiration,
    inspirationImages: images,
    inspirationOverallComment: inspiration.inspirationOverallComment?.trim() ?? "",
    selectedLogoId: includeLogo ? inspiration.selectedLogoId : null,
    includeLogoInArtwork: includeLogo,
    includeLogoInArtworkUserSet: true,
    uploadedLogoUrl: includeLogo ? inspiration.uploadedLogoUrl ?? null : null,
    uploadedLogoLabel: includeLogo ? inspiration.uploadedLogoLabel ?? null : null,
    colorMode,
    useSchoolColors: colorMode === "organization_palette",
    customPaletteColors:
      colorMode === "custom_palette"
        ? (inspiration.customPaletteColors ?? []).filter(Boolean)
        : [],
    voiceToneValues,
    voiceTone: voiceToneValues.join(", "),
    globalAiGuidance: inspiration.globalAiGuidance?.trim() ?? "",
    brandKitId: inspiration.brandKitId?.trim() || NO_BRAND_KIT_ID,
  };
}

/**
 * Migrate legacy Inspiration-page fields into Creative Setup shape.
 * Does NOT invent logo/colors/tone when the user never explicitly opted in.
 */
export function migrateLegacyCreativeFields(
  raw: Partial<CampaignBuilderInspiration> | undefined,
  defaults: CampaignBuilderInspiration,
): CampaignBuilderInspiration {
  const merged: CampaignBuilderInspiration = {
    ...defaults,
    ...raw,
    campaignId: raw?.campaignId ?? defaults.campaignId,
    inspirationImages: raw?.inspirationImages ?? defaults.inspirationImages,
  };

  const colorMode = isCreativeColorMode(raw?.colorMode)
    ? raw.colorMode
    : // Legacy checkbox without an explicit creative colorMode → None.
      // Do not treat the old default useSchoolColors:true as a selection.
      "none";

  const HISTORICAL_DEFAULT_VOICE = "Friendly, Exciting, Welcoming";
  const voiceToneValues = Array.isArray(raw?.voiceToneValues)
    ? raw.voiceToneValues.filter((value) => typeof value === "string" && value.trim())
    : raw?.voiceTone?.trim() &&
        raw.voiceTone.trim() !== HISTORICAL_DEFAULT_VOICE &&
        raw.voiceTone.trim() !== defaults.voiceTone
      ? [raw.voiceTone.trim()]
      : [];

  const includeLogoUserSet = raw?.includeLogoInArtworkUserSet === true;
  const includeLogo = includeLogoUserSet
    ? Boolean(raw?.includeLogoInArtwork && raw?.selectedLogoId)
    : false;

  return normalizeCreativeSelections({
    ...merged,
    inspirationOverallComment:
      raw?.inspirationOverallComment ?? defaults.inspirationOverallComment ?? "",
    colorMode,
    useSchoolColors: colorMode === "organization_palette",
    customPaletteColors: Array.isArray(raw?.customPaletteColors)
      ? raw.customPaletteColors.filter(
          (color): color is string => typeof color === "string" && Boolean(color),
        )
      : [],
    selectedLogoId: includeLogo ? (raw?.selectedLogoId ?? null) : null,
    includeLogoInArtwork: includeLogo,
    includeLogoInArtworkUserSet: includeLogoUserSet,
    uploadedLogoUrl: includeLogo ? (raw?.uploadedLogoUrl ?? null) : null,
    uploadedLogoLabel: includeLogo ? (raw?.uploadedLogoLabel ?? null) : null,
    voiceToneValues,
    voiceTone: voiceToneValues.join(", "),
    brandKitId: raw?.brandKitId?.trim() || NO_BRAND_KIT_ID,
  });
}

/**
 * Resolves the effective Creative Setup inspiration a single milestone should
 * generate against, applying that milestone's explicit logo/colors overrides
 * (if any) on top of the campaign-level config.
 *
 * - No override / {mode:"inherit"} → campaign value used as-is.
 * - {mode:"none"} → explicit opt-out for this post only — never falls
 *   back to the campaign value.
 * - {mode:"selected"} → milestone-specific value replaces the campaign value.
 *
 * Never mutates the campaign inspiration passed in, and never reads or
 * writes any other milestone's overrides — one milestone's override can
 * never leak into another milestone or back into the campaign config.
 */
export function resolveMilestoneInspiration(
  campaignInspiration: CampaignBuilderInspiration,
  overrides: MilestoneCreativeOverrides | undefined,
): CampaignBuilderInspiration {
  let resolved = campaignInspiration;

  const logoOverride = overrides?.logo;
  if (logoOverride?.mode === "none") {
    resolved = {
      ...resolved,
      includeLogoInArtwork: false,
      selectedLogoId: null,
      uploadedLogoUrl: null,
      uploadedLogoLabel: null,
    };
  } else if (logoOverride?.mode === "selected") {
    resolved = {
      ...resolved,
      includeLogoInArtwork: true,
      selectedLogoId: logoOverride.value.logoId,
      uploadedLogoUrl: logoOverride.value.logoUrl ?? null,
      uploadedLogoLabel: logoOverride.value.logoName ?? null,
    };
  }
  // {mode:"inherit"} or absent → keep the campaign logo values untouched.

  const colorsOverride = overrides?.colors;
  if (colorsOverride?.mode === "none") {
    resolved = {
      ...resolved,
      colorMode: "none",
      useSchoolColors: false,
      customPaletteColors: [],
    };
  } else if (colorsOverride?.mode === "selected") {
    const mode = colorsOverride.value.mode;
    resolved = {
      ...resolved,
      colorMode: mode,
      useSchoolColors: mode === "organization_palette",
      customPaletteColors:
        mode === "custom_palette" ? (colorsOverride.value.colors ?? []) : [],
    };
  }
  // {mode:"inherit"} or absent → keep the campaign color values untouched.

  return resolved;
}

/** Defensively normalizes a possibly-corrupted milestone override back to a known-safe shape. */
export function normalizeMilestoneCreativeOverrides(
  raw: MilestoneCreativeOverrides | undefined,
): MilestoneCreativeOverrides | undefined {
  if (!raw || typeof raw !== "object") {
    return undefined;
  }

  const normalized: MilestoneCreativeOverrides = {};

  const logo = raw.logo;
  if (logo?.mode === "none") {
    normalized.logo = { mode: "none" };
  } else if (logo?.mode === "selected" && logo.value?.logoId) {
    normalized.logo = { mode: "selected", value: { ...logo.value } };
  }

  const colors = raw.colors;
  if (colors?.mode === "none") {
    normalized.colors = { mode: "none" };
  } else if (
    colors?.mode === "selected" &&
    isCreativeColorMode(colors.value?.mode)
  ) {
    normalized.colors = { mode: "selected", value: { ...colors.value } };
  }

  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

export function creativeSummaryLabels(
  config: CampaignCreativeConfiguration,
): {
  inspiration: string;
  logo: string;
  colors: string;
  voiceTone: string;
  notesToAI: string;
} {
  const colorLabels: Record<CreativeColorMode, string> = {
    none: "None",
    organization_palette: "Organization colors",
    inspiration_palette: "From inspiration images",
    custom_palette:
      config.colors.colors && config.colors.colors.length > 0
        ? `Custom (${config.colors.colors.join(", ")})`
        : "Custom palette",
  };

  return {
    inspiration: config.inspiration.enabled
      ? `${config.inspiration.assets.length} image${
          config.inspiration.assets.length === 1 ? "" : "s"
        }`
      : "None",
    logo: config.logo.enabled
      ? config.logo.logoName || config.logo.logoId || "Selected logo"
      : "None",
    colors: colorLabels[config.colors.mode],
    voiceTone: config.voiceTone.enabled
      ? config.voiceTone.values.join(", ")
      : "None",
    notesToAI: config.notesToAI?.trim() ? "Added" : "None",
  };
}
