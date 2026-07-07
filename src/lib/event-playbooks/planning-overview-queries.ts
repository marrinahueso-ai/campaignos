import { getApprovalQueueOverviewForCurrentUser } from "@/lib/event-workspace/approval-routing-queries";
import type { MetaPublishBundle } from "@/lib/meta-publishing/types";
import type { EventPlanningOverviewData } from "@/types/planning-overview";
import type {
  ActivityLogEntry,
  ApprovalQueueItem,
} from "@/types/event-workspace";

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

const SCHEDULED_BUNDLE_STATUSES = new Set<MetaPublishBundle["status"]>([
  "scheduled",
  "approved",
]);

function filterByEvent<T extends { eventId: string }>(
  items: T[],
  eventId: string,
): T[] {
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

export function countScheduledMetaBundles(bundles: MetaPublishBundle[]): number {
  return bundles.filter(
    (bundle) =>
      bundle.isMetaPost &&
      bundle.status !== "skipped" &&
      SCHEDULED_BUNDLE_STATUSES.has(bundle.status),
  ).length;
}

export async function getEventPlanningOverviewData(input: {
  eventId: string;
  metaPublishBundles: MetaPublishBundle[];
  timeline: ActivityLogEntry[];
}): Promise<EventPlanningOverviewData> {
  const queue = await getApprovalQueueOverviewForCurrentUser(input.eventId);

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
    scheduledCount: countScheduledMetaBundles(input.metaPublishBundles),
    timeline: filterByEvent(input.timeline, input.eventId).sort(
      (left, right) =>
        new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime(),
    ),
  };
}
