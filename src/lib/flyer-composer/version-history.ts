/**
 * Flyer composer Preview version history (generated PNGs).
 * Pure helpers — mirrored in public/create-with-ai-flyer.html draft persistence.
 */

export const FLYER_COMPOSER_MAX_VERSIONS = 10;

export type FlyerComposerVersion = {
  id: string;
  imageUrl: string;
  createdAt: number;
};

function isPersistableImageUrl(url: unknown): url is string {
  if (typeof url !== "string") return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  return (
    trimmed.startsWith("https://") ||
    trimmed.startsWith("http://") ||
    trimmed.startsWith("data:image/")
  );
}

export function normalizeFlyerComposerVersions(
  raw: unknown,
  max = FLYER_COMPOSER_MAX_VERSIONS,
): FlyerComposerVersion[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: FlyerComposerVersion[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    if (!isPersistableImageUrl(row.imageUrl)) continue;
    const imageUrl = row.imageUrl.trim();
    if (seen.has(imageUrl)) continue;
    seen.add(imageUrl);
    const id =
      typeof row.id === "string" && row.id.trim()
        ? row.id.trim()
        : `v-${row.createdAt ?? out.length}-${out.length}`;
    const createdAt =
      typeof row.createdAt === "number" && Number.isFinite(row.createdAt)
        ? row.createdAt
        : Date.now() - out.length;
    out.push({ id, imageUrl, createdAt });
    if (out.length >= max) break;
  }
  return out;
}

export function addFlyerComposerVersion(
  versions: FlyerComposerVersion[],
  imageUrl: string,
  options?: { id?: string; createdAt?: number; max?: number },
): FlyerComposerVersion[] {
  if (!isPersistableImageUrl(imageUrl)) {
    return normalizeFlyerComposerVersions(versions, options?.max);
  }
  const trimmed = imageUrl.trim();
  const max = options?.max ?? FLYER_COMPOSER_MAX_VERSIONS;
  const createdAt = options?.createdAt ?? Date.now();
  const id = options?.id?.trim() || `v-${createdAt}`;
  const withoutDup = versions.filter((v) => v.imageUrl !== trimmed);
  return normalizeFlyerComposerVersions(
    [{ id, imageUrl: trimmed, createdAt }, ...withoutDup],
    max,
  );
}

export function findFlyerComposerVersion(
  versions: FlyerComposerVersion[],
  id: string | null | undefined,
): FlyerComposerVersion | null {
  if (!id) return null;
  return versions.find((v) => v.id === id) ?? null;
}

/** Prefer https/http versions when localStorage quota is tight. */
export function slimFlyerComposerVersionsForQuota(
  versions: FlyerComposerVersion[],
  currentImageUrl: string | null,
  max = FLYER_COMPOSER_MAX_VERSIONS,
): FlyerComposerVersion[] {
  const preferred = versions.filter(
    (v) =>
      v.imageUrl.startsWith("https://") ||
      v.imageUrl.startsWith("http://") ||
      v.imageUrl === currentImageUrl,
  );
  if (preferred.length) return normalizeFlyerComposerVersions(preferred, max);
  if (currentImageUrl && isPersistableImageUrl(currentImageUrl)) {
    return addFlyerComposerVersion([], currentImageUrl, { max: 1 });
  }
  return [];
}
