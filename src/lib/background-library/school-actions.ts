"use server";

import { hasPermission } from "@/lib/access-templates/effective-access";
import { getAuthUser } from "@/lib/auth/queries";
import { getLatestOrganization } from "@/lib/organizations/queries";
import {
  createAdminClient,
  isSupabaseAdminConfigured,
} from "@/lib/supabase/admin";
import {
  listActiveBackgroundLibrariesForSchools,
  searchPublishedBackgroundAssetsForSchools,
} from "./school-queries.ts";
import type { BackgroundAsset, BackgroundLibrary } from "./types.ts";

export type BackgroundLibraryPickerAsset = Pick<
  BackgroundAsset,
  | "id"
  | "title"
  | "tags"
  | "publicUrl"
  | "usageCount"
  | "libraryNames"
  | "libraryIds"
  | "season"
  | "sourceId"
>;

function toPickerAsset(asset: BackgroundAsset): BackgroundLibraryPickerAsset {
  return {
    id: asset.id,
    title: asset.title,
    tags: asset.tags,
    publicUrl: asset.publicUrl,
    usageCount: asset.usageCount,
    libraryNames: asset.libraryNames,
    libraryIds: asset.libraryIds,
    season: asset.season,
    sourceId: asset.sourceId,
  };
}

async function requireSchoolLibraryAccess(): Promise<
  { ok: true } | { ok: false; message: string }
> {
  const user = await getAuthUser();
  if (!user) {
    return { ok: false, message: "Sign in to browse the background library." };
  }
  const organization = await getLatestOrganization();
  if (!organization?.id) {
    return {
      ok: false,
      message: "Choose an organization to browse the background library.",
    };
  }
  if (!(await hasPermission("upload_artwork"))) {
    return {
      ok: false,
      message: "You do not have permission to attach artwork.",
    };
  }
  return { ok: true };
}

export async function searchBackgroundLibraryForSchoolsAction(input?: {
  query?: string;
}): Promise<{
  success: boolean;
  message?: string;
  assets: BackgroundLibraryPickerAsset[];
  libraries: BackgroundLibrary[];
}> {
  const access = await requireSchoolLibraryAccess();
  if (!access.ok) {
    return {
      success: false,
      message: access.message,
      assets: [],
      libraries: [],
    };
  }

  const query = input?.query?.trim() ?? "";
  const [assets, libraries] = await Promise.all([
    searchPublishedBackgroundAssetsForSchools(query),
    listActiveBackgroundLibrariesForSchools(),
  ]);

  return {
    success: true,
    assets: assets.map(toPickerAsset),
    libraries,
  };
}

/** Attach path: bump usage when a school picks a published asset. */
export async function selectBackgroundLibraryAssetAction(assetId: string): Promise<{
  success: boolean;
  message?: string;
  asset?: BackgroundLibraryPickerAsset;
}> {
  const access = await requireSchoolLibraryAccess();
  if (!access.ok) {
    return { success: false, message: access.message };
  }
  if (!assetId.trim()) {
    return { success: false, message: "Missing background id." };
  }
  if (!isSupabaseAdminConfigured()) {
    return { success: false, message: "Library storage is not configured." };
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("background_assets")
    .select(
      "id, source_id, status, title, tags, colors, season, school_level, storage_path, public_url, usage_count, created_at, updated_at",
    )
    .eq("id", assetId)
    .eq("status", "published")
    .maybeSingle();

  if (error || !data) {
    return { success: false, message: "That background is not available." };
  }

  const row = data as {
    id: string;
    source_id: string | null;
    title: string;
    tags: string[] | null;
    public_url: string;
    usage_count: number;
    season: string;
  };

  const next = (row.usage_count ?? 0) + 1;
  await admin
    .from("background_assets")
    .update({ usage_count: next, updated_at: new Date().toISOString() })
    .eq("id", assetId)
    .eq("status", "published");

  const { data: joins } = await admin
    .from("background_asset_libraries")
    .select("library_id, background_libraries(name)")
    .eq("asset_id", assetId);

  const libraryIds: string[] = [];
  const libraryNames: string[] = [];
  for (const join of (joins ?? []) as Array<{
    library_id: string;
    background_libraries: { name: string } | { name: string }[] | null;
  }>) {
    libraryIds.push(join.library_id);
    const lib = join.background_libraries;
    const name = Array.isArray(lib) ? lib[0]?.name : lib?.name;
    if (name) libraryNames.push(name);
  }

  return {
    success: true,
    asset: {
      id: row.id,
      title: row.title || "Library background",
      tags: row.tags ?? [],
      publicUrl: row.public_url,
      usageCount: next,
      libraryNames,
      libraryIds,
      season: row.season as BackgroundAsset["season"],
      sourceId: row.source_id,
    },
  };
}
