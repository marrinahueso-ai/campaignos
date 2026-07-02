import type { CampaignEventSnapshot } from "@/lib/ai-artwork/types";
import type { CreativeBrief } from "@/lib/creative-director/types";
import type { InspirationAsset } from "@/lib/creative-assets/types";

export type CreativeDirectionId =
  | "match_approved_style"
  | "clean_modern"
  | "bold_event"
  | "photography"
  | "illustrated"
  | "premium_magazine"
  | "surprise_me";

export interface CreativeDirectionOption {
  id: CreativeDirectionId;
  label: string;
  description: string;
  default?: boolean;
}

export const CREATIVE_DIRECTION_OPTIONS: CreativeDirectionOption[] = [
  {
    id: "match_approved_style",
    label: "Match Edmondson Approved Style",
    description: "Follow approved school artwork — consistent in-house designer look.",
    default: true,
  },
  {
    id: "clean_modern",
    label: "Clean & Modern",
    description: "Minimal layout, confident typography, generous whitespace.",
  },
  {
    id: "bold_event",
    label: "Bold Event",
    description: "High-energy headline, strong focal point, event-first hierarchy.",
  },
  {
    id: "photography",
    label: "Photography",
    description: "Warm, authentic photography with editorial crop and overlay zones.",
  },
  {
    id: "illustrated",
    label: "Illustrated",
    description: "Hand-crafted illustration with cohesive shapes and school spirit.",
  },
  {
    id: "premium_magazine",
    label: "Premium Magazine",
    description: "Editorial layout, refined type pairing, polished print-quality feel.",
  },
  {
    id: "surprise_me",
    label: "Surprise Me",
    description: "Fresh creative exploration while staying on brand and on brief.",
  },
];

export interface AutoCreativeDirectionSummary {
  campaignType: string;
  audience: string;
  platform: string;
  school: string;
  brandColors: string[];
  mood: string;
  layout: string;
}

export function parseCreativeDirection(value: unknown): CreativeDirectionId {
  const ids = new Set(CREATIVE_DIRECTION_OPTIONS.map((option) => option.id));
  if (typeof value === "string" && ids.has(value as CreativeDirectionId)) {
    return value as CreativeDirectionId;
  }
  return "match_approved_style";
}

export function getCreativeDirectionLabel(id: CreativeDirectionId): string {
  return CREATIVE_DIRECTION_OPTIONS.find((option) => option.id === id)?.label ?? id;
}

export function isArtworkDebugEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ARTWORK_DEBUG === "1";
}

export function deriveAutoCreativeDirection(input: {
  brief: CreativeBrief;
  campaignEvent: CampaignEventSnapshot | null;
  organizationName: string | null;
  platformLabel: string;
  eventType: string | null;
  brandColors: string[];
}): AutoCreativeDirectionSummary {
  const campaignType =
    input.campaignEvent?.title ??
    input.brief.campaignTitle ??
    "School campaign";

  const audience =
    input.campaignEvent?.audience?.trim() || "Parents and school community";

  const school = input.organizationName?.trim() || "Elementary school PTO";

  const mood =
    input.brief.moodSummary?.trim() ||
    input.brief.emotionalTone.slice(0, 3).join(" · ") ||
    "Energetic · Community · School Spirit";

  const brandColors =
    input.brandColors.length > 0
      ? input.brandColors
      : input.brief.colorPalette.length > 0
        ? input.brief.colorPalette.slice(0, 4)
        : ["navy", "green", "white"];

  return {
    campaignType,
    audience,
    platform: input.platformLabel,
    school,
    brandColors,
    mood,
    layout: input.platformLabel,
  };
}

