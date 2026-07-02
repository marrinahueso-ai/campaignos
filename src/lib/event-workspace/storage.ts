export const EVENT_ASSETS_BUCKET = "event-assets";

export const ALLOWED_EVENT_ASSET_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "application/pdf",
]);

export const ALLOWED_EVENT_ASSET_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".pdf",
]);

export const MAX_EVENT_ASSET_BYTES = 10 * 1024 * 1024;

export function getEventAssetPublicUrl(storagePath: string): string {
  if (storagePath.startsWith("http://") || storagePath.startsWith("https://")) {
    return storagePath;
  }

  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!baseUrl) {
    return storagePath;
  }

  const normalizedPath = storagePath.replace(/^\/+/, "");
  return `${baseUrl}/storage/v1/object/public/${EVENT_ASSETS_BUCKET}/${normalizedPath}`;
}

export function resolveAssetImageUrl(storagePath: string | null): string | null {
  if (!storagePath) {
    return null;
  }

  if (storagePath.startsWith("http://") || storagePath.startsWith("https://")) {
    return storagePath;
  }

  return getEventAssetPublicUrl(storagePath);
}

export function isPdfAsset(
  filename: string | null,
  storagePath: string | null,
): boolean {
  const name = filename ?? storagePath ?? "";
  return name.toLowerCase().endsWith(".pdf");
}

export function sanitizeEventAssetFilename(filename: string): string {
  return filename.replace(/[^\w.-]/g, "_");
}

export function buildEventAssetStoragePath(
  eventId: string,
  assetType: string,
  filename: string,
  versionNumber?: number,
): string {
  const safeName = sanitizeEventAssetFilename(filename);
  const versionSegment =
    versionNumber !== undefined ? `v${versionNumber}` : `${Date.now()}`;
  return `${eventId}/${assetType}/${versionSegment}-${safeName}`;
}

export function isAllowedEventAssetFile(file: File): boolean {
  if (ALLOWED_EVENT_ASSET_MIME_TYPES.has(file.type)) {
    return true;
  }

  const extension = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
  return ALLOWED_EVENT_ASSET_EXTENSIONS.has(extension);
}
