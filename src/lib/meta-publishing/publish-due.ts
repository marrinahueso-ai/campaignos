import { publishMetaMilestoneBundle } from "@/lib/meta-publishing/publish-milestone";
import { createClient } from "@/lib/supabase/server";

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
  const supabase = await createClient();
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
    const publishResult = await publishMetaMilestoneBundle({
      eventId: milestone.eventId,
      relativeDay: milestone.relativeDay,
    });

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
