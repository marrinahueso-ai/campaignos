export const NO_BRAND_KIT_ID = "none";

/** Session id for the organization's onboarding / school brand kit. */
export const ORG_DEFAULT_BRAND_KIT_ID = "org-default";

export const NO_BRAND_KIT_GUIDANCE =
  "No organization brand kit selected. Use a clean, school-friendly default style with readable typography and welcoming colors.";

export function isNoBrandKit(brandKitId: string | null | undefined): boolean {
  return !brandKitId || brandKitId === NO_BRAND_KIT_ID;
}

/** Returns null when the user chose no brand constraints for AI generation. */
export function brandKitIdForAi(brandKitId: string): string | null {
  return isNoBrandKit(brandKitId) ? null : brandKitId;
}

/** True when the org has logos, colors, mascot, or brand-kit items to feed AI. */
export function hasOrganizationBrandDirection(input: {
  primaryColor?: string | null;
  secondaryColor?: string | null;
  ptoLogo?: string | null;
  schoolLogo?: string | null;
  mascot?: string | null;
  brandKitItemCount?: number;
}): boolean {
  return Boolean(
    input.primaryColor?.trim() ||
      input.secondaryColor?.trim() ||
      input.ptoLogo?.trim() ||
      input.schoolLogo?.trim() ||
      input.mascot?.trim() ||
      (input.brandKitItemCount != null && input.brandKitItemCount > 0),
  );
}

/**
 * Creative Setup does not auto-apply the org brand kit.
 * Art direction comes only from explicit logo / color / tone controls.
 */
export function resolveBrandKitIdForSession(
  ..._args: [string | null | undefined, boolean]
): string {
  void _args;
  return NO_BRAND_KIT_ID;
}
