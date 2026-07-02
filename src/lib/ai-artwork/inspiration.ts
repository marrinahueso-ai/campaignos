import "server-only";

import { mapInspirationAsset } from "@/lib/creative-assets/mappers";
import type { InspirationAsset } from "@/lib/creative-assets/types";
import { getCreativeAssetTypeLabel } from "@/lib/creative-assets/constants";
import { resolveFastDraftModel } from "@/lib/ai/models";
import type {
  InspirationStrength,
  InspirationStyleProfile,
  InspirationUsageMode,
} from "@/lib/ai-artwork/types";
import type { CreativeDirectorContext } from "@/lib/creative-director/types";
import { mapEventAssetRow } from "@/lib/event-workspace/mappers";
import { resolveAssetImageUrl } from "@/lib/event-workspace/storage";
import { getLatestOrganization } from "@/lib/organizations/queries";
import { createClient } from "@/lib/supabase/server";
import type { EventAssetRow } from "@/types/event-workspace";

const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";

export interface ResolvedInspirationContext {
  asset: InspirationAsset;
  profile: InspirationStyleProfile;
  usageMode: InspirationUsageMode;
  strength: InspirationStrength;
  promptBlock: string;
  referenceImageUrl: string | null;
}

function inspirationHaystack(asset: InspirationAsset): string {
  return [asset.eventTitle, asset.filename ?? "", asset.assetType, ...asset.tags]
    .join(" ")
    .toLowerCase();
}

export function isApparelOrProductInspiration(asset: InspirationAsset): boolean {
  const haystack = inspirationHaystack(asset);
  return /spirit|apparel|merchandise|merch|store|shirt|hoodie|product|gear|t-?shirt|sweatshirt|wear|uniform|logo.?wear/.test(
    haystack,
  );
}

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

function whitespaceFromTags(tags: string[]): string {
  if (tags.some((tag) => tag.includes("minimal") || tag.includes("clean"))) {
    return "Generous whitespace with uncluttered breathing room around focal elements.";
  }
  if (tags.some((tag) => tag.includes("bold") || tag.includes("playful"))) {
    return "Moderate whitespace with energetic, filled areas balanced by open pockets.";
  }
  return "Balanced whitespace — neither overly dense nor overly sparse.";
}

function typographyFeelFromTags(tags: string[]): string {
  if (tags.some((tag) => tag.includes("typography"))) {
    return "Typography-forward feel — strong hierarchy and confident headline presence.";
  }
  if (tags.some((tag) => tag.includes("professional"))) {
    return "Clean, professional type hierarchy with readable sans-serif sensibility.";
  }
  if (tags.some((tag) => tag.includes("playful"))) {
    return "Friendly, rounded headline feel with approachable school-community tone.";
  }
  return "Clear headline/subhead hierarchy with friendly school-communication tone.";
}

function illustrationStyleFromTags(tags: string[], assetType: string): string {
  if (tags.some((tag) => tag.includes("photo"))) {
    return "Warm photographic style with natural lighting.";
  }
  if (tags.some((tag) => tag.includes("illustrated"))) {
    return "Hand-illustrated campaign artwork with soft, approachable lines.";
  }
  if (tags.some((tag) => tag.includes("bold"))) {
    return "Bold graphic illustration with strong shapes and contrast.";
  }
  const typeLabel = getCreativeAssetTypeLabel(
    assetType as InspirationAsset["assetType"],
  );
  return `Campaign ${typeLabel.toLowerCase()} style — on-brand school visual language.`;
}

function colorPaletteFromTags(tags: string[]): string {
  if (tags.some((tag) => tag.includes("bright"))) {
    return "Bright, saturated palette with high-energy accent colors.";
  }
  if (tags.some((tag) => tag.includes("warm"))) {
    return "Warm, welcoming palette with golden and soft accent tones.";
  }
  if (tags.some((tag) => tag.includes("minimal") || tag.includes("clean"))) {
    return "Restrained palette with one strong accent and plenty of neutral space.";
  }
  if (tags.length > 0) {
    return `Palette direction inspired by: ${tags.join(", ")}.`;
  }
  return "School-friendly palette with clear primary accent and supporting neutrals.";
}

function buildApparelStyleProfile(asset: InspirationAsset): InspirationStyleProfile {
  return {
    sourceAssetId: asset.assetId,
    subjectMatter:
      "School spirit apparel and merchandise — shirts, hoodies, or branded gear displayed as products.",
    colorPalette: "School brand colors on apparel against a clean, minimal background.",
    layout:
      "Clean promotional layout with apparel as the hero focus, minimal background, product display feel.",
    visualType: "Product/merchandise promotional photography or clean product mockup layout.",
    illustrationStyle:
      "Product photography or realistic merchandise mockup — not illustration of people.",
    whitespace: "Generous minimal background with product centered or grid-displayed.",
    typographyFeel:
      "Bold promotional headline zones reserved — typography added as overlay later.",
    composition:
      "Hero product focus with optional secondary items; e-commerce or spirit-store promotional feel.",
    mood: "Clean, promotional, spirit-store energy — professional merchandise display.",
    avoidList:
      "Generic school clipart, students standing together in groups, cartoon mascots unless in inspiration, busy cafeteria scenes, unrelated lifestyle photography.",
    summary:
      "Match the spirit-store apparel/merchandise promotional style — product-forward layout with school colors and minimal background. Do not fall back to generic school-family clipart.",
    analyzedAt: new Date().toISOString(),
  };
}

