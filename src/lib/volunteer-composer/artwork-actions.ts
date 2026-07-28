"use server";

import { uploadArtworkBytes } from "@/lib/ai-artwork/storage";
import { getCurrentOrganization } from "@/lib/auth/organization-context";
import { sanitizeEventAssetFilename } from "@/lib/event-workspace/storage";

const ALLOWED = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);

/**
 * Host Volunteer Composer opportunity artwork so website export uses a
 * normal https:// URL instead of megabytes of base64 in the page HTML.
 */
export async function uploadVolunteerComposerArtworkAction(input: {
  opportunityId: string;
  dataUrl: string;
}): Promise<{ success: boolean; url: string | null; error: string | null }> {
  const organization = await getCurrentOrganization();
  if (!organization?.id) {
    return { success: false, url: null, error: "Sign in to upload artwork." };
  }

  const match = input.dataUrl.match(/^data:([^;]+);base64,(.+)$/i);
  if (!match?.[2]) {
    return { success: false, url: null, error: "Invalid image data." };
  }

  const contentType = (match[1]?.trim().toLowerCase() || "image/jpeg").replace(
    "image/jpg",
    "image/jpeg",
  );
  if (!ALLOWED.has(contentType)) {
    return {
      success: false,
      url: null,
      error: "Artwork must be JPG, PNG, or WebP.",
    };
  }

  let bytes: Buffer;
  try {
    bytes = Buffer.from(match[2], "base64");
  } catch {
    return { success: false, url: null, error: "Could not read that image." };
  }

  if (bytes.length > 2.5 * 1024 * 1024) {
    return {
      success: false,
      url: null,
      error: "Image is still too large after compress. Try a smaller photo.",
    };
  }

  const safeId = sanitizeEventAssetFilename(input.opportunityId || "role");
  const ext =
    contentType === "image/png"
      ? "png"
      : contentType === "image/webp"
        ? "webp"
        : "jpg";
  const storagePath = `${organization.id}/volunteer-composer/${safeId}-${Date.now()}.${ext}`;

  const uploaded = await uploadArtworkBytes({
    storagePath,
    bytes,
    contentType,
  });

  if (!uploaded.success || !uploaded.publicUrl) {
    return {
      success: false,
      url: null,
      error: uploaded.error ?? "Unable to upload artwork.",
    };
  }

  return { success: true, url: uploaded.publicUrl, error: null };
}
