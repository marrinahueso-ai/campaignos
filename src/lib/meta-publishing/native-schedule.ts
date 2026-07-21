import "server-only";

import {
  getFeedCaptionForMilestone,
  getMetaSocialCaptionsForEvent,
} from "@/lib/meta-captions/queries";
import { getMetaConnectionForCurrentOrg } from "@/lib/meta-publishing/connection";
import { isMetaConnectionConfigured } from "@/lib/meta-publishing/connection-utils";
import {
  deleteFacebookGraphObject,
  scheduleFacebookFeedPhoto,
  updateFacebookScheduledPublishTime,
} from "@/lib/meta-publishing/graph-api";
import {
  isWithinMetaNativeScheduleWindow,
  nativeScheduleSoftFailReason,
  resolveGraphPostIdForUpdate,
  slotSupportsMetaNativeSchedule,
  toUnixScheduledPublishTime,
  updateGraphScheduleWithCandidates,
} from "@/lib/meta-publishing/native-schedule-utils";
import { resolveMilestoneArtworkUrls } from "@/lib/meta-publishing/resolve-milestone-artwork";
import { getMetaPublicationSlotsForEvent } from "@/lib/meta-publishing/sync-slots";
import type { MetaConnection, MetaPublicationSlot } from "@/lib/meta-publishing/types";
import { createClient } from "@/lib/supabase/server";

export type NativeScheduleMilestoneResult = {
  created: number;
  updated: number;
  warnings: string[];
};

