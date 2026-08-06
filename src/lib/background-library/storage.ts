import "server-only";

import { randomUUID } from "node:crypto";

import {
  createAdminClient,
  isSupabaseAdminConfigured,
} from "@/lib/supabase/admin";
import { PLATFORM_BACKGROUNDS_BUCKET } from "./constants.ts";

export function buildBackgroundStoragePath(
  kind: "sources" | "assets",
  filename: string,
): string {
  const safe = filename.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 80);
  return `${kind}/${randomUUID()}-${safe || "image.png"}`;
}

export function getPlatformBackgroundPublicUrl(storagePath: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!base) {
    return storagePath;
  }
  return `${base}/storage/v1/object/public/${PLATFORM_BACKGROUNDS_BUCKET}/${storagePath}`;
}

export async function uploadPlatformBackgroundBytes(input: {
  storagePath: string;
  bytes: Buffer;
  contentType: string;
}): Promise<{ success: true; publicUrl: string } | { success: false; error: string }> {
  if (!isSupabaseAdminConfigured()) {
    return { success: false, error: "Storage admin is not configured." };
  }
  const admin = createAdminClient();
  const { error } = await admin.storage
    .from(PLATFORM_BACKGROUNDS_BUCKET)
    .upload(input.storagePath, input.bytes, {
      contentType: input.contentType,
      upsert: false,
      cacheControl: "public, max-age=31536000",
    });
  if (error) {
    return { success: false, error: error.message };
  }
  return {
    success: true,
    publicUrl: getPlatformBackgroundPublicUrl(input.storagePath),
  };
}

export async function deletePlatformBackgroundPath(
  storagePath: string,
): Promise<boolean> {
  if (!isSupabaseAdminConfigured() || !storagePath.trim()) {
    return false;
  }
  const admin = createAdminClient();
  const { error } = await admin.storage
    .from(PLATFORM_BACKGROUNDS_BUCKET)
    .remove([storagePath]);
  return !error;
}
