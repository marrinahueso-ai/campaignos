"use server";

import { revalidatePath } from "next/cache";

import { getAuthUser } from "@/lib/auth/queries";
import { canAccessOwnerOps } from "@/lib/ops/access";
import {
  createAdminClient,
  isSupabaseAdminConfigured,
} from "@/lib/supabase/admin";
import { BACKGROUND_LIBRARY_BATCH_SIZE } from "./constants.ts";
import { generateBackgroundBatchFromSource } from "./generate.ts";
import { getBackgroundSourceById } from "./queries.ts";
import {
  buildBackgroundStoragePath,
  deletePlatformBackgroundPath,
  uploadPlatformBackgroundBytes,
} from "./storage.ts";
import type {
  BackgroundAssetStatus,
  BackgroundSchoolLevel,
  BackgroundSeason,
} from "./types.ts";

function revalidateLibrary() {
  revalidatePath("/ops/background-library");
}

async function requireOwner(): Promise<
  { ok: true; userId: string } | { ok: false; message: string }
> {
  if (!(await canAccessOwnerOps())) {
    return { ok: false, message: "Owner access required." };
  }
  if (!isSupabaseAdminConfigured()) {
    return { ok: false, message: "Database admin is not configured." };
  }
  const user = await getAuthUser();
  if (!user?.id) {
    return { ok: false, message: "Sign in required." };
  }
  return { ok: true, userId: user.id };
}

function parseTags(value: string): string[] {
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 24);
}

export async function uploadBackgroundSourceAction(formData: FormData): Promise<{
  success: boolean;
  message: string;
  sourceId?: string;
}> {
  const gate = await requireOwner();
  if (!gate.ok) return { success: false, message: gate.message };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size <= 0) {
    return { success: false, message: "Choose an inspiration image to upload." };
  }
  if (file.size > 12 * 1024 * 1024) {
    return { success: false, message: "Image must be 12MB or smaller." };
  }

  const title =
    String(formData.get("title") ?? "").trim() ||
    file.name.replace(/\.[^.]+$/, "") ||
    "Inspiration source";
  const notes = String(formData.get("notes") ?? "").trim();
  const bytes = Buffer.from(await file.arrayBuffer());
  const contentType = file.type || "image/png";
  const storagePath = buildBackgroundStoragePath("sources", file.name || "source.png");
  const uploaded = await uploadPlatformBackgroundBytes({
    storagePath,
    bytes,
    contentType,
  });
  if (!uploaded.success) {
    return { success: false, message: uploaded.error };
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("background_sources")
    .insert({
      title,
      notes,
      storage_path: storagePath,
      public_url: uploaded.publicUrl,
      created_by: gate.userId,
    })
    .select("id")
    .single();

  if (error || !data) {
    return {
      success: false,
      message: error?.message ?? "Could not save source graphic.",
    };
  }

  revalidateLibrary();
  return {
    success: true,
    message: "Source graphic uploaded.",
    sourceId: (data as { id: string }).id,
  };
}

export async function generateBackgroundBatchAction(input: {
  sourceId: string;
  count?: number;
}): Promise<{
  success: boolean;
  message: string;
  createdCount: number;
}> {
  const gate = await requireOwner();
  if (!gate.ok) {
    return { success: false, message: gate.message, createdCount: 0 };
  }

  const source = await getBackgroundSourceById(input.sourceId);
  if (!source) {
    return { success: false, message: "Source graphic not found.", createdCount: 0 };
  }

  const result = await generateBackgroundBatchFromSource(
    source,
    input.count ?? BACKGROUND_LIBRARY_BATCH_SIZE,
  );
  revalidateLibrary();
  return {
    success: result.success,
    message: result.message,
    createdCount: result.createdCount,
  };
}

