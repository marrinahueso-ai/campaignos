/**
 * Server-side upload validation shared by every public-bucket upload path.
 *
 * Never trust the client-supplied `File.type` (or a data-URL's declared
 * MIME) as the Storage `contentType` — a client can claim anything. Instead,
 * validate the filename extension against an allow-list and derive the
 * `contentType` we actually store from THAT, so a file renamed to spoof an
 * allowed extension is served back with a matching, safe Content-Type
 * (never `text/html`, `image/svg+xml`, or another script-capable type)
 * regardless of what the uploader claimed or what the bytes actually are.
 */

const EXTENSION_CONTENT_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".pdf": "application/pdf",
  ".doc": "application/msword",
  ".docx":
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xls": "application/vnd.ms-excel",
  ".xlsx":
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

/** Common image-only allow-list for logos / artwork / inspiration uploads. Deliberately excludes SVG (script-capable) and any non-image type. */
export const IMAGE_UPLOAD_EXTENSIONS = [
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".gif",
] as const;

export function fileExtensionOf(filename: string): string {
  const idx = filename.lastIndexOf(".");
  return idx === -1 ? "" : filename.slice(idx).toLowerCase();
}

/**
 * Returns the safe, server-derived Content-Type for `filename` if its
 * extension is in `allowedExtensions`, or `null` if the upload should be
 * rejected outright.
 */
export function resolveSafeUploadContentType(
  filename: string,
  allowedExtensions: readonly string[],
): string | null {
  const extension = fileExtensionOf(filename);
  if (!extension || !allowedExtensions.includes(extension)) {
    return null;
  }
  return EXTENSION_CONTENT_TYPES[extension] ?? null;
}
