import type { ImageSizePreset } from "@/lib/ai-artwork/types";

export const IMAGE_SIZE_PRESETS: {
  id: ImageSizePreset;
  label: string;
  ratio: string;
  openAiSize: string;
  promptHint: string;
}[] = [
  {
    id: "square",
    label: "Square",
    ratio: "1:1",
    openAiSize: "1024x1024",
    promptHint: "Square 1:1 composition.",
  },
  {
    id: "facebook",
    label: "Facebook",
    ratio: "4:3",
    openAiSize: "1792x1024",
    promptHint: "Landscape 4:3 friendly social graphic layout.",
  },
  {
    id: "story",
    label: "Story",
    ratio: "9:16",
    openAiSize: "1024x1792",
    promptHint: "Vertical 9:16 story layout with safe margins.",
  },
  {
    id: "website_hero",
    label: "Website Hero",
    ratio: "16:9",
    openAiSize: "1792x1024",
    promptHint: "Wide 16:9 hero banner with headline space.",
  },
  {
    id: "newsletter_banner",
    label: "Newsletter Banner",
    ratio: "Wide",
    openAiSize: "1792x1024",
    promptHint: "Wide newsletter header banner layout.",
  },
  {
    id: "custom",
    label: "Custom",
    ratio: "Custom",
    openAiSize: "1024x1024",
    promptHint: "Custom dimensions — defaulting to square output.",
  },
];

export const VARIATION_PRESETS: {
  id: import("@/lib/ai-artwork/types").VariationPresetId;
  label: string;
  promptSuffix: string;
}[] = [
  { id: "more_playful", label: "More playful", promptSuffix: "Make the mood more playful and energetic." },
  { id: "less_busy", label: "Less busy", promptSuffix: "Simplify the composition with fewer elements and more breathing room." },
  { id: "brighter_colors", label: "Brighter colors", promptSuffix: "Use brighter, more vibrant colors while staying on brand." },
  {
    id: "different_illustration",
    label: "Different illustration style",
    promptSuffix: "Use a noticeably different illustration style while keeping the same message.",
  },
  {
    id: "photography_version",
    label: "Photography version",
    promptSuffix: "Create a warm photographic style instead of illustration.",
  },
  { id: "minimal_version", label: "Minimal version", promptSuffix: "Use a clean, minimal design with generous white space." },
  {
    id: "same_layout_new_colors",
    label: "Same layout, new colors",
    promptSuffix: "Keep the same layout structure but explore a fresh color palette.",
  },
];

export const INSPIRATION_STRENGTH_OPTIONS: {
  id: import("@/lib/ai-artwork/types").InspirationStrength;
  label: string;
  description: string;
}[] = [
  {
    id: "light",
    label: "Light",
    description: "Loosely echo mood and palette from the inspiration.",
  },
  {
    id: "medium",
    label: "Medium",
    description: "Follow the inspiration's visual direction clearly.",
  },
  {
    id: "strong",
    label: "Strong",
    description: "Match subject, layout, and style closely without copying logos or text.",
  },
];

export const CONCEPT_COUNT = 4;

export const DEFAULT_GENERATION_SETTINGS: import("@/lib/ai-artwork/types").ArtworkGenerationSettings =
  {
    artworkMode: "ready_to_post",
    creativeDirection: "match_approved_style",
    additionalInstructions: "",
    negativeInstructions: "",
    imageSizePreset: "square",
    customSize: null,
    style: "",
    inspirationAssetId: null,
    supportInspirationAssetIds: [],
    inspirationStrength: "light",
    inspirationStyleProfile: null,
    textPlan: null,
    customPromptOverride: null,
  };

export const ARTWORK_PROVIDER_REGISTRY: {
  id: import("@/lib/ai-artwork/types").ArtworkProviderId;
  label: string;
  status: "active" | "planned";
}[] = [
  { id: "openai", label: "OpenAI Images", status: "active" },
  { id: "canva", label: "Canva", status: "planned" },
  { id: "adobe_express", label: "Adobe Express", status: "planned" },
  { id: "ideogram", label: "Ideogram", status: "planned" },
  { id: "midjourney", label: "Midjourney Upload", status: "planned" },
];

export function resolveOpenAiImageSize(preset: ImageSizePreset): string {
  return IMAGE_SIZE_PRESETS.find((entry) => entry.id === preset)?.openAiSize ?? "1024x1024";
}

export function conceptVariationHint(index: number): string {
  switch (index) {
    case 1:
      return "Primary concept — balanced composition.";
    case 2:
      return "Alternative composition with a fresh layout.";
    case 3:
      return "Different color emphasis and visual hierarchy.";
    case 4:
      return "Distinct creative direction while staying on brief.";
    default:
      return "";
  }
}
