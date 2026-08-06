import "server-only";

import { isAiConfigured } from "@/lib/ai/provider";
import { generateArtworkV2ImageNative } from "@/lib/artwork-v2/orchestrator";
import { getAuthUser } from "@/lib/auth/queries";
import { getLatestOrganization } from "@/lib/organizations/queries";
import {
  createAdminClient,
  isSupabaseAdminConfigured,
} from "@/lib/supabase/admin";
import { BACKGROUND_LIBRARY_BATCH_SIZE } from "./constants.ts";
import { buildBackgroundLibraryVariationPrompt } from "./prompt.ts";
import {
  buildBackgroundStoragePath,
  uploadPlatformBackgroundBytes,
} from "./storage.ts";
import type { BackgroundSource } from "./types.ts";

export type GenerateBackgroundBatchResult = {
  success: boolean;
  message: string;
  createdCount: number;
  failedCount: number;
  assetIds: string[];
};

export async function generateBackgroundBatchFromSource(
  source: BackgroundSource,
  count: number = BACKGROUND_LIBRARY_BATCH_SIZE,
): Promise<GenerateBackgroundBatchResult> {
  if (!isSupabaseAdminConfigured()) {
    return {
      success: false,
      message: "Database admin is not configured.",
      createdCount: 0,
      failedCount: 0,
      assetIds: [],
    };
  }
  if (!isAiConfigured()) {
    return {
      success: false,
      message: "AI image generation is not configured.",
      createdCount: 0,
      failedCount: 0,
      assetIds: [],
    };
  }

  const authUser = await getAuthUser();
  const organization = await getLatestOrganization();
  if (!organization?.id) {
    return {
      success: false,
      message:
        "Could not attribute AI credits to an organization. Sign in with an active org, then retry.",
      createdCount: 0,
      failedCount: 0,
      assetIds: [],
    };
  }

  const admin = createAdminClient();
  const batchSize = Math.min(
    BACKGROUND_LIBRARY_BATCH_SIZE,
    Math.max(1, Math.floor(count)),
  );
  const assetIds: string[] = [];
  let failedCount = 0;

  for (let index = 1; index <= batchSize; index += 1) {
    const userPrompt = buildBackgroundLibraryVariationPrompt({
      sourceTitle: source.title,
      variationIndex: index,
      batchSize,
    });

    const result = await generateArtworkV2ImageNative(
      {
        kind: "create",
        userPrompt,
        inspirationImageUrls: [source.publicUrl],
      },
      "auto",
      null,
      { quality: "high", reasoningEffort: "medium" },
      {
        userId: authUser?.id ?? null,
        organizationId: organization.id,
        isRegeneration: false,
        milestoneLabel: "background_library",
        relativeDay: null,
      },
    );

    if (!result.success || !result.imageBase64) {
      failedCount += 1;
      continue;
    }

    const bytes = Buffer.from(result.imageBase64, "base64");
    const storagePath = buildBackgroundStoragePath("assets", `variation-${index}.png`);
    const uploaded = await uploadPlatformBackgroundBytes({
      storagePath,
      bytes,
      contentType: "image/png",
    });
    if (!uploaded.success) {
      failedCount += 1;
      continue;
    }

    const titleBase = source.title.trim() || "Library background";
    const { data: inserted, error } = await admin
      .from("background_assets")
      .insert({
        source_id: source.id,
        status: "pending_review",
        title: `${titleBase} · ${index}`,
        tags: [],
        colors: [],
        season: "anytime",
        school_level: "any",
        storage_path: storagePath,
        public_url: uploaded.publicUrl,
        created_by: authUser?.id ?? null,
      })
      .select("id")
      .single();

    if (error || !inserted) {
      failedCount += 1;
      continue;
    }
    assetIds.push((inserted as { id: string }).id);
  }

  const createdCount = assetIds.length;
  if (createdCount === 0) {
    return {
      success: false,
      message:
        failedCount > 0
          ? "Could not generate any backgrounds. Check AI credits and try again."
          : "No backgrounds were created.",
      createdCount: 0,
      failedCount,
      assetIds: [],
    };
  }

  return {
    success: true,
    message:
      failedCount > 0
        ? `Created ${createdCount} of ${batchSize} backgrounds (${failedCount} failed).`
        : `Created ${createdCount} backgrounds in the review queue.`,
    createdCount,
    failedCount,
    assetIds,
  };
}
