import { CAMPAIGN_FILES_BUCKET } from "@/lib/campaign-files/constants";

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

export function isAllowedCampaignFile(file: File): boolean {
  const extension = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
  const allowedExtensions = new Set([
    ".pdf",
    ".docx",
    ".doc",
    ".xlsx",
    ".xls",
    ".png",
    ".jpg",
    ".jpeg",
  ]);

  if (allowedExtensions.has(extension)) {
    return true;
  }

  const allowedMimeTypes = new Set([
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
    "image/png",
    "image/jpeg",
    "image/jpg",
  ]);

  return allowedMimeTypes.has(file.type);
}
