import { resolveAssetImageUrl } from "@/lib/event-workspace/storage";
import type { BrandAssets } from "@/types";

export interface SetupLogoOption {
  id: "pto" | "school";
  label: string;
  url: string;
}

export function buildSetupLogoOptions(
  brandAssets: BrandAssets | null | undefined,
): SetupLogoOption[] {
  if (!brandAssets) {
    return [];
  }

  const options: SetupLogoOption[] = [];

  const ptoUrl = resolveAssetImageUrl(brandAssets.ptoLogo);
  if (ptoUrl) {
    options.push({ id: "pto", label: "PTO logo", url: ptoUrl });
  }

  const schoolUrl = resolveAssetImageUrl(brandAssets.schoolLogo);
  if (schoolUrl) {
    options.push({ id: "school", label: "School logo", url: schoolUrl });
  }

  return options;
}

export function buildLogoPromptHint(label: string): string {
  return `Include the ${label.toLowerCase()} prominently in the design.`;
}
