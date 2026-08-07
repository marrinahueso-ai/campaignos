import { randomUUID } from "node:crypto";

import { PLATFORM_BACKGROUNDS_BUCKET } from "./constants.ts";

export function buildBackgroundStoragePath(
  kind: "sources" | "assets",
  filename: string,
): string {
  const safe = filename.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 80);
  return `${kind}/${randomUUID()}-${safe || "image.png"}`;
}

/** Reject path traversal / cross-kind registration after signed upload. */
export function isBackgroundLibraryStoragePath(
  kind: "sources" | "assets",
  storagePath: string,
): boolean {
  const trimmed = storagePath.trim();
  if (!trimmed || trimmed.includes("..") || trimmed.length > 200) {
    return false;
  }
  return (
    trimmed.startsWith(`${kind}/`) &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-/i.test(
      trimmed.slice(kind.length + 1),
    )
  );
}

export function getPlatformBackgroundPublicUrl(storagePath: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!base) {
    return storagePath;
  }
  return `${base}/storage/v1/object/public/${PLATFORM_BACKGROUNDS_BUCKET}/${storagePath}`;
}
