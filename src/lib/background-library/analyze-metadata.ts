import "server-only";

import { generateText, isAiConfigured } from "@/lib/ai/provider";
import { resolveQualityDraftModel } from "@/lib/ai/models";
import {
  createAdminClient,
  isSupabaseAdminConfigured,
} from "@/lib/supabase/admin";
import {
  parseBackgroundAssetVisionMetadata,
  type BackgroundAssetVisionMetadata,
} from "./metadata-parse.ts";

export type { BackgroundAssetVisionMetadata };
export { parseBackgroundAssetVisionMetadata } from "./metadata-parse.ts";

const SYSTEM_PROMPT = `You catalog school / PTA / organization background artwork for a searchable library.
Look at the IMAGE itself (not filenames or prompts). Return JSON only with:
- title: clean Title Case name, 3–8 words, no dates/UUIDs/underscores (e.g. "Lavender School Supplies Background")
- filenameLabel: short kebab-case filename ending in .png (e.g. "lavender-school-supplies-background.png")
- description: one plain sentence describing the scene
- tags: 6–14 short searchable phrases (occasion, colors, objects, style, audience). lowercase preferred
- colors: 2–6 color names or simple hex if clearly dominant
- style: short phrase (illustrated, photo, minimal, watercolor, flat vector, etc.)
- audience: short phrase (elementary, middle school, high school, families, PTA, any)
- objects: visible things (notebook, pencil, scissors, leaves, …)
- season: one of anytime|fall|winter|spring|summer
- schoolLevel: one of any|elementary|middle|high
- librarySlugs: 1–3 of: back-to-school|fall|winter|sports|generic|graduation

Be specific and search-friendly. Prefer real visual content over generic filler.`;

export async function analyzeBackgroundImageMetadata(input: {
  imageUrl: string;
  organizationId: string;
  userId?: string | null;
}): Promise<
  | { success: true; metadata: BackgroundAssetVisionMetadata }
  | { success: false; message: string }
> {
  if (!isAiConfigured()) {
    return { success: false, message: "AI is not configured." };
  }
  const imageUrl = input.imageUrl.trim();
  if (!imageUrl) {
    return { success: false, message: "Missing image URL." };
  }

  const result = await generateText({
    systemPrompt: SYSTEM_PROMPT,
    userPrompt:
      "Describe and tag this background image for a school creative library. Return JSON only.",
    imageUrl,
    jsonMode: true,
    maxTokens: 700,
    temperature: 0.2,
    model: resolveQualityDraftModel(),
    usage: {
      actionType: "background_library_metadata",
      organizationId: input.organizationId,
      userId: input.userId ?? null,
      feature: "background_library_metadata",
    },
  });

  if (!result.success || !result.text) {
    return {
      success: false,
      message: result.error || "Could not analyze the image.",
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(result.text);
  } catch {
    return { success: false, message: "AI returned invalid metadata JSON." };
  }

  const metadata = parseBackgroundAssetVisionMetadata(parsed);
  if (!metadata) {
    return { success: false, message: "AI metadata was incomplete." };
  }
  return { success: true, metadata };
}

export async function applyBackgroundAssetVisionMetadata(input: {
  assetId: string;
  organizationId: string;
  userId?: string | null;
  /** When true and asset has no libraries, apply suggested collection slugs. */
  applyLibrarySuggestions?: boolean;
}): Promise<{ success: boolean; message: string }> {
  if (!isSupabaseAdminConfigured()) {
    return { success: false, message: "Database admin is not configured." };
  }
  const admin = createAdminClient();
  const { data: row, error } = await admin
    .from("background_assets")
    .select("id, public_url")
    .eq("id", input.assetId)
    .maybeSingle();
  if (error || !row) {
    return { success: false, message: "Background not found." };
  }

  const analyzed = await analyzeBackgroundImageMetadata({
    imageUrl: (row as { public_url: string }).public_url,
    organizationId: input.organizationId,
    userId: input.userId,
  });
  if (!analyzed.success) {
    return { success: false, message: analyzed.message };
  }

  const meta = analyzed.metadata;
  const { error: updateError } = await admin
    .from("background_assets")
    .update({
      title: meta.title,
      filename_label: meta.filenameLabel,
      description: meta.description,
      tags: meta.tags,
      colors: meta.colors,
      style: meta.style,
      audience: meta.audience,
      objects: meta.objects,
      season: meta.season,
      school_level: meta.schoolLevel,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.assetId);

  if (updateError) {
    return { success: false, message: updateError.message };
  }

  if (input.applyLibrarySuggestions !== false) {
    const { data: existingJoins } = await admin
      .from("background_asset_libraries")
      .select("library_id")
      .eq("asset_id", input.assetId);
    if (!existingJoins || existingJoins.length === 0) {
      const { data: libs } = await admin
        .from("background_libraries")
        .select("id, slug")
        .in("slug", meta.librarySlugs);
      const libraryIds = (
        (libs ?? []) as Array<{ id: string; slug: string }>
      ).map((lib) => lib.id);
      if (libraryIds.length > 0) {
        await admin.from("background_asset_libraries").insert(
          libraryIds.map((libraryId) => ({
            asset_id: input.assetId,
            library_id: libraryId,
          })),
        );
      }
    }
  }

  return { success: true, message: "Metadata updated from image analysis." };
}

export async function analyzeBackgroundAssetsBatch(input: {
  assetIds: string[];
  organizationId: string;
  userId?: string | null;
  applyLibrarySuggestions?: boolean;
}): Promise<{ analyzed: number; failed: number }> {
  const ids = [...new Set(input.assetIds.filter(Boolean))];
  let analyzed = 0;
  let failed = 0;
  const concurrency = 3;
  for (let i = 0; i < ids.length; i += concurrency) {
    const slice = ids.slice(i, i + concurrency);
    const results = await Promise.all(
      slice.map((assetId) =>
        applyBackgroundAssetVisionMetadata({
          assetId,
          organizationId: input.organizationId,
          userId: input.userId,
          applyLibrarySuggestions: input.applyLibrarySuggestions,
        }),
      ),
    );
    for (const result of results) {
      if (result.success) analyzed += 1;
      else failed += 1;
    }
  }
  return { analyzed, failed };
}
