import type { BrandKitItem } from "@/lib/creative-assets/types";
import { resolveAssetImageUrl } from "@/lib/event-workspace/storage";
import type { BrandAssets } from "@/types";

export interface SetupLogoOption {
  id: string;
  label: string;
  url: string;
  storagePath: string;
}

export function buildSetupLogoOptions(
  brandAssets: BrandAssets | null | undefined,
): SetupLogoOption[] {
  if (!brandAssets) {
    return [];
  }

  const options: SetupLogoOption[] = [];

  const ptoUrl = resolveAssetImageUrl(brandAssets.ptoLogo);
  if (ptoUrl && brandAssets.ptoLogo) {
    options.push({
      id: "pto",
      label: "PTO logo",
      url: ptoUrl,
      storagePath: brandAssets.ptoLogo,
    });
  }

  const schoolUrl = resolveAssetImageUrl(brandAssets.schoolLogo);
  if (schoolUrl && brandAssets.schoolLogo) {
    options.push({
      id: "school",
      label: "School logo",
      url: schoolUrl,
      storagePath: brandAssets.schoolLogo,
    });
  }

  return options;
}

/** Merges organization profile logos with AI Brain / brand kit logo items. */
export function buildCampaignBuilderLogoOptions(
  brandAssets: BrandAssets | null | undefined,
  brandKitItems: BrandKitItem[] = [],
): SetupLogoOption[] {
  const options = buildSetupLogoOptions(brandAssets);
  const seenPaths = new Set(options.map((option) => option.storagePath));

  for (const item of brandKitItems) {
    if (
      (item.category !== "school_logo" && item.category !== "pto_logo") ||
      !item.storagePath?.trim()
    ) {
      continue;
    }

    if (seenPaths.has(item.storagePath)) {
      continue;
    }

    const url = resolveAssetImageUrl(item.storagePath);
    if (!url) {
      continue;
    }

    seenPaths.add(item.storagePath);
    options.push({
      id: item.id,
      label:
        item.label?.trim() ||
        (item.category === "school_logo" ? "School logo" : "PTO logo"),
      url,
      storagePath: item.storagePath,
    });
  }

  return options;
}

export function findSetupLogoOption(
  options: SetupLogoOption[],
  id: string | null | undefined,
): SetupLogoOption | null {
  if (!id) {
    return null;
  }

  return options.find((option) => option.id === id) ?? null;
}

export function buildLogoPromptHint(label: string): string {
  return `Include the ${label.toLowerCase()} prominently in the design.`;
}
