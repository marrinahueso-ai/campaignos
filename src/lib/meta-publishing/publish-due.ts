import {
  getMetaConnectionForEvent,
} from "@/lib/meta-publishing/connection";
import { publishMetaMilestoneBundle } from "@/lib/meta-publishing/publish-milestone";
import {
  createAdminClient,
  isSupabaseAdminConfigured,
} from "@/lib/supabase/admin";

export interface PublishDueResult {
  processedBundles: number;
  publishedBundles: number;
  failedBundles: number;
  errors: string[];
}

type DueMilestone = {
  eventId: string;
  relativeDay: number;
};

export async function findDueApprovedMilestones(): Promise<DueMilestone[]> {
  if (!isSupabaseAdminConfigured()) {
    console.error(
      "Meta publish cron: SUPABASE_SERVICE_ROLE_KEY is not configured; cannot load due slots under RLS.",
    );
    return [];
  }

  const supabase = createAdminClient();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("meta_publication_slots")
    .select("event_id, relative_day, scheduled_for, status")
    .eq("status", "approved")
    .not("scheduled_for", "is", null)
    .lte("scheduled_for", now);

  if (error) {
    console.error("Failed to load due meta publication slots:", error.message);
    return [];
  }

  const keys = new Set<string>();
  const milestones: DueMilestone[] = [];

  for (const row of data ?? []) {
    const key = `${row.event_id}:${row.relative_day}`;
    if (keys.has(key)) {
      continue;
    }
    keys.add(key);
    milestones.push({
      eventId: row.event_id as string,
      relativeDay: row.relative_day as number,
    });
  }

  return milestones;
}

async function publishDueMilestone(
  milestone: DueMilestone,
): Promise<{ success: boolean; error?: string | null }> {
  const connection = await getMetaConnectionForEvent(milestone.eventId, {
    useServiceRole: true,
  });

  return publishMetaMilestoneBundle({
    eventId: milestone.eventId,
    relativeDay: milestone.relativeDay,
    connection,
    useServiceRole: true,
  });
}

export async function publishDueMetaMilestones(): Promise<PublishDueResult> {
  const due = await findDueApprovedMilestones();
  const result: PublishDueResult = {
    processedBundles: 0,
    publishedBundles: 0,
    failedBundles: 0,
    errors: [],
  };

  for (const milestone of due) {
    result.processedBundles += 1;
    const publishResult = await publishDueMilestone(milestone);

    if (publishResult.success) {
      result.publishedBundles += 1;
    } else {
      result.failedBundles += 1;
      if (publishResult.error) {
        result.errors.push(
          `Event ${milestone.eventId} day ${milestone.relativeDay}: ${publishResult.error}`,
        );
      }
    }
  }

  return result;
}

export async function publishDueMetaMilestonesForEvent(
  eventId: string,
): Promise<PublishDueResult> {
  const due = (await findDueApprovedMilestones()).filter(
    (milestone) => milestone.eventId === eventId,
  );

  const result: PublishDueResult = {
    processedBundles: 0,
    publishedBundles: 0,
    failedBundles: 0,
    errors: [],
  };

  for (const milestone of due) {
    result.processedBundles += 1;
    // Interactive "publish due for event" still has a user session — keep
    // session org connection when present, but allow service-role DB writes
    // only when called from cron via publishDueMetaMilestones.
    const publishResult = await publishMetaMilestoneBundle({
      eventId: milestone.eventId,
      relativeDay: milestone.relativeDay,
    });

    if (publishResult.success) {
      result.publishedBundles += 1;
    } else {
      result.failedBundles += 1;
      if (publishResult.error) {
        result.errors.push(publishResult.error);
      }
    }
  }

  return result;
}
