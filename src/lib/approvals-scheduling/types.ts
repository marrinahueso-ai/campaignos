import type { CommunicationChannel } from "@/types/event-workspace";

export type UnifiedWorkflowStatus =
  | "in_queue"
  | "assigned_to_me"
  | "changes_requested"
  | "scheduled"
  | "posted"
  | "published"
  | "failed";

export type UnifiedTabId =
  | "all"
  | "in_queue"
  | "assigned_to_me"
  | "scheduled"
  | "posted"
  | "published"
  | "failed"
  | "changes_requested";

export type UnifiedViewScope = "assigned_to_me" | "all";

export type ApprovalSortField =
  | "campaign"
  | "status"
  | "assignee"
  | "nextAction"
  | "delivery"
  | "schedule";

export type ApprovalSortDirection = "asc" | "desc";

export type UnifiedDeliveryMethod =
  | "publish-now"
  | "auto-publish"
  | "schedule"
  | "manual-email"
  | "draft-only";

export type UnifiedPlatform = "facebook" | "instagram" | "email";

export interface UnifiedApprovalPreview {
  captionText: string | null;
  storyCaptionSnippet: string | null;
  feedArtworkUrl: string | null;
  storyArtworkUrl: string | null;
  /** Newsletter-only: frozen rendered HTML for Approvals preview. */
  newsletterHtml?: string | null;
  /** Newsletter-only: composer snapshot for in-app email preview chrome. */
  newsletterSnapshot?: unknown | null;
  /** Newsletter-only: proposed (or approved) audience for Visibility. */
  newsletterAudienceId?: string | null;
  newsletterAudienceName?: string | null;
}

export const EMPTY_UNIFIED_APPROVAL_PREVIEW: UnifiedApprovalPreview = {
  captionText: null,
  storyCaptionSnippet: null,
  feedArtworkUrl: null,
  storyArtworkUrl: null,
  newsletterHtml: null,
  newsletterSnapshot: null,
  newsletterAudienceId: null,
  newsletterAudienceName: null,
};

export interface UnifiedApprovalHistoryEntry {
  label: string;
  timestamp: string;
  actor: string;
}

export interface UnifiedApprovalItem {
  id: string;
  source: "classic" | "campaign_builder";
  /** Empty string for organization-scoped items (e.g. newsletters) with no event. */
  eventId: string;
  eventTitle: string;
  campaignName: string;
  milestoneName: string;
  thumbnailUrl: string | null;
  workflowStatus: UnifiedWorkflowStatus;
  statusDetail: string;
  assigneeName: string;
  assigneeRole: string;
  assigneeInitials: string;
  nextAction: string;
  nextActionTime: string;
  deliveryMethod: UnifiedDeliveryMethod | null;
  platforms: UnifiedPlatform[];
  scheduleAt: string | null;
  scheduleLabel: string | null;
  assignedToMe: boolean;
  submittedByMe: boolean;
  hasAssignedUser: boolean;
  approvalRequestId: string | null;
  communicationItemId: string | null;
  schedulingItemId: string | null;
  /** Create with AI milestone id — used for Edit Artwork deep links. */
  campaignMilestoneId: string | null;
  /** Meta publish day when known — used for Retry / Publish Now. */
  metaRelativeDay: number | null;
  /** Customer-facing publish error when status is failed. */
  publishError: string | null;
  channel: CommunicationChannel | null;
  notes: string | null;
  preview: UnifiedApprovalPreview;
  requestedAt: string;
  approvalHistory: UnifiedApprovalHistoryEntry[];
}

/**
 * Legacy or partially enriched approval items can omit preview at runtime.
 * Keep downstream event-detail rendering safe until the item is reloaded.
 */
export function getUnifiedApprovalPreview(
  item: Pick<UnifiedApprovalItem, "preview">,
): UnifiedApprovalPreview {
  return item.preview ?? EMPTY_UNIFIED_APPROVAL_PREVIEW;
}

export interface UnifiedApprovalSummaryCounts {
  inQueue: number;
  assignedToMe: number;
  scheduled: number;
  posted: number;
  published: number;
  failed: number;
  changesRequested: number;
}

export interface UnifiedApprovalsPageData {
  items: UnifiedApprovalItem[];
  summary: UnifiedApprovalSummaryCounts;
  /**
   * Authoritative pulse badge counts (from a thin status index of all rows).
   * When hub SSR defers terminal detail rows, do not recompute these from `items`.
   */
  pulseCounts: {
    needs: number;
    scheduled: number;
    posted: number;
    failed: number;
    changes: number;
  };
  /** True when scheduled/posted/published detail rows were omitted from `items`. */
  defersTerminalDetailRows: boolean;
  campaigns: Array<{ id: string; title: string }>;
  actorEmail: string | null;
  actorUserId: string | null;
  actorRoleId: string | null;
  role: import("@/lib/auth/campaign-roles").CampaignRole;
  canViewAll: boolean;
}

export interface ApprovalSchedulingItemRow {
  id: string;
  /** Null for organization-scoped items (e.g. newsletters) — see `organization_id`. */
  event_id: string | null;
  /** Set for organization-scoped items (e.g. newsletters); null for event-scoped rows. */
  organization_id?: string | null;
  approval_request_id: string | null;
  communication_item_id: string | null;
  source: "classic" | "campaign_builder";
  campaign_milestone_id: string | null;
  campaign_name: string | null;
  milestone_name: string;
  workflow_status: UnifiedWorkflowStatus;
  assigned_user_id: string | null;
  assigned_organization_role_id: string | null;
  requested_by_user_id: string | null;
  delivery_method: string | null;
  platforms: string[] | null;
  schedule_at: string | null;
  caption_text: string | null;
  story_caption: string | null;
  feed_artwork_url: string | null;
  story_artwork_url: string | null;
  manual_upload_link: string | null;
  manual_email_to: string | null;
  manual_email_send_at: string | null;
  manual_upload_email_sent_at: string | null;
  notes: string | null;
  requested_at: string;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}
