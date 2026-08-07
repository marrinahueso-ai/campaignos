import "server-only";

import {
  createAdminClient,
  isSupabaseAdminConfigured,
} from "@/lib/supabase/admin";
import type {
  BackgroundAsset,
  BackgroundAssetStatus,
  BackgroundLibrary,
  BackgroundLibrarySummary,
  BackgroundSchoolLevel,
  BackgroundSeason,
  BackgroundSource,
} from "./types.ts";

type LibraryRow = {
  id: string;
  slug: string;
  name: string;
  description: string;
  sort_order: number;
  is_active: boolean;
};

type SourceRow = {
  id: string;
  title: string;
  notes: string;
  storage_path: string;
  public_url: string;
  created_at: string;
};

type AssetRow = {
  id: string;
  source_id: string | null;
  status: BackgroundAssetStatus;
  title: string;
  filename_label: string | null;
  description: string | null;
  tags: string[] | null;
  colors: string[] | null;
  style: string | null;
  audience: string | null;
  objects: string[] | null;
  season: string;
  school_level: string;
  storage_path: string;
  public_url: string;
  usage_count: number;
  created_at: string;
  updated_at: string;
};

function mapLibrary(row: LibraryRow): BackgroundLibrary {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    sortOrder: row.sort_order,
    isActive: row.is_active,
  };
}

function mapAsset(
  row: AssetRow,
  libraryIds: string[],
  libraryNames: string[],
): BackgroundAsset {
  return {
    id: row.id,
    sourceId: row.source_id,
    status: row.status,
    title: row.title,
    filenameLabel: row.filename_label ?? "",
    description: row.description ?? "",
    tags: row.tags ?? [],
    colors: row.colors ?? [],
    style: row.style ?? "",
    audience: row.audience ?? "",
    objects: row.objects ?? [],
    season: (row.season as BackgroundSeason) || "anytime",
    schoolLevel: (row.school_level as BackgroundSchoolLevel) || "any",
    storagePath: row.storage_path,
    publicUrl: row.public_url,
    usageCount: row.usage_count ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    libraryIds,
    libraryNames,
  };
}

export async function listBackgroundLibraries(): Promise<BackgroundLibrary[]> {
  if (!isSupabaseAdminConfigured()) return [];
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("background_libraries")
    .select("id, slug, name, description, sort_order, is_active")
    .order("sort_order", { ascending: true });
  if (error || !data) return [];
  return (data as LibraryRow[]).map(mapLibrary);
}

export async function getBackgroundLibrarySummary(): Promise<BackgroundLibrarySummary> {
  const empty: BackgroundLibrarySummary = {
    total: 0,
    pendingReview: 0,
    published: 0,
    archived: 0,
    totalUses: 0,
    sources: 0,
  };
  if (!isSupabaseAdminConfigured()) return empty;
  const admin = createAdminClient();

  const [{ data: assets }, { count: sources }] = await Promise.all([
    admin.from("background_assets").select("status, usage_count"),
    admin
      .from("background_sources")
      .select("id", { count: "exact", head: true }),
  ]);

  if (!assets) {
    return { ...empty, sources: sources ?? 0 };
  }

  let pendingReview = 0;
  let published = 0;
  let archived = 0;
  let totalUses = 0;
  for (const row of assets as Array<{ status: string; usage_count: number }>) {
    if (row.status === "pending_review") pendingReview += 1;
    else if (row.status === "published") published += 1;
    else if (row.status === "archived") archived += 1;
    totalUses += row.usage_count ?? 0;
  }

  return {
    total: assets.length,
    pendingReview,
    published,
    archived,
    totalUses,
    sources: sources ?? 0,
  };
}

export async function listBackgroundSources(): Promise<BackgroundSource[]> {
  if (!isSupabaseAdminConfigured()) return [];
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("background_sources")
    .select("id, title, notes, storage_path, public_url, created_at")
    .order("created_at", { ascending: false });
  if (error || !data) return [];

  const sourceIds = (data as SourceRow[]).map((row) => row.id);
  const counts = new Map<string, number>();
  if (sourceIds.length > 0) {
    const { data: assetRows } = await admin
      .from("background_assets")
      .select("source_id")
      .in("source_id", sourceIds);
    for (const row of (assetRows ?? []) as Array<{ source_id: string | null }>) {
      if (!row.source_id) continue;
      counts.set(row.source_id, (counts.get(row.source_id) ?? 0) + 1);
    }
  }

  return (data as SourceRow[]).map((row) => ({
    id: row.id,
    title: row.title,
    notes: row.notes,
    storagePath: row.storage_path,
    publicUrl: row.public_url,
    createdAt: row.created_at,
    variationCount: counts.get(row.id) ?? 0,
  }));
}

export async function listBackgroundAssetsByStatus(
  status: BackgroundAssetStatus,
): Promise<BackgroundAsset[]> {
  if (!isSupabaseAdminConfigured()) return [];
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("background_assets")
    .select(
      "id, source_id, status, title, filename_label, description, tags, colors, style, audience, objects, season, school_level, storage_path, public_url, usage_count, created_at, updated_at",
    )
    .eq("status", status)
    .order("created_at", { ascending: false });
  if (error || !data) return [];

  const assets = data as AssetRow[];
  const ids = assets.map((row) => row.id);
  const libraryByAsset = new Map<string, { ids: string[]; names: string[] }>();

  if (ids.length > 0) {
    const { data: joins } = await admin
      .from("background_asset_libraries")
      .select("asset_id, library_id, background_libraries(name)")
      .in("asset_id", ids);

    for (const join of (joins ?? []) as Array<{
      asset_id: string;
      library_id: string;
      background_libraries: { name: string } | { name: string }[] | null;
    }>) {
      const entry = libraryByAsset.get(join.asset_id) ?? { ids: [], names: [] };
      entry.ids.push(join.library_id);
      const lib = join.background_libraries;
      const name = Array.isArray(lib) ? lib[0]?.name : lib?.name;
      if (name) entry.names.push(name);
      libraryByAsset.set(join.asset_id, entry);
    }
  }

  return assets.map((row) => {
    const libs = libraryByAsset.get(row.id) ?? { ids: [], names: [] };
    return mapAsset(row, libs.ids, libs.names);
  });
}

export async function getBackgroundSourceById(
  sourceId: string,
): Promise<BackgroundSource | null> {
  if (!isSupabaseAdminConfigured()) return null;
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("background_sources")
    .select("id, title, notes, storage_path, public_url, created_at")
    .eq("id", sourceId)
    .maybeSingle();
  if (error || !data) return null;
  const row = data as SourceRow;
  return {
    id: row.id,
    title: row.title,
    notes: row.notes,
    storagePath: row.storage_path,
    publicUrl: row.public_url,
    createdAt: row.created_at,
    variationCount: 0,
  };
}

export async function getBackgroundAssetById(
  assetId: string,
): Promise<BackgroundAsset | null> {
  const pending = await listBackgroundAssetsByStatus("pending_review");
  const published = await listBackgroundAssetsByStatus("published");
  const archived = await listBackgroundAssetsByStatus("archived");
  return (
    [...pending, ...published, ...archived].find((asset) => asset.id === assetId) ??
    null
  );
}
