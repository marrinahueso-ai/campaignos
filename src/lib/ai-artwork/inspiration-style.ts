import type { InspirationStrength, InspirationStyleProfile } from "@/lib/ai-artwork/types";

function layoutFromAssetType(assetType: string): string {
  if (assetType.includes("story")) {
    return "Vertical story layout with stacked content zones and generous top/bottom margins.";
  }
  if (assetType.includes("banner") || assetType.includes("hero")) {
    return "Wide horizontal layout with a dominant visual field and headline band.";
  }
  if (assetType === "flyer") {
    return "Print flyer hierarchy with headline zone, central artwork, and detail footer band.";
  }
  return "Balanced campaign graphic with clear focal point and structured content regions.";
}

function readString(record: Record<string, unknown>, key: string, fallback: string): string {
  return typeof record[key] === "string" && record[key].length > 0
    ? (record[key] as string)
    : fallback;
}

export function parseInspirationStrength(
  value: unknown,
  inspirationAssetId: string | null,
): InspirationStrength {
  if (value === "light" || value === "medium" || value === "strong") {
    return value;
  }
  return inspirationAssetId ? "strong" : "medium";
}

export function parseInspirationStyleProfile(value: unknown): InspirationStyleProfile | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const sourceAssetId =
    typeof record.sourceAssetId === "string" ? record.sourceAssetId : "";
  const summary = typeof record.summary === "string" ? record.summary : "";

  if (!sourceAssetId || !summary) {
    return null;
  }

  const illustrationStyle = readString(record, "illustrationStyle", "Campaign illustration style.");
  const subjectMatter = readString(
    record,
    "subjectMatter",
    readString(record, "composition", "Campaign visual subject aligned with the inspiration."),
  );

  return {
    sourceAssetId,
    subjectMatter,
    colorPalette: readString(record, "colorPalette", "On-brand school palette."),
    layout: readString(record, "layout", layoutFromAssetType("miscellaneous")),
    visualType: readString(
      record,
      "visualType",
      readString(record, "illustrationStyle", "Campaign graphic style."),
    ),
    illustrationStyle,
    whitespace: readString(record, "whitespace", "Balanced whitespace."),
    typographyFeel: readString(record, "typographyFeel", "Friendly headline hierarchy."),
    composition: readString(record, "composition", "Balanced campaign composition."),
    mood: readString(record, "mood", "On-brand campaign mood."),
    avoidList: readString(
      record,
      "avoidList",
      "Generic clipart, unrelated stock imagery, copied logos or text from the inspiration.",
    ),
    summary,
    analyzedAt:
      typeof record.analyzedAt === "string"
        ? record.analyzedAt
        : new Date().toISOString(),
  };
}
