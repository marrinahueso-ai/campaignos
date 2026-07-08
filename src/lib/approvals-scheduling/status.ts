import type { ApprovalQueueItem } from "@/types/event-workspace";
import type { PlanningCalendarItem } from "@/types/communications-calendar";
import type {
  UnifiedApprovalItem,
  UnifiedTabId,
  UnifiedWorkflowStatus,
} from "@/lib/approvals-scheduling/types";

export function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "—";
  }
  if (parts.length === 1) {
    return parts[0]!.slice(0, 2).toUpperCase();
  }
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

export function formatRelativeTime(isoDate: string, now = new Date()): string {
  const then = new Date(isoDate).getTime();
  const diffMs = now.getTime() - then;
  const diffMinutes = Math.round(diffMs / (1000 * 60));

  if (diffMinutes < 1) {
    return "Just now";
  }
  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  const diffDays = Math.round(diffHours / 24);
  if (diffDays === 1) {
    return "1d ago";
  }
  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }

  return new Date(isoDate).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function formatFutureRelativeTime(isoDate: string, now = new Date()): string {
  const then = new Date(isoDate).getTime();
  const diffMs = then - now.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) {
    return "Today";
  }
  if (diffDays === 1) {
    return "In 1 day";
  }
  return `In ${diffDays} days`;
}

export function deriveClassicWorkflowStatus(
  item: ApprovalQueueItem,
  today: string,
): UnifiedWorkflowStatus {
  if (item.communicationStatus === "changes_requested") {
    return "changes_requested";
  }

  if (item.status === "approved" || item.communicationStatus === "published") {
    if (item.communicationStatus === "published") {
      return "published";
    }

    const scheduledFor = item.preview.scheduledFor;
    if (scheduledFor) {
      const scheduledDate = scheduledFor.slice(0, 10);
      if (scheduledDate > today) {
        return "scheduled";
      }
      return "posted";
    }

    return "scheduled";
  }

  if (item.status === "pending") {
    return item.assignedToMe ? "assigned_to_me" : "in_queue";
  }

  return "in_queue";
}

export function derivePlanningWorkflowStatus(
  item: PlanningCalendarItem,
  today: string,
): UnifiedWorkflowStatus {
  if (item.approvalStatus === "pending" || item.status === "pending_approval") {
    return "in_queue";
  }

  if (item.publishStatus === "published" || item.status === "published") {
    return "published";
  }

  if (item.publishStatus === "posting" || item.status === "posting") {
    return "posted";
  }

  if (item.scheduledDate > today) {
    return "scheduled";
  }

  if (!item.publishStatus || item.publishStatus !== "published") {
    return "posted";
  }

  return "scheduled";
}

export function statusDetailForItem(
  status: UnifiedWorkflowStatus,
  requestedAt: string,
  scheduleAt: string | null,
  now = new Date(),
): string {
  switch (status) {
    case "assigned_to_me":
      return "Due today";
    case "changes_requested":
      return `Returned ${formatRelativeTime(requestedAt, now)}`;
    case "scheduled":
      return "Ready to publish";
    case "posted":
      return "Waiting on platform";
    case "published":
      return "Live on all platforms";
    case "in_queue":
    default:
      if (scheduleAt) {
        return formatFutureRelativeTime(scheduleAt, now);
      }
      return `Submitted ${formatRelativeTime(requestedAt, now)}`;
  }
}

export function nextActionForStatus(status: UnifiedWorkflowStatus): string {
  switch (status) {
    case "assigned_to_me":
      return "Review and approve";
    case "changes_requested":
      return "Make changes";
    case "scheduled":
      return "Publishing";
    case "posted":
      return "Publishing";
    case "published":
      return "Completed";
    case "in_queue":
    default:
      return "Awaiting assignment";
  }
}

export function tabMatchesItem(tab: UnifiedTabId, item: UnifiedApprovalItem): boolean {
  if (tab === "all") {
    return true;
  }
  return item.workflowStatus === tab;
}

export function summarizeCounts(
  items: UnifiedApprovalItem[],
): Record<Exclude<UnifiedTabId, "all">, number> {
  return {
    in_queue: items.filter((item) => item.workflowStatus === "in_queue").length,
    assigned_to_me: items.filter((item) => item.workflowStatus === "assigned_to_me")
      .length,
    scheduled: items.filter((item) => item.workflowStatus === "scheduled").length,
    posted: items.filter((item) => item.workflowStatus === "posted").length,
    published: items.filter((item) => item.workflowStatus === "published").length,
    changes_requested: items.filter((item) => item.workflowStatus === "changes_requested")
      .length,
  };
}

export function searchMatchesItem(
  item: UnifiedApprovalItem,
  query: string,
): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return true;
  }

  const haystack = [
    item.eventTitle,
    item.campaignName,
    item.milestoneName,
    item.assigneeName,
    item.assigneeRole,
    item.nextAction,
    item.notes ?? "",
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(normalized);
}
