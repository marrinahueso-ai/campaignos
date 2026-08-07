import "server-only";

import { createClient } from "@/lib/supabase/server";
import {
  filterAndAssortBackgroundAssets,
} from "./assortment.ts";
import type { BackgroundAsset, BackgroundLibrary } from "./types.ts";

type PublishedAssetRow = {
  id: string;
  source_id: string | null;
  status: "published";
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

function mapPublishedAsset(
  row: PublishedAssetRow,
  libraryIds: string[],
  libraryNames: string[],
): BackgroundAsset {
  return {
    id: row.id,
    sourceId: row.source_id,
    status: "published",
    title: row.title,
    filenameLabel: row.filename_label ?? "",
    description: row.description ?? "",
    tags: row.tags ?? [],
    colors: row.colors ?? [],
    style: row.style ?? "",
    audience: row.audience ?? "",
    objects: row.objects ?? [],
    season: (row.season as BackgroundAsset["season"]) || "anytime",
    schoolLevel: (row.school_level as BackgroundAsset["schoolLevel"]) || "any",
    storagePath: row.storage_path,
    publicUrl: row.public_url,
    usageCount: row.usage_count ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    libraryIds,
    libraryNames,
  };
}

/** Active collection chips for the school picker (RLS: is_active). */
export async function listActiveBackgroundLibrariesForSchools(): Promise<
  BackgroundLibrary[]
> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("background_libraries")
    .select("id, slug, name, description, sort_order, is_active")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (error || !data) return [];
  return (
    data as Array<{
      id: string;
      slug: string;
      name: string;
      description: string;
      sort_order: number;
      is_active: boolean;
    }>
  ).map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    sortOrder: row.sort_order,
    isActive: row.is_active,
  }));
}

/**
 * Published backgrounds for school pickers.
 * Search matches rich metadata (title/tags/colors/style/objects/…).
 * Order is assortment for variety (mix Generate batches + lookalike buckets),
 * not likeness clumps or created_at.
 */
export async function searchPublishedBackgroundAssetsForSchools(
  query = "",
): Promise<BackgroundAsset[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("background_assets")
    .select(
      "id, source_id, status, title, filename_label, description, tags, colors, style, audience, objects, season, school_level, storage_path, public_url, usage_count, created_at, updated_at",
    )
    .eq("status", "published")
    .order("created_at", { ascending: false });
  if (error || !data) return [];

  const assets = data as PublishedAssetRow[];
  const ids = assets.map((row) => row.id);
  const libraryByAsset = new Map<string, { ids: string[]; names: string[] }>();

  if (ids.length > 0) {
    const { data: joins } = await supabase
      .from("background_asset_libraries")
      .select("asset_id, library_id, background_libraries(name)")
      .in("asset_id", ids);

    for (const join of (joins ?? []) as Array<{
      asset_id: string;
      library_id: string;
      background_libraries: { name: string } | { name: string }[] | null;
    }>) {
      const entry = libraryByAsset.get(join.asset_id) ?? {
        ids: [],
        names: [],
      };
      entry.ids.push(join.library_id);
      const lib = join.background_libraries;
      const name = Array.isArray(lib) ? lib[0]?.name : lib?.name;
      if (name) entry.names.push(name);
      libraryByAsset.set(join.asset_id, entry);
    }
  }

  const mapped = assets.map((row) => {
    const libs = libraryByAsset.get(row.id) ?? { ids: [], names: [] };
    return mapPublishedAsset(row, libs.ids, libs.names);
  });

  return filterAndAssortBackgroundAssets(mapped, query);
}
