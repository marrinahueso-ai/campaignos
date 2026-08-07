import "server-only";

import {
  createAdminClient,
  isSupabaseAdminConfigured,
} from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  SCHOOL_MEDIA_BUCKET,
  SCHOOL_MEDIA_SIGNED_TTL_SECONDS,
  buildSchoolMediaStoragePath,
} from "@/lib/school-media/paths";

export {
  SCHOOL_MEDIA_BUCKET,
  SCHOOL_MEDIA_SIGNED_TTL_SECONDS,
  buildSchoolMediaStoragePath,
} from "@/lib/school-media/paths";

/**
 * Upload school-uploaded photos to the private school-media bucket and return
 * a time-limited signed URL (not a permanent public CDN URL).
 */
export async function uploadSchoolMediaBytes(input: {
  organizationId: string;
  eventId: string;
  bytes: Buffer;
  contentType: string;
  filename: string;
  index?: number;
}): Promise<{
  success: boolean;
  signedUrl: string | null;
  path: string | null;
  error: string | null;
}> {
  if (!input.organizationId.trim() || !input.eventId.trim()) {
    return {
      success: false,
      signedUrl: null,
      path: null,
      error: "Organization and event are required.",
    };
  }

  const storagePath = buildSchoolMediaStoragePath({
    organizationId: input.organizationId.trim(),
    eventId: input.eventId.trim(),
    filename: input.filename,
    index: input.index,
  });

  const supabase = isSupabaseAdminConfigured()
    ? createAdminClient()
    : await createClient();

  const { error: uploadError } = await supabase.storage
    .from(SCHOOL_MEDIA_BUCKET)
    .upload(storagePath, input.bytes, {
      contentType: input.contentType,
      upsert: false,
    });

  if (uploadError) {
    return {
      success: false,
      signedUrl: null,
      path: null,
      error: uploadError.message,
    };
  }

  const { data: signed, error: signError } = await supabase.storage
    .from(SCHOOL_MEDIA_BUCKET)
    .createSignedUrl(storagePath, SCHOOL_MEDIA_SIGNED_TTL_SECONDS);

  if (signError || !signed?.signedUrl) {
    return {
      success: false,
      signedUrl: null,
      path: storagePath,
      error: signError?.message ?? "Unable to sign school media URL.",
    };
  }

  return {
    success: true,
    signedUrl: signed.signedUrl,
    path: storagePath,
    error: null,
  };
}
