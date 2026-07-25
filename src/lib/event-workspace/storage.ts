import { resolveSafeUploadContentType } from "../uploads/safe-content-type";

export const EVENT_ASSETS_BUCKET = "event-assets";

export const ALLOWED_EVENT_ASSET_EXTENSIONS = [
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".pdf",
] as const;

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

/**
 * Extension is authoritative (see resolveEventAssetContentType) — the MIME
 * check here is just a fast, user-friendly reject for an obviously wrong
 * file, not a security boundary on its own.
 */
export function isAllowedEventAssetFile(file: File): boolean {
  return resolveEventAssetContentType(file.name) !== null;
}

/**
 * Server-derived Content-Type for an event asset, from its extension only —
 * never from the client-supplied `file.type`. Returns null to reject
 * uploads with an unrecognized/disallowed extension.
 */
export function resolveEventAssetContentType(filename: string): string | null {
  return resolveSafeUploadContentType(filename, ALLOWED_EVENT_ASSET_EXTENSIONS);
}
