import "server-only";

import { createClient } from "@/lib/supabase/server";
import {
  createAdminClient,
  isSupabaseAdminConfigured,
} from "@/lib/supabase/admin";
import { requireEventAccess } from "@/lib/events/queries";
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

/**
 * Upload generated/inspiration artwork bytes to event-assets.
 * Prefer service role when configured — Storage RLS is bypassed, so event-scoped
 * callers MUST pass `eventId` (gated via requireEventAccess). Org-scoped paths
 * (flyer/homepage composers) omit eventId and enforce membership at the action.
 */
export async function uploadArtworkBytes(input: {
  storagePath: string;
  bytes: Buffer;
  contentType?: string;
  /**
   * When set, fails closed unless the caller can access this event, and the
   * storage path must be under `{eventId}/…`.
   */
  eventId?: string;
}): Promise<{ success: boolean; publicUrl: string | null; error: string | null }> {
  if (input.eventId) {
    const access = await requireEventAccess(input.eventId);
    if ("error" in access) {
      return { success: false, publicUrl: null, error: access.error };
    }
    const prefix = `${input.eventId}/`;
    if (!input.storagePath.startsWith(prefix)) {
      return {
        success: false,
        publicUrl: null,
        error: "Storage path does not match the event.",
      };
    }
  }

  const supabase = isSupabaseAdminConfigured()
    ? createAdminClient()
    : await createClient();

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
  const supabase = isSupabaseAdminConfigured()
    ? createAdminClient()
    : await createClient();
  const normalized = storagePath.includes("/object/public/")
    ? storagePath.split(`${EVENT_ASSETS_BUCKET}/`)[1] ?? storagePath
    : storagePath.replace(/^\/+/, "");

  const { error } = await supabase.storage.from(EVENT_ASSETS_BUCKET).remove([normalized]);
  return !error;
}
