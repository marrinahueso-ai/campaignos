"use server";

import { revalidatePath } from "next/cache";

import { getAuthUser } from "@/lib/auth/queries";
import { canAccessOwnerOps } from "@/lib/ops/access";
import {
  createAdminClient,
  isSupabaseAdminConfigured,
} from "@/lib/supabase/admin";
import {
  BACKGROUND_LIBRARY_BATCH_SIZE,
  BACKGROUND_LIBRARY_BULK_UPLOAD_MAX,
  BACKGROUND_LIBRARY_MAX_BYTES,
  BACKGROUND_SEASONS,
  BACKGROUND_SCHOOL_LEVELS,
} from "./constants.ts";
import { generateBackgroundBatchFromSource } from "./generate.ts";
import { getBackgroundSourceById } from "./queries.ts";
import {
  buildBackgroundStoragePath,
  createPlatformBackgroundSignedUpload,
  deletePlatformBackgroundPath,
  getPlatformBackgroundPublicUrl,
  isBackgroundLibraryStoragePath,
  platformBackgroundObjectExists,
  uploadPlatformBackgroundBytes,
} from "./storage.ts";
import type {
  BackgroundAssetStatus,
  BackgroundSchoolLevel,
  BackgroundSeason,
} from "./types.ts";
import {
  collectBackgroundBulkUploadFiles,
  isBackgroundLibraryImageFile,
  titleFromBackgroundFilename,
} from "./upload-validation.ts";
import {
  IMAGE_UPLOAD_EXTENSIONS,
  resolveSafeUploadContentType,
} from "@/lib/uploads/safe-content-type";

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

/**
 * Mint a one-time signed upload URL so the browser can PUT the file straight
 * to Supabase (avoids Vercel / Server Action body size limits).
 */
export async function prepareBackgroundLibraryUploadAction(input: {
  kind: "sources" | "assets";
  filename: string;
}): Promise<{
  success: boolean;
  message: string;
  storagePath?: string;
  token?: string;
  contentType?: string;
  publicUrl?: string;
}> {
  const gate = await requireOwner();
  if (!gate.ok) return { success: false, message: gate.message };

  const filename = input.filename.trim();
  if (!filename) {
    return { success: false, message: "Choose an image to upload." };
  }
  const contentType = resolveSafeUploadContentType(
    filename,
    IMAGE_UPLOAD_EXTENSIONS,
  );
  if (!contentType) {
    return {
      success: false,
      message: "Use a PNG, JPEG, WebP, or GIF image.",
    };
  }

  const prepared = await createPlatformBackgroundSignedUpload({
    kind: input.kind,
    filename,
  });
  if (!prepared.success) {
    return { success: false, message: prepared.error };
  }

  return {
    success: true,
    message: "Upload ready.",
    storagePath: prepared.storagePath,
    token: prepared.token,
    contentType,
    publicUrl: prepared.publicUrl,
  };
}

