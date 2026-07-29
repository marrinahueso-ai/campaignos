export type PostGraphicCandidate = {
  id: string;
  asset_type: string;
  storage_path: string | null;
  plan_label: string | null;
  updated_at?: string | null;
};
const DISPLAY_ASSET_TYPE_PRIORITY: Record<string, number> = {
  instagram_graphic: 100,
  facebook_graphic: 90,
  instagram_story: 80,
  newsletter_banner: 70,
  email_header: 60,
  flyer: 50,
  square_graphic: 10,
};

function scorePostGraphicCandidate(row: PostGraphicCandidate): number {
  let score = DISPLAY_ASSET_TYPE_PRIORITY[row.asset_type] ?? 0;
  if (row.plan_label?.includes("(1:1)")) {
    score += 5;
  }
  const updatedMs = Date.parse(row.updated_at ?? "") || 0;
  return score + updatedMs / 1_000_000_000;
}

export function pickPreferredPostGraphicCandidate<T extends PostGraphicCandidate>(
  rows: T[],
): T {
  return [...rows].sort(
    (left, right) =>
      scorePostGraphicCandidate(right) - scorePostGraphicCandidate(left),
  )[0]!;
}

/**
 * Collapse duplicate post graphics that share the same storage file — e.g.
 * instagram_graphic "Feed (1:1)" + legacy square_graphic "Feed 1:1" from hero-sync.
 */
export function dedupePostGraphicCandidates<T extends PostGraphicCandidate>(
  rows: T[],
): T[] {
  const byStoragePath = new Map<string, T[]>();
  const withoutPath: T[] = [];

  for (const row of rows) {
    const path = row.storage_path?.trim();
    if (!path) {
      withoutPath.push(row);
      continue;
    }
    const group = byStoragePath.get(path) ?? [];
    group.push(row);
    byStoragePath.set(path, group);
  }

  const deduped: T[] = [...withoutPath];
  for (const group of byStoragePath.values()) {
    deduped.push(
      group.length === 1 ? group[0]! : pickPreferredPostGraphicCandidate(group),
    );
  }

  return deduped;
}

export function groupPostGraphicCandidateIdsByStoragePath<
  T extends PostGraphicCandidate,
>(rows: T[]): Map<string, string[]> {
  const groups = new Map<string, string[]>();

  for (const row of rows) {
    const path = row.storage_path?.trim();
    if (!path) {
      continue;
    }
    const ids = groups.get(path) ?? [];
    ids.push(row.id);
    groups.set(path, ids);
  }

  return groups;
}