export function buildHeuristicStyleProfile(asset: InspirationAsset): InspirationStyleProfile {
  if (isApparelOrProductInspiration(asset)) {
    return buildApparelStyleProfile(asset);
  }

  const tags = asset.tags.map((tag) => tag.toLowerCase());

  return {
    sourceAssetId: asset.assetId,
    subjectMatter: `Visual subject aligned with ${asset.eventTitle} campaign artwork.`,
    colorPalette: colorPaletteFromTags(tags),
    layout: layoutFromAssetType(asset.assetType),
    visualType: illustrationStyleFromTags(tags, asset.assetType),
    illustrationStyle: illustrationStyleFromTags(tags, asset.assetType),
    whitespace: whitespaceFromTags(tags),
    typographyFeel: typographyFeelFromTags(tags),
    composition: `Center-weighted composition similar to ${asset.eventTitle} ${getCreativeAssetTypeLabel(asset.assetType).toLowerCase()} artwork.`,
    mood: "On-brand school campaign energy matching the inspiration source.",
    avoidList:
      "Generic stock clipart, unrelated scenes, copied logos or text from the inspiration artwork.",
    summary: `Match the visual direction of "${asset.eventTitle}" (${asset.filename ?? asset.assetType}) without copying it exactly.`,
    analyzedAt: new Date().toISOString(),
  };
}

function mergeApparelProfile(
  profile: InspirationStyleProfile,
  asset: InspirationAsset,
): InspirationStyleProfile {
  if (!isApparelOrProductInspiration(asset)) {
    return profile;
  }

  const apparel = buildApparelStyleProfile(asset);
  return {
    ...profile,
    subjectMatter: profile.subjectMatter.includes("apparel") ? profile.subjectMatter : apparel.subjectMatter,
    visualType: profile.visualType.toLowerCase().includes("product")
      ? profile.visualType
      : apparel.visualType,
    layout: profile.layout.toLowerCase().includes("product")
      ? profile.layout
      : `${profile.layout} ${apparel.layout}`,
    avoidList: `${profile.avoidList} ${apparel.avoidList}`.trim(),
    summary: profile.summary.includes("apparel") || profile.summary.includes("merchandise")
      ? profile.summary
      : apparel.summary,
  };
}

export async function loadInspirationAssetById(
  assetId: string,
): Promise<InspirationAsset | null> {
  const supabase = await createClient();
  const { data: assetRow, error } = await supabase
    .from("event_assets")
    .select("*")
    .eq("id", assetId)
    .eq("status", "uploaded")
    .maybeSingle();

  if (error || !assetRow) {
    return null;
  }

  const asset = mapEventAssetRow(assetRow as EventAssetRow);
  if (!asset.storagePath) {
    return null;
  }

  const { data: eventRow } = await supabase
    .from("events")
    .select("title, date, status")
    .eq("id", asset.eventId)
    .maybeSingle();

  if (!eventRow || eventRow.status === "archived") {
    return null;
  }

  const organization = await getLatestOrganization();

  return mapInspirationAsset({
    asset,
    eventTitle: eventRow.title as string,
    eventDate: eventRow.date as string,
    schoolYear: organization?.schoolYear ?? null,
  });
}

export async function findInspirationAsset(
  assetId: string,
  context: CreativeDirectorContext,
): Promise<InspirationAsset | null> {
  const fromLibrary = context.inspirationAssets.find((item) => item.assetId === assetId);
  if (fromLibrary?.storagePath) {
    return fromLibrary;
  }

  const fromCurrentEvent = context.assets.find(
    (asset) => asset.id === assetId && asset.status === "uploaded" && asset.storagePath,
  );
  if (fromCurrentEvent) {
    return mapInspirationAsset({
      asset: fromCurrentEvent,
      eventTitle: context.event.title,
      eventDate: context.event.date,
      schoolYear: null,
    });
  }

  return loadInspirationAssetById(assetId);
}

