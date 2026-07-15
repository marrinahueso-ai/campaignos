import { channelLabel } from "@/lib/ai/content";
import {
  deriveClassicWorkflowStatus,
  derivePlanningWorkflowStatus,
  deriveSchedulingWorkflowStatus,
  formatFutureRelativeTime,
  formatRelativeTime,
  initialsFromName,
  nextActionForStatus,
  schedulingNeedsApproverAssignment,
  statusDetailForItem,
} from "@/lib/approvals-scheduling/status";
import type {
  ApprovalSchedulingItemRow,
  UnifiedApprovalItem,
  UnifiedDeliveryMethod,
  UnifiedPlatform,
} from "@/lib/approvals-scheduling/types";
import { normalizeMilestoneName } from "@/lib/campaign-builder-v2/milestone-names";
import { formatDateTime } from "@/lib/utils/dates";
import type { PlanningCalendarItem } from "@/types/communications-calendar";
import type { ApprovalQueueItem } from "@/types/event-workspace";

function parseDeliveryMethod(value: string | null): UnifiedDeliveryMethod | null {
  if (!value) {
    return null;
  }

  if (
    value === "auto-publish" ||
    value === "schedule" ||
    value === "manual-email" ||
    value === "draft-only"
  ) {
    return value;
  }

  return null;
}

function parsePlatforms(values: string[] | null | undefined): UnifiedPlatform[] {
  const allowed = new Set<UnifiedPlatform>(["facebook", "instagram", "email"]);
  return (values ?? []).filter((value): value is UnifiedPlatform =>
    allowed.has(value as UnifiedPlatform),
  );
}

function deliveryLabel(method: UnifiedDeliveryMethod | null): string {
  switch (method) {
    case "auto-publish":
      return "Auto-publish";
    case "schedule":
      return "Scheduled";
    case "manual-email":
      return "Manual email";
    case "draft-only":
      return "Draft only";
    default:
      return "Auto-publish";
  }
}

function platformsFromChannel(
  channel: ApprovalQueueItem["channel"] | null,
): UnifiedPlatform[] {
  if (channel === "facebook") {
    return ["facebook"];
  }
  if (channel === "instagram") {
    return ["instagram"];
  }
  if (channel === "email" || channel === "newsletter") {
    return ["email"];
  }
  return ["facebook", "instagram"];
}

export function mapClassicApprovalItem(
  item: ApprovalQueueItem,
  today: string,
  now = new Date(),
): UnifiedApprovalItem {
  const workflowStatus = deriveClassicWorkflowStatus(item, today);
  const scheduleAt = item.preview.scheduledFor;
  const assigneeName = item.assigneeDisplayName || "System";
  const assigneeRole =
    workflowStatus === "in_queue" && assigneeName === "Board"
      ? "Unassigned"
      : "Committee Chair";

  return {
    id: `classic-${item.id}`,
    source: "classic",
    eventId: item.eventId,
    eventTitle: item.eventTitle,
    campaignName: item.eventTitle,
    milestoneName: item.preview.milestoneTitle ?? channelLabel(item.channel),
    thumbnailUrl: item.preview.artworkThumbnailUrl,
    workflowStatus,
    statusDetail: statusDetailForItem(
      workflowStatus,
      item.requestedAt,
      scheduleAt,
      now,
    ),
    assigneeName,
    assigneeRole,
    assigneeInitials: initialsFromName(assigneeName),
    nextAction: nextActionForStatus(workflowStatus),
    nextActionTime:
      workflowStatus === "assigned_to_me"
        ? `Submitted ${formatRelativeTime(item.requestedAt, now)}`
        : scheduleAt
          ? formatFutureRelativeTime(scheduleAt, now)
          : `Submitted ${formatRelativeTime(item.requestedAt, now)}`,
    deliveryMethod: "auto-publish",
    platforms: platformsFromChannel(item.channel),
    scheduleAt,
    scheduleLabel: scheduleAt ? formatDateTime(scheduleAt) : null,
    assignedToMe: item.assignedToMe,
    submittedByMe: item.submittedByMe,
    hasAssignedUser: assigneeName !== "Board",
    approvalRequestId: item.id,
    communicationItemId: item.communicationItemId,
    schedulingItemId: null,
    channel: item.channel,
    notes: item.notes,
    preview: {
      captionText: item.preview.captionText,
      storyCaptionSnippet: item.preview.storyCaptionSnippet,
      feedArtworkUrl: item.preview.artworkThumbnailUrl,
      storyArtworkUrl: null,
    },
    requestedAt: item.requestedAt,
    approvalHistory: [
      {
        label: "Submitted for approval",
        timestamp: item.requestedAt,
        actor: item.submittedByMe ? "You" : "Creator",
      },
      ...(item.resolvedAt
        ? [
            {
              label:
                item.status === "approved" ? "Approved" : "Changes requested",
              timestamp: item.resolvedAt,
              actor: assigneeName,
            },
          ]
        : []),
    ],
  };
}

