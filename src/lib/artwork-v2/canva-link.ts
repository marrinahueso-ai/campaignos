import type { EventAsset } from "@/types/event-workspace";

export const DEFAULT_CANVA_URL = "https://www.canva.com/";

/** School Canva brand kit / template folder — set in env for the whole org. */
export function getConfiguredCanvaUrl(): string | null {
  const url = process.env.NEXT_PUBLIC_CANVA_URL?.trim();
  return url && url.length > 0 ? url : null;
}

/** Prefer org env URL, then a linked canva asset on the event, then Canva home. */
export function resolveCanvaUrl(assets: EventAsset[]): string {
  const configured = getConfiguredCanvaUrl();
  if (configured) {
    return configured;
  }

  const linkedAsset =
    assets.find((asset) => asset.assetType === "canva_link" && asset.canvaUrl) ??
    assets.find((asset) => Boolean(asset.canvaUrl));

  return linkedAsset?.canvaUrl ?? DEFAULT_CANVA_URL;
}
