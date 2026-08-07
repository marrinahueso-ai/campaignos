import "server-only";

import {
  createAdminClient,
  isSupabaseAdminConfigured,
} from "@/lib/supabase/admin";
import { PLATFORM_BACKGROUNDS_BUCKET } from "./constants.ts";
import {
  buildBackgroundStoragePath,
  getPlatformBackgroundPublicUrl,
} from "./paths.ts";

export {
  buildBackgroundStoragePath,
  getPlatformBackgroundPublicUrl,
  isBackgroundLibraryStoragePath,
} from "./paths.ts";

export async function createPlatformBackgroundSignedUpload(input: {
  kind: "sources" | "assets";
  filename: string;
}): Promise<
  | {
      success: true;
      storagePath: string;
      token: string;
      publicUrl: string;
    }
  | { success: false; error: string }
> {
  if (!isSupabaseAdminConfigured()) {
    return { success: false, error: "Storage admin is not configured." };
  }
  const storagePath = buildBackgroundStoragePath(input.kind, input.filename);
  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from(PLATFORM_BACKGROUNDS_BUCKET)
    .createSignedUploadUrl(storagePath);
  if (error || !data?.token) {
    return {
      success: false,
      error: error?.message ?? "Could not create upload URL.",
    };
  }
  return {
    success: true,
    storagePath,
    token: data.token,
    publicUrl: getPlatformBackgroundPublicUrl(storagePath),
  };
}

export async function platformBackgroundObjectExists(
  storagePath: string,
): Promise<boolean> {
  if (!isSupabaseAdminConfigured() || !storagePath.trim()) {
    return false;
  }
  const admin = createAdminClient();
  const { error } = await admin.storage
    .from(PLATFORM_BACKGROUNDS_BUCKET)
    .createSignedUrl(storagePath, 60);
  return !error;
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
