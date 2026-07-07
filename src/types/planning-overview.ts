import type { ActivityLogEntry, ApprovalQueueItem } from "@/types/event-workspace";

export interface EventPlanningOverviewData {
  assignedToMe: ApprovalQueueItem[];
  otherPending: ApprovalQueueItem[];
  changesRequested: ApprovalQueueItem[];
  recentlyApproved: ApprovalQueueItem[];
  assignedToMeCount: number;
  otherPendingCount: number;
  approvedThisWeekCount: number;
  scheduledCount: number;
  timeline: ActivityLogEntry[];
}