export async function registerBackgroundSourceUploadAction(input: {
  storagePath: string;
  title: string;
  notes: string;
  filename?: string;
}): Promise<{
  success: boolean;
  message: string;
  sourceId?: string;
}> {
  const gate = await requireOwner();
  if (!gate.ok) return { success: false, message: gate.message };

  if (!isBackgroundLibraryStoragePath("sources", input.storagePath)) {
    return { success: false, message: "Invalid upload path." };
  }
  if (!(await platformBackgroundObjectExists(input.storagePath))) {
    return {
      success: false,
      message: "Upload did not finish. Try again.",
    };
  }

  const title =
    input.title.trim() ||
    titleFromBackgroundFilename(input.filename || "") ||
    "Inspiration source";
  const notes = input.notes.trim();
  const publicUrl = getPlatformBackgroundPublicUrl(input.storagePath);

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("background_sources")
    .insert({
      title,
      notes,
      storage_path: input.storagePath,
      public_url: publicUrl,
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

export async function registerBackgroundAssetUploadsAction(input: {
  items: Array<{ storagePath: string; filename: string }>;
  season: string;
  schoolLevel: string;
  libraryIds: string[];
}): Promise<{
  success: boolean;
  message: string;
  createdCount: number;
  failedCount: number;
  assetIds: string[];
}> {
  const gate = await requireOwner();
  if (!gate.ok) {
    return {
      success: false,
      message: gate.message,
      createdCount: 0,
      failedCount: 0,
      assetIds: [],
    };
  }

  if (input.items.length === 0) {
    return {
      success: false,
      message: "Choose one or more images to upload into the library.",
      createdCount: 0,
      failedCount: 0,
      assetIds: [],
    };
  }
  if (input.items.length > BACKGROUND_LIBRARY_BULK_UPLOAD_MAX) {
    return {
      success: false,
      message: `Upload at most ${BACKGROUND_LIBRARY_BULK_UPLOAD_MAX} images at a time.`,
      createdCount: 0,
      failedCount: 0,
      assetIds: [],
    };
  }

  const defaultSeason = (
    BACKGROUND_SEASONS as readonly string[]
  ).includes(input.season)
    ? (input.season as BackgroundSeason)
    : "anytime";
  const defaultLevel = (
    BACKGROUND_SCHOOL_LEVELS as readonly string[]
  ).includes(input.schoolLevel)
    ? (input.schoolLevel as BackgroundSchoolLevel)
    : "any";
  const libraryIds = [...new Set(input.libraryIds.filter(Boolean))];

  const admin = createAdminClient();
  const assetIds: string[] = [];
  let failedCount = 0;

  for (const item of input.items) {
    if (!isBackgroundLibraryStoragePath("assets", item.storagePath)) {
      failedCount += 1;
      continue;
    }
    if (!(await platformBackgroundObjectExists(item.storagePath))) {
      failedCount += 1;
      continue;
    }

    const title = titleFromBackgroundFilename(item.filename || item.storagePath);
    const publicUrl = getPlatformBackgroundPublicUrl(item.storagePath);
    const { data: inserted, error } = await admin
      .from("background_assets")
      .insert({
        source_id: null,
        status: "pending_review" satisfies BackgroundAssetStatus,
        title,
        tags: [],
        colors: [],
        season: defaultSeason,
        school_level: defaultLevel,
        storage_path: item.storagePath,
        public_url: publicUrl,
        created_by: gate.userId,
      })
      .select("id")
      .single();

    if (error || !inserted) {
      await deletePlatformBackgroundPath(item.storagePath);
      failedCount += 1;
      continue;
    }

    const assetId = (inserted as { id: string }).id;
    if (libraryIds.length > 0) {
      await admin.from("background_asset_libraries").insert(
        libraryIds.map((libraryId) => ({
          asset_id: assetId,
          library_id: libraryId,
        })),
      );
    }
    assetIds.push(assetId);
  }

  const createdCount = assetIds.length;
  revalidateLibrary();

  if (createdCount === 0) {
    return {
      success: false,
      message:
        failedCount > 0
          ? "Could not upload any images. Check file types and try again."
          : "No images were uploaded.",
      createdCount: 0,
      failedCount,
      assetIds: [],
    };
  }

  return {
    success: true,
    message:
      failedCount > 0
        ? `Uploaded ${createdCount} to the review queue (${failedCount} failed).`
        : `Uploaded ${createdCount} background${createdCount === 1 ? "" : "s"} to the review queue.`,
    createdCount,
    failedCount,
    assetIds,
  };
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
  if (!isBackgroundLibraryImageFile(file)) {
    return {
      success: false,
      message:
        file.size > BACKGROUND_LIBRARY_MAX_BYTES
          ? "Image must be 12MB or smaller."
          : "Use a PNG, JPEG, WebP, or GIF image.",
    };
  }

  const title =
    String(formData.get("title") ?? "").trim() ||
    titleFromBackgroundFilename(file.name) ||
    "Inspiration source";
  const notes = String(formData.get("notes") ?? "").trim();
  const bytes = Buffer.from(await file.arrayBuffer());
  const contentType =
    resolveSafeUploadContentType(file.name, IMAGE_UPLOAD_EXTENSIONS) ||
    "image/png";
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

/**
 * Upload finished artwork straight into the review queue (no AI generate).
 * Stores one original object per file; display thumbs are derived at render time.
 */
export async function bulkUploadBackgroundAssetsAction(formData: FormData): Promise<{
  success: boolean;
  message: string;
  createdCount: number;
  failedCount: number;
  assetIds: string[];
}> {
  const gate = await requireOwner();
  if (!gate.ok) {
    return {
      success: false,
      message: gate.message,
      createdCount: 0,
      failedCount: 0,
      assetIds: [],
    };
  }

  const collected = collectBackgroundBulkUploadFiles(formData);
  if (collected.error) {
    return {
      success: false,
      message: collected.error,
      createdCount: 0,
      failedCount: 0,
      assetIds: [],
    };
  }

  const seasonRaw = String(formData.get("season") ?? "anytime").trim() || "anytime";
  const levelRaw =
    String(formData.get("schoolLevel") ?? "any").trim() || "any";
  const defaultSeason = (
    BACKGROUND_SEASONS as readonly string[]
  ).includes(seasonRaw)
    ? (seasonRaw as BackgroundSeason)
    : "anytime";
  const defaultLevel = (
    BACKGROUND_SCHOOL_LEVELS as readonly string[]
  ).includes(levelRaw)
    ? (levelRaw as BackgroundSchoolLevel)
    : "any";
  const libraryIds = formData
    .getAll("libraryIds")
    .map((value) => String(value).trim())
    .filter(Boolean);

  const admin = createAdminClient();
  const assetIds: string[] = [];
  let failedCount = 0;

  for (const file of collected.files) {
    const bytes = Buffer.from(await file.arrayBuffer());
    const contentType =
      resolveSafeUploadContentType(file.name, IMAGE_UPLOAD_EXTENSIONS) ||
      "image/png";
    const storagePath = buildBackgroundStoragePath(
      "assets",
      file.name || "library-asset.png",
    );
    const uploaded = await uploadPlatformBackgroundBytes({
      storagePath,
      bytes,
      contentType,
    });
    if (!uploaded.success) {
      failedCount += 1;
      continue;
    }

    const title = titleFromBackgroundFilename(file.name);
    const { data: inserted, error } = await admin
      .from("background_assets")
      .insert({
        source_id: null,
        status: "pending_review" satisfies BackgroundAssetStatus,
        title,
        tags: [],
        colors: [],
        season: defaultSeason,
        school_level: defaultLevel,
        storage_path: storagePath,
        public_url: uploaded.publicUrl,
        created_by: gate.userId,
      })
      .select("id")
      .single();

    if (error || !inserted) {
      await deletePlatformBackgroundPath(storagePath);
      failedCount += 1;
      continue;
    }

    const assetId = (inserted as { id: string }).id;
    if (libraryIds.length > 0) {
      const { error: joinError } = await admin
        .from("background_asset_libraries")
        .insert(
          libraryIds.map((libraryId) => ({
            asset_id: assetId,
            library_id: libraryId,
          })),
        );
      if (joinError) {
        // Asset still lands in review; libraries can be assigned there.
      }
    }
    assetIds.push(assetId);
  }

  const createdCount = assetIds.length;
  revalidateLibrary();

  if (createdCount === 0) {
    return {
      success: false,
      message:
        failedCount > 0
          ? "Could not upload any images. Check file types and try again."
          : "No images were uploaded.",
      createdCount: 0,
      failedCount,
      assetIds: [],
    };
  }

  return {
    success: true,
    message:
      failedCount > 0
        ? `Uploaded ${createdCount} to the review queue (${failedCount} failed).`
        : `Uploaded ${createdCount} background${createdCount === 1 ? "" : "s"} to the review queue.`,
    createdCount,
    failedCount,
    assetIds,
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
