import { getApprovalQueueOverviewForCurrentUser } from "@/lib/event-workspace/approval-routing-queries";
import type { MetaPublishBundle } from "@/lib/meta-publishing/types";
import type { EventPlanningOverviewData } from "@/types/planning-overview";
import type {
  ActivityLogEntry,
  ApprovalQueueItem,
  PublicationScheduleItem,
} from "@/types/event-workspace";

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function filterByEvent(
  items: ApprovalQueueItem[],
  eventId: string,
): ApprovalQueueItem[] {
  return items.filter((item) => item.eventId === eventId);
}

function countApprovedThisWeek(items: ApprovalQueueItem[]): number {
  const cutoff = Date.now() - ONE_WEEK_MS;
  return items.filter((item) => {
    if (item.status !== "approved") {
      return false;
    }

    const resolvedAt = item.resolvedAt ?? item.requestedAt;
    return new Date(resolvedAt).getTime() >= cutoff;
  }).length;
}

function countScheduledPosts(
  bundles: MetaPublishBundle[],
  publicationSchedule: PublicationScheduleItem[],
): number {
  const scheduledBundles = bundles.filter(
    (bundle) =>
      bundle.status === "scheduled" ||
      (Boolean(bundle.scheduledFor) &&
        !["published", "skipped", "failed", "cancelled"].includes(bundle.status)),
  ).length;

  const scheduledEntries = publicationSchedule.filter(
    (entry) => entry.status === "scheduled",
  ).length;

  return Math.max(scheduledBundles, scheduledEntries);
}

export async function getEventPlanningOverviewData(input: {
  eventId: string;
  metaPublishBundles: MetaPublishBundle[];
  publicationSchedule: PublicationScheduleItem[];
  timeline: ActivityLogEntry[];
}): Promise<EventPlanningOverviewData> {
  const queue = await getApprovalQueueOverviewForCurrentUser();

  const assignedToMe = filterByEvent(queue.assignedToMe, input.eventId);
  const allPending = filterByEvent(queue.allPending, input.eventId);
  const otherPending = allPending.filter((item) => !item.assignedToMe);
  const changesRequested = filterByEvent(queue.changesRequested, input.eventId);
  const recentlyApproved = filterByEvent(queue.recentlyApproved, input.eventId);

  return {
    assignedToMe,
    otherPending,
    changesRequested,
    recentlyApproved,
    assignedToMeCount: assignedToMe.length,
    otherPendingCount: otherPending.length,
    approvedThisWeekCount: countApprovedThisWeek(recentlyApproved),
    scheduledPostsCount: countScheduledPosts(
      input.metaPublishBundles,
      input.publicationSchedule,
    ),
    timeline: [...input.timeline].sort(
      (left, right) =>
        new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime(),
    ),
  };
}
