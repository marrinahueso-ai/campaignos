import type {
  AiReviewResult,
  CreativeBrief,
  InspirationMatchResult,
  StyleMemoryEntry,
  StyleMemoryRow,
} from "@/lib/creative-director/types";
import type { CreativeBriefRow } from "@/lib/creative-director/types";

export function mapCreativeBriefRow(row: CreativeBriefRow): {
  brief: CreativeBrief;
  isAiEnhanced: boolean;
  updatedAt: string;
} {
  const raw = row.brief as CreativeBrief;
  return {
    brief: {
      ...raw,
      campaignTitle: raw.campaignTitle ?? "",
      personality: raw.personality ?? [],
      emotionalTone: raw.emotionalTone ?? [],
      colorPalette: raw.colorPalette ?? [],
      iconRecommendations: raw.iconRecommendations ?? [],
      consistencyRules: raw.consistencyRules ?? [],
      doNotUse: raw.doNotUse ?? [],
    },
    isAiEnhanced: row.is_ai_enhanced,
    updatedAt: row.updated_at,
  };
}

export function mapStyleMemoryRow(row: StyleMemoryRow): StyleMemoryEntry {
  const style = row.style as StyleMemoryEntry["style"];
  return {
    id: row.id,
    organizationId: row.organization_id,
    sourceEventId: row.source_event_id,
    sourceAssetId: row.source_asset_id,
    eventTitle: row.event_title,
    assetType: row.asset_type,
    style: {
      style: style.style ?? "",
      colors: style.colors ?? [],
      composition: style.composition ?? "",
      illustrationType: style.illustrationType ?? "",
      fontStyle: style.fontStyle ?? "",
      tone: style.tone ?? "",
    },
    approvedAt: row.approved_at,
  };
}

export function parseAiReview(value: unknown): AiReviewResult | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (record.verdict !== "looks_good" && record.verdict !== "suggestions") return null;
  return {
    verdict: record.verdict,
    suggestions: Array.isArray(record.suggestions)
      ? record.suggestions.filter((item): item is string => typeof item === "string")
      : [],
    checkedAt: typeof record.checkedAt === "string" ? record.checkedAt : new Date().toISOString(),
  };
}

export function parseInspirationMatch(value: unknown): InspirationMatchResult | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (typeof record.message !== "string") return null;
  return {
    message: record.message,
    matchedAssetId: typeof record.matchedAssetId === "string" ? record.matchedAssetId : null,
    matchedEventTitle:
      typeof record.matchedEventTitle === "string" ? record.matchedEventTitle : null,
    recommendedAction:
      record.recommendedAction === "use_style" || record.recommendedAction === "similar"
        ? record.recommendedAction
        : null,
  };
}