async function persistSlotGraphSchedule(input: {
  slotId: string;
  graphScheduleId: string | null;
  graphScheduleError: string | null;
}): Promise<void> {
  const supabase = await createClient();
  await supabase
    .from("meta_publication_slots")
    .update({
      graph_schedule_id: input.graphScheduleId,
      graph_schedule_error: input.graphScheduleError,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.slotId);
}

async function tryUpdateGraphScheduleTime(input: {
  connection: MetaConnection;
  scheduleId: string;
  scheduledPublishTimeUnix: number;
}): Promise<{ ok: boolean; error: string | null }> {
  return updateGraphScheduleWithCandidates({
    pageId: input.connection.facebookPageId,
    scheduleId: input.scheduleId,
    scheduledPublishTimeUnix: input.scheduledPublishTimeUnix,
    updateFn: (postId) =>
      updateFacebookScheduledPublishTime({
        postId,
        accessToken: input.connection.pageAccessToken,
        scheduledPublishTimeUnix: input.scheduledPublishTimeUnix,
      }),
  });
}

async function tryDeleteGraphSchedule(input: {
  connection: MetaConnection;
  scheduleId: string;
}): Promise<void> {
  const candidates = resolveGraphPostIdForUpdate({
    pageId: input.connection.facebookPageId,
    scheduleId: input.scheduleId,
  });

  for (const objectId of candidates) {
    const result = await deleteFacebookGraphObject({
      objectId,
      accessToken: input.connection.pageAccessToken,
    });
    if (result.ok) {
      return;
    }
  }
}

async function createOrReplaceFacebookFeedSchedule(input: {
  slot: MetaPublicationSlot;
  connection: MetaConnection;
  feedUrl: string;
  caption: string;
  scheduledFor: string;
}): Promise<{ scheduleId: string | null; error: string | null }> {
  if (!isWithinMetaNativeScheduleWindow(input.scheduledFor)) {
    return {
      scheduleId: null,
      error:
        "Schedule time is outside Meta’s native window (about 10 minutes to 75 days). CampignOS will publish when due.",
    };
  }

  const unix = toUnixScheduledPublishTime(input.scheduledFor);
  if (unix == null) {
    return { scheduleId: null, error: "Invalid schedule time." };
  }

  if (input.slot.graphScheduleId) {
    await tryDeleteGraphSchedule({
      connection: input.connection,
      scheduleId: input.slot.graphScheduleId,
    });
  }

  return scheduleFacebookFeedPhoto({
    pageId: input.connection.facebookPageId,
    accessToken: input.connection.pageAccessToken,
    imageUrl: input.feedUrl,
    caption: input.caption,
    scheduledPublishTimeUnix: unix,
  });
}

/**
 * After Approve: create Meta-native unpublished schedules for Facebook feed slots.
 * Instagram / stories fail soft (documented); CampignOS cron remains the fallback.
 */
export async function createNativeMetaSchedulesForMilestone(input: {
  eventId: string;
  relativeDay: number;
  connection?: MetaConnection | null;
}): Promise<NativeScheduleMilestoneResult> {
  const result: NativeScheduleMilestoneResult = {
    created: 0,
    updated: 0,
    warnings: [],
  };

  const connection =
    input.connection ?? (await getMetaConnectionForCurrentOrg());

  if (!connection || !isMetaConnectionConfigured(connection)) {
    result.warnings.push(
      "Meta is not connected — posts stay on the CampignOS schedule queue.",
    );
    return result;
  }

  const slots = (await getMetaPublicationSlotsForEvent(input.eventId)).filter(
    (slot) =>
      slot.relativeDay === input.relativeDay &&
      (slot.status === "approved" || slot.status === "scheduled"),
  );

  if (slots.length === 0) {
    return result;
  }

  const captions = await getMetaSocialCaptionsForEvent(input.eventId);
  const feedCaption =
    getFeedCaptionForMilestone(captions, input.relativeDay)?.trim() ?? "";
  const { feedUrl } = await resolveMilestoneArtworkUrls({
    eventId: input.eventId,
    relativeDay: input.relativeDay,
  });

  for (const slot of slots) {
    const softFail = nativeScheduleSoftFailReason(slot);
    if (softFail) {
      await persistSlotGraphSchedule({
        slotId: slot.id,
        graphScheduleId: null,
        graphScheduleError: softFail,
      });
      result.warnings.push(softFail);
      continue;
    }

    if (!slotSupportsMetaNativeSchedule(slot)) {
      continue;
    }

    if (!feedUrl) {
      const error = "Approved feed artwork is required for Meta-native schedule.";
      await persistSlotGraphSchedule({
        slotId: slot.id,
        graphScheduleId: slot.graphScheduleId,
        graphScheduleError: error,
      });
      result.warnings.push(error);
      continue;
    }

    if (!slot.scheduledFor) {
      const error = "Missing scheduled_for for Meta-native schedule.";
      await persistSlotGraphSchedule({
        slotId: slot.id,
        graphScheduleId: null,
        graphScheduleError: error,
      });
      result.warnings.push(error);
      continue;
    }

    if (slot.graphScheduleId) {
      const unix = toUnixScheduledPublishTime(slot.scheduledFor);
      if (unix != null && isWithinMetaNativeScheduleWindow(slot.scheduledFor)) {
        const updated = await tryUpdateGraphScheduleTime({
          connection,
          scheduleId: slot.graphScheduleId,
          scheduledPublishTimeUnix: unix,
        });
        if (updated.ok) {
          await persistSlotGraphSchedule({
            slotId: slot.id,
            graphScheduleId: slot.graphScheduleId,
            graphScheduleError: null,
          });
          result.updated += 1;
          continue;
        }
      }
    }

    const created = await createOrReplaceFacebookFeedSchedule({
      slot,
      connection,
      feedUrl,
      caption: feedCaption,
      scheduledFor: slot.scheduledFor,
    });

    if (created.scheduleId) {
      await persistSlotGraphSchedule({
        slotId: slot.id,
        graphScheduleId: created.scheduleId,
        graphScheduleError: null,
      });
      result.created += 1;
      continue;
    }

    await persistSlotGraphSchedule({
      slotId: slot.id,
      graphScheduleId: null,
      graphScheduleError: created.error,
    });
    if (created.error) {
      result.warnings.push(created.error);
    }
  }

  result.warnings = [...new Set(result.warnings)];
  return result;
}

/**
 * After Calendar DnD DB update: push new scheduled_publish_time to Graph when
 * a schedule id exists. Prefer DB success + warning over rolling back.
 */
export async function rescheduleNativeMetaSchedulesForMilestone(input: {
  eventId: string;
  relativeDay: number;
  scheduledFor: string;
  connection?: MetaConnection | null;
}): Promise<NativeScheduleMilestoneResult> {
  const result: NativeScheduleMilestoneResult = {
    created: 0,
    updated: 0,
    warnings: [],
  };

  const connection =
    input.connection ?? (await getMetaConnectionForCurrentOrg());

  if (!connection || !isMetaConnectionConfigured(connection)) {
    return result;
  }

  if (!isWithinMetaNativeScheduleWindow(input.scheduledFor)) {
    result.warnings.push(
      "New time is outside Meta’s native schedule window. CampignOS time was updated; Meta Business Suite may not match until republished.",
    );
  }

  const unix = toUnixScheduledPublishTime(input.scheduledFor);
  if (unix == null) {
    result.warnings.push("Invalid schedule time for Meta update.");
    return result;
  }

  const slots = (await getMetaPublicationSlotsForEvent(input.eventId)).filter(
    (slot) =>
      slot.relativeDay === input.relativeDay &&
      Boolean(slot.graphScheduleId?.trim()) &&
      slotSupportsMetaNativeSchedule(slot),
  );

  if (slots.length === 0) {
    return result;
  }

  const captions = await getMetaSocialCaptionsForEvent(input.eventId);
  const feedCaption =
    getFeedCaptionForMilestone(captions, input.relativeDay)?.trim() ?? "";
  const { feedUrl } = await resolveMilestoneArtworkUrls({
    eventId: input.eventId,
    relativeDay: input.relativeDay,
  });

  for (const slot of slots) {
    const scheduleId = slot.graphScheduleId!.trim();
    const updated = await tryUpdateGraphScheduleTime({
      connection,
      scheduleId,
      scheduledPublishTimeUnix: unix,
    });

    if (updated.ok) {
      await persistSlotGraphSchedule({
        slotId: slot.id,
        graphScheduleId: scheduleId,
        graphScheduleError: null,
      });
      result.updated += 1;
      continue;
    }

    // Update unsupported — delete + recreate when we have artwork.
    if (feedUrl && isWithinMetaNativeScheduleWindow(input.scheduledFor)) {
      await tryDeleteGraphSchedule({ connection, scheduleId });
      const recreated = await scheduleFacebookFeedPhoto({
        pageId: connection.facebookPageId,
        accessToken: connection.pageAccessToken,
        imageUrl: feedUrl,
        caption: feedCaption,
        scheduledPublishTimeUnix: unix,
      });

      if (recreated.scheduleId) {
        await persistSlotGraphSchedule({
          slotId: slot.id,
          graphScheduleId: recreated.scheduleId,
          graphScheduleError: null,
        });
        result.created += 1;
        continue;
      }

      await persistSlotGraphSchedule({
        slotId: slot.id,
        graphScheduleId: null,
        graphScheduleError: recreated.error ?? updated.error,
      });
      result.warnings.push(
        recreated.error ??
          updated.error ??
          "Meta schedule could not be moved. Calendar time was saved; CampignOS will publish when due.",
      );
      continue;
    }

    await persistSlotGraphSchedule({
      slotId: slot.id,
      graphScheduleId: scheduleId,
      graphScheduleError: updated.error,
    });
    result.warnings.push(
      updated.error ??
        "Meta schedule could not be moved. Calendar time was saved.",
    );
  }

  result.warnings = [...new Set(result.warnings)];
  return result;
}

/** Best-effort delete of Graph schedules before immediate CampignOS publish. */
export async function clearNativeMetaSchedulesForSlots(input: {
  slots: MetaPublicationSlot[];
  connection: MetaConnection;
}): Promise<void> {
  for (const slot of input.slots) {
    if (!slot.graphScheduleId?.trim()) {
      continue;
    }
    await tryDeleteGraphSchedule({
      connection: input.connection,
      scheduleId: slot.graphScheduleId,
    });
    await persistSlotGraphSchedule({
      slotId: slot.id,
      graphScheduleId: null,
      graphScheduleError: null,
    });
  }
}
