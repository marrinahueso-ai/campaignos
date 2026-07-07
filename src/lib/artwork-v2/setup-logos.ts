import { resolveAssetImageUrl } from "@/lib/event-workspace/storage";
import type { BrandAssets } from "@/types";

export interface SetupLogoOption {
  id: "pto" | "school";
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

export function buildLogoPromptHint(label: string): string {
  return `Include the ${label.toLowerCase()} prominently in the design.`;
}
