"use server";

import {
  generateHomepageCardBlurb,
  type GenerateHomepageBlurbInput,
  type GenerateHomepageBlurbResult,
} from "@/lib/homepage-composer/generate-blurb";
import { getCurrentOrganization } from "@/lib/auth/organization-context";

export async function generateHomepageComposerBlurbAction(
  input: GenerateHomepageBlurbInput,
): Promise<GenerateHomepageBlurbResult> {
  const organization = await getCurrentOrganization();
  if (!organization?.id) {
    return {
      success: false,
      error: "Sign in to generate text.",
      blurb: null,
    };
  }

  return generateHomepageCardBlurb(input);
}
