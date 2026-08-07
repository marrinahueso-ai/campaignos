import { randomUUID } from "node:crypto";
import { sanitizeEventAssetFilename } from "@/lib/event-workspace/storage";

export const SCHOOL_MEDIA_BUCKET = "school-media";

/** Signed URL TTL for in-app generation / preview (7 days). */
export const SCHOOL_MEDIA_SIGNED_TTL_SECONDS = 60 * 60 * 24 * 7;

export function buildSchoolMediaStoragePath(input: {
  organizationId: string;
  eventId: string;
  filename: string;
  index?: number;
}): string {
  const safe = sanitizeEventAssetFilename(input.filename || "photo.png");
  const idx = input.index != null ? `${input.index}-` : "";
  return `${input.organizationId}/${input.eventId}/${randomUUID()}-${idx}${safe}`;
}
