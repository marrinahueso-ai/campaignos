import "server-only";

import { createClient } from "@/lib/supabase/server";
import {
  EVENT_ASSETS_BUCKET,
  getEventAssetPublicUrl,
  sanitizeEventAssetFilename,
} from "@/lib/event-workspace/storage";

export function buildConceptStoragePath(input: {
  eventId: string;
  assetType: string;
  batchId: string;
  conceptIndex: number;
}): string {
  const filename = sanitizeEventAssetFilename(`concept-${input.conceptIndex}.png`);
  return `${input.eventId}/${input.assetType}/concepts/${input.batchId}/${filename}`;
}

export async function uploadArtworkBytes(input: {
  storagePath: string;
  bytes: Buffer;
  contentType?: string;
}): Promise<{ success: boolean; publicUrl: string | null; error: string | null }> {
  const supabase = await createClient();

  const { error } = await supabase.storage
    .from(EVENT_ASSETS_BUCKET)
    .upload(input.storagePath, input.bytes, {
      contentType: input.contentType ?? "image/png",
      upsert: false,
    });

  if (error) {
    return { success: false, publicUrl: null, error: error.message };
  }

  return {
    success: true,
    publicUrl: getEventAssetPublicUrl(input.storagePath),
    error: null,
  };
}

export async function deleteArtworkStoragePath(
  storagePath: string,
): Promise<boolean> {
  const supabase = await createClient();
  const normalized = storagePath.includes("/object/public/")
    ? storagePath.split(`${EVENT_ASSETS_BUCKET}/`)[1] ?? storagePath
    : storagePath.replace(/^\/+/, "");

  const { error } = await supabase.storage.from(EVENT_ASSETS_BUCKET).remove([normalized]);
  return !error;
}