async function analyzeInspirationStyleFromImage(
  asset: InspirationAsset,
): Promise<InspirationStyleProfile | null> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  const imageUrl = resolveAssetImageUrl(asset.storagePath);
  if (!apiKey || !imageUrl) {
    return null;
  }

  const apparelHint = isApparelOrProductInspiration(asset)
    ? "This appears to be apparel/merchandise/spirit-store artwork — prioritize product display, clean promotional layout, and school colors on minimal background."
    : "";

  try {
    const response = await fetch(OPENAI_CHAT_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: resolveFastDraftModel(),
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: [
                  "Analyze this campaign artwork image for STYLE ONLY.",
                  apparelHint,
                  "Return JSON with keys: subjectMatter, colorPalette, layout, visualType, illustrationStyle, whitespace, typographyFeel, composition, mood, avoidList, summary.",
                  "subjectMatter: what is shown (e.g. apparel products, event scene, food, sports).",
                  "visualType: product photo, illustration, mixed media, etc.",
                  "avoidList: what a new artwork should NOT do (e.g. generic clipart, wrong subject).",
                  "Do not transcribe text from the image.",
                  "Summary must say to match style without copying the artwork exactly.",
                ]
                  .filter(Boolean)
                  .join(" "),
              },
              {
                type: "image_url",
                image_url: { url: imageUrl, detail: "high" },
              },
            ],
          },
        ],
        max_tokens: 700,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      return null;
    }

    const parsed = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = parsed.choices?.[0]?.message?.content;
    if (!content) {
      return null;
    }

    const style = JSON.parse(content) as Record<string, string>;
    const profile: InspirationStyleProfile = {
      sourceAssetId: asset.assetId,
      subjectMatter:
        style.subjectMatter ??
        `Visual subject from "${asset.eventTitle}" inspiration artwork.`,
      colorPalette: style.colorPalette ?? colorPaletteFromTags(asset.tags),
      layout: style.layout ?? layoutFromAssetType(asset.assetType),
      visualType:
        style.visualType ??
        style.illustrationStyle ??
        illustrationStyleFromTags(asset.tags, asset.assetType),
      illustrationStyle:
        style.illustrationStyle ?? illustrationStyleFromTags(asset.tags, asset.assetType),
      whitespace: style.whitespace ?? whitespaceFromTags(asset.tags),
      typographyFeel: style.typographyFeel ?? typographyFeelFromTags(asset.tags),
      composition: style.composition ?? "Balanced campaign composition.",
      mood: style.mood ?? "On-brand campaign mood matching the inspiration.",
      avoidList:
        style.avoidList ??
        "Generic clipart, copied logos or text, unrelated stock imagery.",
      summary:
        style.summary ??
        `Match the style of "${asset.eventTitle}" without copying the artwork exactly.`,
      analyzedAt: new Date().toISOString(),
    };

    return mergeApparelProfile(profile, asset);
  } catch {
    return null;
  }
}

export function formatInspirationStyleForPrompt(
  asset: InspirationAsset,
  profile: InspirationStyleProfile,
  usageMode: InspirationUsageMode,
): string {
  if (usageMode === "image_reference") {
    return `Reference: "${asset.eventTitle}" — ${profile.summary}`;
  }
  return `"${asset.eventTitle}": ${profile.summary}`;
}

export async function resolveInspirationContext(input: {
  inspirationAssetId: string | null;
  existingProfile: InspirationStyleProfile | null;
  context: CreativeDirectorContext;
  usageMode: InspirationUsageMode;
  strength: InspirationStrength;
  refreshProfile?: boolean;
}): Promise<ResolvedInspirationContext | null> {
  if (!input.inspirationAssetId) {
    return null;
  }

  const asset = await findInspirationAsset(input.inspirationAssetId, input.context);
  if (!asset) {
    return null;
  }

  let profile =
    !input.refreshProfile &&
    input.existingProfile?.sourceAssetId === input.inspirationAssetId
      ? input.existingProfile
      : null;

  if (!profile) {
    profile =
      (await analyzeInspirationStyleFromImage(asset)) ?? buildHeuristicStyleProfile(asset);
  } else {
    profile = mergeApparelProfile(profile, asset);
  }

  const referenceImageUrl = resolveAssetImageUrl(asset.storagePath);

  return {
    asset,
    profile,
    usageMode: input.usageMode,
    strength: input.strength,
    promptBlock: formatInspirationStyleForPrompt(
      asset,
      profile,
      input.usageMode,
    ),
    referenceImageUrl,
  };
}

function emptyInspirationProfile(sourceAssetId: string): InspirationStyleProfile {
  return {
    sourceAssetId,
    subjectMatter: "",
    colorPalette: "",
    layout: "",
    visualType: "",
    illustrationStyle: "",
    whitespace: "",
    typographyFeel: "",
    composition: "",
    mood: "",
    avoidList: "",
    summary: "",
    analyzedAt: new Date(0).toISOString(),
  };
}

/** Image reference only — no style analysis, no prompt block, no creative memory. */
export async function resolveInspirationImageReference(input: {
  inspirationAssetId: string | null;
  context: CreativeDirectorContext;
  usageMode: InspirationUsageMode;
}): Promise<ResolvedInspirationContext | null> {
  if (!input.inspirationAssetId) {
    return null;
  }

  const asset = await findInspirationAsset(input.inspirationAssetId, input.context);
  if (!asset) {
    return null;
  }

  return {
    asset,
    profile: emptyInspirationProfile(asset.assetId),
    usageMode: input.usageMode,
    strength: "light",
    promptBlock: "",
    referenceImageUrl: resolveAssetImageUrl(asset.storagePath),
  };
}
