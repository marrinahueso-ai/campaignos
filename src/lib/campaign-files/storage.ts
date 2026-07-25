import { CAMPAIGN_FILES_BUCKET } from "@/lib/campaign-files/constants";
import { resolveSafeUploadContentType } from "@/lib/uploads/safe-content-type";

export const ALLOWED_CAMPAIGN_FILE_EXTENSIONS = [
  ".pdf",
  ".docx",
  ".doc",
  ".xlsx",
  ".xls",
  ".png",
  ".jpg",
  ".jpeg",
] as const;

export function sanitizeCampaignFileFilename(filename: string): string {
  return filename.replace(/[^\w.-]/g, "_");
}

export function buildCampaignFileStoragePath(
  eventId: string,
  filename: string,
): string {
  const safeName = sanitizeCampaignFileFilename(filename);
  return `${eventId}/${Date.now()}-${safeName}`;
}

export function getCampaignFilePublicUrl(storagePath: string): string {
  if (storagePath.startsWith("http://") || storagePath.startsWith("https://")) {
    return storagePath;
  }

  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!baseUrl) {
    return storagePath;
  }

  const normalizedPath = storagePath.replace(/^\/+/, "");
  return `${baseUrl}/storage/v1/object/public/${CAMPAIGN_FILES_BUCKET}/${normalizedPath}`;
}

/**
 * Extension is authoritative (see resolveCampaignFileContentType) — this is
 * just a fast, user-friendly reject for an obviously wrong file, not a
 * security boundary on its own.
 */
export function isAllowedCampaignFile(file: File): boolean {
  return resolveCampaignFileContentType(file.name) !== null;
}

/**
 * Server-derived Content-Type for a campaign file, from its extension only —
 * never from the client-supplied `file.type`. Returns null to reject
 * uploads with an unrecognized/disallowed extension.
 */
export function resolveCampaignFileContentType(filename: string): string | null {
  return resolveSafeUploadContentType(filename, ALLOWED_CAMPAIGN_FILE_EXTENSIONS);
}
