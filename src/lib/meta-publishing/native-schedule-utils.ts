/** Pure helpers for Meta-native Graph scheduling (no I/O). */

/** Meta Page scheduled posts require ~10 minutes of lead time. */
export const META_NATIVE_SCHEDULE_MIN_LEAD_MS = 10 * 60 * 1000;

/** Graph docs allow up to ~75 days; stay within that window. */
export const META_NATIVE_SCHEDULE_MAX_LEAD_MS = 75 * 24 * 60 * 60 * 1000;

export const INSTAGRAM_NATIVE_SCHEDULE_UNSUPPORTED =
  "Instagram Graph API does not support reliable native scheduled_publish_time; CampignOS will publish when due.";

export const FACEBOOK_STORY_NATIVE_SCHEDULE_UNSUPPORTED =
  "Facebook photo stories cannot be scheduled via Graph scheduled_publish_time; CampignOS will publish when due.";

export function toUnixScheduledPublishTime(iso: string): number | null {
  const ms = new Date(iso).getTime();
  if (!Number.isFinite(ms)) {
    return null;
  }
  return Math.floor(ms / 1000);
}

export function isWithinMetaNativeScheduleWindow(
  scheduledForIso: string,
  nowMs = Date.now(),
): boolean {
  const target = new Date(scheduledForIso).getTime();
  if (!Number.isFinite(target)) {
    return false;
  }
  const lead = target - nowMs;
  return (
    lead >= META_NATIVE_SCHEDULE_MIN_LEAD_MS &&
    lead <= META_NATIVE_SCHEDULE_MAX_LEAD_MS
  );
}

/** Facebook Page feed is the only placement with reliable Graph scheduling. */
export function slotSupportsMetaNativeSchedule(slot: {
  platform: string;
  placement: string;
}): boolean {
  return slot.platform === "facebook" && slot.placement === "feed";
}

export function nativeScheduleSoftFailReason(slot: {
  platform: string;
  placement: string;
}): string | null {
  if (slotSupportsMetaNativeSchedule(slot)) {
    return null;
  }
  if (slot.platform === "instagram") {
    return INSTAGRAM_NATIVE_SCHEDULE_UNSUPPORTED;
  }
  if (slot.platform === "facebook" && slot.placement === "story") {
    return FACEBOOK_STORY_NATIVE_SCHEDULE_UNSUPPORTED;
  }
  return "This placement does not support Meta-native scheduling.";
}

/** Slots with a Graph schedule id are published by Meta, not CampignOS cron. */
export function shouldSkipCampignOsCronPublish(slot: {
  graphScheduleId?: string | null;
}): boolean {
  return Boolean(slot.graphScheduleId?.trim());
}

/**
 * Payload for calendar DnD on meta_publication_slots.
 * Must never include `status` — approval stays intact.
 */
export function buildMetaMilestoneRescheduleSlotUpdate(
  scheduledFor: string,
  updatedAt: string,
): { scheduled_for: string; updated_at: string } {
  return {
    scheduled_for: scheduledFor,
    updated_at: updatedAt,
  };
}

export function resolveGraphPostIdForUpdate(input: {
  pageId: string;
  scheduleId: string;
}): string[] {
  const id = input.scheduleId.trim();
  if (!id) {
    return [];
  }
  if (id.includes("_")) {
    return [id];
  }
  return [id, `${input.pageId}_${id}`];
}

/** Try Graph update against bare id then page_post_id (mockable for unit tests). */
export async function updateGraphScheduleWithCandidates(input: {
  pageId: string;
  scheduleId: string;
  scheduledPublishTimeUnix: number;
  updateFn: (postId: string) => Promise<{ ok: boolean; error: string | null }>;
}): Promise<{ ok: boolean; error: string | null }> {
  const candidates = resolveGraphPostIdForUpdate({
    pageId: input.pageId,
    scheduleId: input.scheduleId,
  });

  let lastError: string | null = "No Graph schedule id to update.";
  for (const postId of candidates) {
    const result = await input.updateFn(postId);
    if (result.ok) {
      return { ok: true, error: null };
    }
    lastError = result.error;
  }

  return { ok: false, error: lastError };
}
