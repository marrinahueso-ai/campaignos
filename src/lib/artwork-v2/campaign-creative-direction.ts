export const CAMPAIGN_BRAND_STYLE_OPTIONS = [
  "Hey Ralli (Primary)",
  "School brand",
  "Minimal",
  "Bold",
] as const;

export const CAMPAIGN_COLOR_VIBE_OPTIONS = [
  "Colorful & Playful",
  "Warm & Inviting",
  "Clean & Modern",
  "School spirit",
] as const;

export type CampaignBrandStyle = (typeof CAMPAIGN_BRAND_STYLE_OPTIONS)[number];
export type CampaignColorVibe = (typeof CAMPAIGN_COLOR_VIBE_OPTIONS)[number];

const BRAND_STYLE_HINTS: Record<CampaignBrandStyle, string> = {
  "Hey Ralli (Primary)":
    "Use the Hey Ralli primary brand style — warm, family-friendly PTO communication with clear hierarchy.",
  "School brand":
    "Match the school's established brand identity — official colors, typography, and visual tone.",
  Minimal: "Minimal layout with confident typography, generous whitespace, and restrained decoration.",
  Bold: "Bold event promotion — dominant headline, strong focal point, high contrast.",
};

const COLOR_VIBE_HINTS: Record<CampaignColorVibe, string> = {
  "Colorful & Playful": "Color palette: colorful and playful — bright accents, energetic, kid-friendly.",
  "Warm & Inviting": "Color palette: warm and inviting — soft tones, welcoming, community-focused.",
  "Clean & Modern": "Color palette: clean and modern — balanced neutrals with one confident accent color.",
  "School spirit": "Color palette: school spirit — team colors, energetic, community pride.",
};

function resolveBrandStyleHint(brandStyle: string): string | null {
  if (brandStyle in BRAND_STYLE_HINTS) {
    return BRAND_STYLE_HINTS[brandStyle as CampaignBrandStyle];
  }
  return null;
}

function resolveColorVibeHint(colorVibe: string): string | null {
  if (colorVibe in COLOR_VIBE_HINTS) {
    return COLOR_VIBE_HINTS[colorVibe as CampaignColorVibe];
  }
  return null;
}

/** Appends campaign creative-direction hints without duplicating lines already in the prompt. */
export function applyCampaignCreativeDirection(
  prompt: string,
  brandStyle: string,
  colorVibe: string,
): string {
  const trimmed = prompt.trim();
  const hints: string[] = [];

  const brandHint = resolveBrandStyleHint(brandStyle);
  if (brandHint && !trimmed.includes(brandHint)) {
    hints.push(brandHint);
  }

  const colorHint = resolveColorVibeHint(colorVibe);
  if (colorHint && !trimmed.includes(colorHint)) {
    hints.push(colorHint);
  }

  if (hints.length === 0) {
    return trimmed;
  }

  if (!trimmed) {
    return hints.join("\n");
  }

  return `${trimmed}\n\n${hints.join("\n")}`;
}
