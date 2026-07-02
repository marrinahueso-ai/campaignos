import type { InspirationAsset } from "@/lib/creative-assets/types";

/** Client-safe helper — find inspiration in a preloaded list (no server I/O). */
export function findInspirationAssetInList(
  assetId: string | null,
  inspirationAssets: InspirationAsset[],
): InspirationAsset | null {
  if (!assetId) {
    return null;
  }
  return inspirationAssets.find((item) => item.assetId === assetId) ?? null;
}
