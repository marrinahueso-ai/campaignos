/**
 * School-facing Background Library search + assortment ordering.
 * Assortment intentionally avoids "likeness" clumping (same Generate batch /
 * same source variations adjacent) so browsing feels varied.
 */

export type AssortableBackgroundAsset = {
  id: string;
  sourceId: string | null;
  title: string;
  filenameLabel?: string;
  description?: string;
  tags: string[];
  colors: string[];
  style?: string;
  audience?: string;
  objects?: string[];
  season: string;
  schoolLevel?: string;
  libraryNames: string[];
  usageCount: number;
};

/** Collapse punctuation/spaces so "back to school" and "backtoschool" match. */
export function normalizeLibrarySearch(query: string): string {
  return query.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function assetSearchHaystack(asset: AssortableBackgroundAsset): string {
  return normalizeLibrarySearch(
    [
      asset.title,
      asset.filenameLabel ?? "",
      asset.description ?? "",
      ...asset.tags,
      ...asset.libraryNames,
      asset.season,
      asset.schoolLevel ?? "",
      ...asset.colors,
      asset.style ?? "",
      asset.audience ?? "",
      ...(asset.objects ?? []),
    ].join(" "),
  );
}

export function assetMatchesLibrarySearch(
  asset: AssortableBackgroundAsset,
  query: string,
): boolean {
  const needle = normalizeLibrarySearch(query);
  if (!needle) return true;
  const hay = assetSearchHaystack(asset);
  if (hayIncludes(hay, needle)) return true;

  const words = query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .map((part) => normalizeLibrarySearch(part))
    .filter((part) => part.length >= 2);
  if (words.length <= 1) return false;
  return words.every((word) => hayIncludes(hay, word));
}

function hayIncludes(hay: string, needle: string): boolean {
  if (hay.includes(needle)) return true;
  // Soft plural so "pencils" hits tag "pencil".
  if (needle.length > 4 && needle.endsWith("s")) {
    return hay.includes(needle.slice(0, -1));
  }
  return false;
}

function stableHash(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

/**
 * Round-robin across source groups so AI variations from one Generate batch
 * do not sit in a likeness row. Within a group, prefer lower usage first so
 * underused assets surface earlier while still mixing sources.
 */
export function assortBackgroundAssets<T extends AssortableBackgroundAsset>(
  assets: T[],
  seed = "library",
): T[] {
  if (assets.length <= 1) return [...assets];

  const groups = new Map<string, T[]>();
  for (const asset of assets) {
    const key = asset.sourceId?.trim() || `solo:${asset.id}`;
    const list = groups.get(key) ?? [];
    list.push(asset);
    groups.set(key, list);
  }

  for (const list of groups.values()) {
    list.sort((a, b) => {
      if (a.usageCount !== b.usageCount) return a.usageCount - b.usageCount;
      return a.id.localeCompare(b.id);
    });
  }

  const groupKeys = [...groups.keys()].sort(
    (a, b) =>
      stableHash(`${seed}:${a}`) - stableHash(`${seed}:${b}`) ||
      a.localeCompare(b),
  );

  const queues = groupKeys.map((key) => [...(groups.get(key) ?? [])]);
  const out: T[] = [];
  let remaining = assets.length;
  while (remaining > 0) {
    for (const queue of queues) {
      const next = queue.shift();
      if (!next) continue;
      out.push(next);
      remaining -= 1;
    }
  }
  return out;
}

export function filterAndAssortBackgroundAssets<
  T extends AssortableBackgroundAsset,
>(assets: T[], query: string): T[] {
  const matched = assets.filter((asset) =>
    assetMatchesLibrarySearch(asset, query),
  );
  return assortBackgroundAssets(matched, normalizeLibrarySearch(query) || "all");
}
