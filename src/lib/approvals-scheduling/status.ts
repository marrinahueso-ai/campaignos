import type { ApprovalQueueItem } from "@/types/event-workspace";
import type { PlanningCalendarItem } from "@/types/communications-calendar";
import type {
  ApprovalSchedulingItemRow,
  ApprovalSortDirection,
  ApprovalSortField,
  UnifiedApprovalItem,
  UnifiedDeliveryMethod,
  UnifiedPlatform,
  UnifiedTabId,
  UnifiedWorkflowStatus,
} from "@/lib/approvals-scheduling/types";

const WORKFLOW_STATUS_SORT_ORDER: Record<UnifiedWorkflowStatus, number> = {
  in_queue: 0,
  assigned_to_me: 1,
  changes_requested: 2,
  scheduled: 3,
  posted: 4,
  published: 5,
};

const WORKFLOW_STATUS_SEARCH_LABELS: Record<UnifiedWorkflowStatus, string> = {
  in_queue: "in queue",
  assigned_to_me: "assigned to me",
  changes_requested: "changes requested",
  scheduled: "scheduled",
  posted: "posted",
  published: "published",
};

function deliverySearchLabel(method: UnifiedDeliveryMethod | null): string {
  switch (method) {
    case "publish-now":
    case "auto-publish":
      return "publish now";
    case "schedule":
      return "scheduled";
    case "manual-email":
      return "manual email";
    case "draft-only":
      return "draft only";
    default:
      return "";
  }
}

function platformSearchLabels(platforms: UnifiedPlatform[]): string[] {
  return platforms.flatMap((platform) => {
    switch (platform) {
      case "facebook":
        return ["facebook", "fb"];
      case "instagram":
        return ["instagram", "ig"];
      case "email":
        return ["email"];
      default:
        return [];
    }
  });
}

export const DEFAULT_APPROVAL_SORT_FIELD: ApprovalSortField = "schedule";
export const DEFAULT_APPROVAL_SORT_DIRECTION: ApprovalSortDirection = "asc";

function compareText(left: string, right: string): number {
  return left.localeCompare(right, undefined, { sensitivity: "base" });
}

function compareNullableIso(
  left: string | null,
  right: string | null,
): number {
  if (!left && !right) {
    return 0;
  }
  if (!left) {
    return 1;
  }
  if (!right) {
    return -1;
  }
  return left.localeCompare(right);
}

function deliverySortKey(item: UnifiedApprovalItem): string {
  return [
    item.deliveryMethod ?? "",
    ...[...item.platforms].sort(),
  ].join("|");
}

function campaignSortKey(item: UnifiedApprovalItem): string {
  return `${item.campaignName}\u0000${item.milestoneName}`;
}

export function compareApprovalItems(
  left: UnifiedApprovalItem,
  right: UnifiedApprovalItem,
  field: ApprovalSortField,
  direction: ApprovalSortDirection = "asc",
): number {
  const directionFactor = direction === "asc" ? 1 : -1;

  switch (field) {
    case "campaign":
      return (
        compareText(campaignSortKey(left), campaignSortKey(right)) *
        directionFactor
      );
    case "status":
      return (
        (WORKFLOW_STATUS_SORT_ORDER[left.workflowStatus] -
          WORKFLOW_STATUS_SORT_ORDER[right.workflowStatus]) *
        directionFactor
      );
    case "assignee":
      return (
        compareText(left.assigneeName, right.assigneeName) * directionFactor
      );
    case "nextAction":
      return compareText(left.nextAction, right.nextAction) * directionFactor;
    case "delivery":
      return (
        compareText(deliverySortKey(left), deliverySortKey(right)) *
        directionFactor
      );
    case "schedule": {
      // Unscheduled rows always sink to the bottom.
      if (!left.scheduleAt && !right.scheduleAt) {
        return 0;
      }
      if (!left.scheduleAt) {
        return 1;
      }
      if (!right.scheduleAt) {
        return -1;
      }
      return left.scheduleAt.localeCompare(right.scheduleAt) * directionFactor;
    }
    default:
      return 0;
  }
}

export function sortApprovalItems(
  items: UnifiedApprovalItem[],
  field: ApprovalSortField,
  direction: ApprovalSortDirection,
): UnifiedApprovalItem[] {
  return [...items].sort((left, right) => {
    const primary = compareApprovalItems(left, right, field, direction);
    if (primary !== 0) {
      return primary;
    }
    const scheduleTie = compareNullableIso(left.scheduleAt, right.scheduleAt);
    if (scheduleTie !== 0) {
      return scheduleTie;
    }
    return right.requestedAt.localeCompare(left.requestedAt);
  });
}

export function nextApprovalSortState(
  currentField: ApprovalSortField,
  currentDirection: ApprovalSortDirection,
  nextField: ApprovalSortField,
): { field: ApprovalSortField; direction: ApprovalSortDirection } {
  if (currentField === nextField) {
    return {
      field: currentField,
      direction: currentDirection === "asc" ? "desc" : "asc",
    };
  }

  return {
    field: nextField,
    direction: "asc",
  };
}

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

export function deriveSchedulingWorkflowStatus(
  row: ApprovalSchedulingItemRow,
  assignedToMe: boolean,
): UnifiedWorkflowStatus {
  if (row.workflow_status === "changes_requested") {
    return "changes_requested";
  }

  if (
    row.workflow_status === "scheduled" ||
    row.workflow_status === "posted" ||
    row.workflow_status === "published"
  ) {
    return row.workflow_status;
  }

  if (!row.assigned_user_id) {
    return "in_queue";
  }

  return assignedToMe ? "assigned_to_me" : "in_queue";
}

export function schedulingNeedsApproverAssignment(
  row: ApprovalSchedulingItemRow,
  workflowStatus: UnifiedWorkflowStatus,
): boolean {
  return workflowStatus === "in_queue" && !row.assigned_user_id;
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
  needsApproverAssignment = false,
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
      if (needsApproverAssignment) {
        return "Needs approver assigned";
      }
      if (scheduleAt) {
        return formatFutureRelativeTime(scheduleAt, now);
      }
      return `Submitted ${formatRelativeTime(requestedAt, now)}`;
  }
}

export function nextActionForStatus(
  status: UnifiedWorkflowStatus,
  needsApproverAssignment = false,
): string {
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
      return needsApproverAssignment
        ? "Needs approver assigned"
        : "Awaiting assignment";
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

  // Cover every sortable table column plus related display text.
  const haystack = [
    item.eventTitle,
    item.campaignName,
    item.milestoneName,
    item.workflowStatus,
    WORKFLOW_STATUS_SEARCH_LABELS[item.workflowStatus],
    item.statusDetail,
    item.assigneeName,
    item.assigneeRole,
    item.assigneeInitials,
    item.nextAction,
    item.nextActionTime,
    item.deliveryMethod ?? "",
    deliverySearchLabel(item.deliveryMethod),
    ...platformSearchLabels(item.platforms),
    item.scheduleLabel ?? "",
    item.scheduleAt ?? "",
    item.notes ?? "",
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(normalized);
}

/** True when ReviewDrawer should fetch caption / rich preview fields. */
export function unifiedItemNeedsPreviewEnrichment(
  item: UnifiedApprovalItem,
): boolean {
  const hasCaption = Boolean(
    item.preview.captionText || item.preview.storyCaptionSnippet,
  );
  if (hasCaption) {
    return false;
  }
  return Boolean(item.schedulingItemId) || item.source === "classic";
}
