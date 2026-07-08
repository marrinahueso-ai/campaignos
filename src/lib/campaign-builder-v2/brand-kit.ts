export const NO_BRAND_KIT_ID = "none";

export function isNoBrandKit(brandKitId: string | null | undefined): boolean {
  return !brandKitId || brandKitId === NO_BRAND_KIT_ID;
}

/** Returns null when the user chose no brand constraints for AI generation. */
export function brandKitIdForAi(brandKitId: string): string | null {
  return isNoBrandKit(brandKitId) ? null : brandKitId;
}