export function creativeDirectionPromptLines(direction: CreativeDirectionId): string[] {
  switch (direction) {
    case "match_approved_style":
      return [
        "Design Style: Match the school's approved campaign artwork.",
        "Treat prior approved designs as the in-house designer standard — same visual language, hierarchy, and polish.",
        "Prioritize brand consistency over novelty.",
      ];
    case "clean_modern":
      return [
        "Design Style: Clean and modern school communication.",
        "Minimal elements, confident typography, generous whitespace, crisp alignment.",
      ];
    case "bold_event":
      return [
        "Design Style: Bold event promotion.",
        "Dominant headline, strong focal artwork, high contrast, immediate event recognition.",
      ];
    case "photography":
      return [
        "Design Style: Warm editorial photography.",
        "Natural lighting, authentic community feel, photo-led composition with overlay-safe zones.",
      ];
    case "illustrated":
      return [
        "Design Style: Custom illustrated campaign art.",
        "Cohesive hand-crafted illustration — not generic clip art or stock icons.",
      ];
    case "premium_magazine":
      return [
        "Design Style: Premium magazine editorial.",
        "Refined typography pairing, structured grid, print-quality polish and restraint.",
      ];
    case "surprise_me":
      return [
        "Design Style: Fresh creative direction within brand guardrails.",
        "Explore a distinct layout or visual approach while keeping school identity intact.",
      ];
  }
}

export function rankAutoInspirationAssets(input: {
  assetType: string;
  brief: CreativeBrief;
  inspirationAssets: InspirationAsset[];
  currentEventId: string;
  limit?: number;
}): InspirationAsset[] {
  const limit = input.limit ?? 3;
  const candidates = input.inspirationAssets.filter(
    (item) => item.eventId !== input.currentEventId && item.storagePath,
  );

  if (candidates.length === 0) {
    return [];
  }

  const haystack = [
    input.brief.graphicStyle,
    input.brief.moodSummary,
    input.brief.visualDirection,
    input.brief.campaignTitle,
    input.assetType,
  ]
    .join(" ")
    .toLowerCase();

  const scored = candidates.map((candidate) => {
    const typeBonus = candidate.assetType === input.assetType ? 3 : 0;
    const titleOverlap = tokenOverlapScore(haystack, candidate.eventTitle.toLowerCase());
    const tagScore = candidate.tags.filter((tag) => haystack.includes(tag.toLowerCase())).length;
    const recencyBonus = candidate.eventDate ? 0.001 * Date.parse(candidate.eventDate) : 0;
    return {
      candidate,
      score: typeBonus + titleOverlap * 2 + tagScore + recencyBonus,
    };
  });

  scored.sort((left, right) => right.score - left.score);

  const picked: InspirationAsset[] = [];
  const seenEvents = new Set<string>();

  for (const entry of scored) {
    if (picked.length >= limit) break;
    if (seenEvents.has(entry.candidate.eventId)) continue;
    seenEvents.add(entry.candidate.eventId);
    picked.push(entry.candidate);
  }

  if (picked.length === 0) {
    return candidates.slice(0, limit);
  }

  return picked;
}

function tokenOverlapScore(haystack: string, title: string): number {
  const tokens = title.split(/\s+/).filter((token) => token.length > 2);
  return tokens.filter((token) => haystack.includes(token)).length;
}

export function resolveDisplayedInspirationAssets(input: {
  inspirationAssetId: string | null;
  supportInspirationAssetIds: string[];
  autoInspirationAssets: InspirationAsset[];
  allAssets: InspirationAsset[];
}): InspirationAsset[] {
  const byId = new Map(input.allAssets.map((item) => [item.assetId, item]));
  const orderedIds = [
    input.inspirationAssetId,
    ...input.supportInspirationAssetIds,
  ].filter((id): id is string => Boolean(id));

  const manual: InspirationAsset[] = [];
  const seen = new Set<string>();
  for (const id of orderedIds) {
    if (seen.has(id)) continue;
    const asset = byId.get(id);
    if (asset) {
      manual.push(asset);
      seen.add(id);
    }
  }

  if (manual.length > 0) {
    return manual;
  }

  return input.autoInspirationAssets.slice(0, 2);
}