export function mapPlanningPublishingItem(
  item: PlanningCalendarItem,
  today: string,
  now = new Date(),
  assets?: {
    captionText?: string | null;
    storyCaptionSnippet?: string | null;
    feedArtworkUrl?: string | null;
    storyArtworkUrl?: string | null;
  },
): UnifiedApprovalItem {
  const workflowStatus = derivePlanningWorkflowStatus(item, today);
  const scheduleAt = item.scheduledAt ?? `${item.scheduledDate}T10:00:00.000Z`;
  const feedArtworkUrl = assets?.feedArtworkUrl ?? null;
  const storyArtworkUrl = assets?.storyArtworkUrl ?? null;
  const captionText = assets?.captionText ?? item.draftContent ?? null;
  const storyCaptionSnippet = assets?.storyCaptionSnippet ?? null;

  return {
    id: `planning-${item.id}`,
    source: "classic",
    eventId: item.eventId,
    eventTitle: item.eventTitle,
    campaignName: item.eventTitle,
    milestoneName: normalizeMilestoneName(
      item.timelineStepTitle ?? item.title,
    ),
    thumbnailUrl: feedArtworkUrl ?? storyArtworkUrl,
    workflowStatus,
    statusDetail: statusDetailForItem(
      workflowStatus,
      scheduleAt,
      scheduleAt,
      now,
    ),
    assigneeName: item.assignedUser ?? "System",
    assigneeRole: "System",
    assigneeInitials: initialsFromName(item.assignedUser ?? "System"),
    nextAction: nextActionForStatus(workflowStatus),
    nextActionTime: scheduleAt
      ? formatFutureRelativeTime(scheduleAt, now)
      : formatRelativeTime(scheduleAt, now),
    deliveryMethod: "auto-publish",
    platforms: ["facebook", "instagram"],
    scheduleAt,
    scheduleLabel: formatDateTime(scheduleAt),
    assignedToMe: false,
    submittedByMe: false,
    hasAssignedUser: true,
    approvalRequestId: null,
    communicationItemId: item.communicationItemId,
    schedulingItemId: null,
    channel: item.channel,
    notes: null,
    preview: {
      captionText,
      storyCaptionSnippet,
      feedArtworkUrl,
      storyArtworkUrl,
    },
    requestedAt: scheduleAt,
    approvalHistory: [
      {
        label: "Approved and scheduled",
        timestamp: scheduleAt,
        actor: "System",
      },
    ],
  };
}

export function mapSchedulingItemRow(
  row: ApprovalSchedulingItemRow,
  eventTitle: string,
  assigneeDisplayName: string,
  assigneeRole: string,
  assignedToMe: boolean,
  submittedByMe: boolean,
  now = new Date(),
): UnifiedApprovalItem {
  const deliveryMethod = parseDeliveryMethod(row.delivery_method);
  const platforms = parsePlatforms(row.platforms);
  const workflowStatus = deriveSchedulingWorkflowStatus(row, assignedToMe);
  const needsApproverAssignment = schedulingNeedsApproverAssignment(
    row,
    workflowStatus,
  );
  const history: UnifiedApprovalItem["approvalHistory"] = [
    {
      label: "Submitted for approval",
      timestamp: row.requested_at,
      actor: submittedByMe ? "You" : "Creator",
    },
  ];

  if (row.workflow_status === "changes_requested" && row.notes) {
    history.push({
      label: "Changes requested",
      timestamp: row.resolved_at ?? row.updated_at,
      actor: assigneeDisplayName,
    });
  }

  return {
    id: `cb2-${row.id}`,
    source: "campaign_builder",
    eventId: row.event_id,
    eventTitle,
    campaignName: row.campaign_name ?? eventTitle,
    milestoneName: normalizeMilestoneName(row.milestone_name),
    thumbnailUrl: row.feed_artwork_url ?? row.story_artwork_url,
    workflowStatus,
    statusDetail: statusDetailForItem(
      workflowStatus,
      row.requested_at,
      row.schedule_at,
      now,
      needsApproverAssignment,
    ),
    assigneeName: assigneeDisplayName,
    assigneeRole: needsApproverAssignment ? "Unassigned" : assigneeRole,
    assigneeInitials: initialsFromName(assigneeDisplayName),
    nextAction: nextActionForStatus(workflowStatus, needsApproverAssignment),
    nextActionTime: `Submitted ${formatRelativeTime(row.requested_at, now)}`,
    deliveryMethod,
    platforms: platforms.length > 0 ? platforms : ["facebook", "instagram"],
    scheduleAt: row.schedule_at,
    scheduleLabel: row.schedule_at ? formatDateTime(row.schedule_at) : null,
    assignedToMe,
    submittedByMe,
    hasAssignedUser: Boolean(row.assigned_user_id),
    approvalRequestId: row.approval_request_id,
    communicationItemId: row.communication_item_id,
    schedulingItemId: row.id,
    channel: null,
    notes: row.notes,
    preview: {
      captionText: row.caption_text,
      storyCaptionSnippet: row.story_caption,
      feedArtworkUrl: row.feed_artwork_url,
      storyArtworkUrl: row.story_artwork_url,
    },
    requestedAt: row.requested_at,
    approvalHistory: history,
  };
}

export function deliveryMethodLabel(method: UnifiedDeliveryMethod | null): string {
  return deliveryLabel(method);
}