export async function updateBackgroundAssetAction(input: {
  assetId: string;
  title: string;
  tags: string;
  colors: string;
  season: BackgroundSeason;
  schoolLevel: BackgroundSchoolLevel;
  libraryIds: string[];
}): Promise<{ success: boolean; message: string }> {
  const gate = await requireOwner();
  if (!gate.ok) return { success: false, message: gate.message };

  const admin = createAdminClient();
  const { error } = await admin
    .from("background_assets")
    .update({
      title: input.title.trim() || "Untitled background",
      tags: parseTags(input.tags),
      colors: parseTags(input.colors),
      season: input.season,
      school_level: input.schoolLevel,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.assetId);

  if (error) {
    return { success: false, message: error.message };
  }

  await admin
    .from("background_asset_libraries")
    .delete()
    .eq("asset_id", input.assetId);

  const uniqueLibraryIds = [...new Set(input.libraryIds.filter(Boolean))];
  if (uniqueLibraryIds.length > 0) {
    const { error: joinError } = await admin.from("background_asset_libraries").insert(
      uniqueLibraryIds.map((libraryId) => ({
        asset_id: input.assetId,
        library_id: libraryId,
      })),
    );
    if (joinError) {
      return { success: false, message: joinError.message };
    }
  }

  revalidateLibrary();
  return { success: true, message: "Saved." };
}

export async function approveBackgroundAssetsAction(input: {
  assetIds: string[];
  libraryIds: string[];
}): Promise<{ success: boolean; message: string }> {
  const gate = await requireOwner();
  if (!gate.ok) return { success: false, message: gate.message };

  const assetIds = [...new Set(input.assetIds.filter(Boolean))];
  const libraryIds = [...new Set(input.libraryIds.filter(Boolean))];
  if (assetIds.length === 0) {
    return { success: false, message: "Select at least one background." };
  }
  if (libraryIds.length === 0) {
    return {
      success: false,
      message: "Assign at least one library before publishing.",
    };
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();

  for (const assetId of assetIds) {
    await admin.from("background_asset_libraries").delete().eq("asset_id", assetId);
    const { error: joinError } = await admin.from("background_asset_libraries").insert(
      libraryIds.map((libraryId) => ({
        asset_id: assetId,
        library_id: libraryId,
      })),
    );
    if (joinError) {
      return { success: false, message: joinError.message };
    }

    const { error } = await admin
      .from("background_assets")
      .update({
        status: "published" satisfies BackgroundAssetStatus,
        reviewed_by: gate.userId,
        reviewed_at: now,
        updated_at: now,
      })
      .eq("id", assetId)
      .eq("status", "pending_review");

    if (error) {
      return { success: false, message: error.message };
    }
  }

  revalidateLibrary();
  return {
    success: true,
    message: `Published ${assetIds.length} background${assetIds.length === 1 ? "" : "s"}.`,
  };
}

export async function rejectBackgroundAssetsAction(input: {
  assetIds: string[];
}): Promise<{ success: boolean; message: string }> {
  const gate = await requireOwner();
  if (!gate.ok) return { success: false, message: gate.message };

  const assetIds = [...new Set(input.assetIds.filter(Boolean))];
  if (assetIds.length === 0) {
    return { success: false, message: "Select at least one background." };
  }

  const admin = createAdminClient();
  const { data } = await admin
    .from("background_assets")
    .select("id, storage_path")
    .in("id", assetIds);

  for (const row of (data ?? []) as Array<{ id: string; storage_path: string }>) {
    await deletePlatformBackgroundPath(row.storage_path);
  }

  const { error } = await admin
    .from("background_assets")
    .delete()
    .in("id", assetIds);

  if (error) {
    return { success: false, message: error.message };
  }

  revalidateLibrary();
  return {
    success: true,
    message: `Deleted ${assetIds.length} background${assetIds.length === 1 ? "" : "s"}.`,
  };
}

export async function setBackgroundAssetStatusAction(input: {
  assetId: string;
  status: Extract<BackgroundAssetStatus, "published" | "archived">;
}): Promise<{ success: boolean; message: string }> {
  const gate = await requireOwner();
  if (!gate.ok) return { success: false, message: gate.message };

  const admin = createAdminClient();
  const { error } = await admin
    .from("background_assets")
    .update({
      status: input.status,
      reviewed_by: gate.userId,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.assetId);

  if (error) {
    return { success: false, message: error.message };
  }

  revalidateLibrary();
  return {
    success: true,
    message: input.status === "archived" ? "Archived." : "Restored to published.",
  };
}

export async function deleteBackgroundSourceAction(input: {
  sourceId: string;
}): Promise<{ success: boolean; message: string }> {
  const gate = await requireOwner();
  if (!gate.ok) return { success: false, message: gate.message };

  const source = await getBackgroundSourceById(input.sourceId);
  if (!source) {
    return { success: false, message: "Source not found." };
  }

  const admin = createAdminClient();
  await deletePlatformBackgroundPath(source.storagePath);
  const { error } = await admin
    .from("background_sources")
    .delete()
    .eq("id", input.sourceId);

  if (error) {
    return { success: false, message: error.message };
  }

  revalidateLibrary();
  return { success: true, message: "Source deleted." };
}

/** Optional hook for flyer/social when a published library asset is used. */
export async function incrementBackgroundAssetUsageAction(
  assetId: string,
): Promise<void> {
  if (!isSupabaseAdminConfigured() || !assetId) return;
  const admin = createAdminClient();
  const { data } = await admin
    .from("background_assets")
    .select("usage_count")
    .eq("id", assetId)
    .eq("status", "published")
    .maybeSingle();
  if (!data) return;
  const next = ((data as { usage_count: number }).usage_count ?? 0) + 1;
  await admin
    .from("background_assets")
    .update({ usage_count: next, updated_at: new Date().toISOString() })
    .eq("id", assetId);
}
