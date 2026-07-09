import type { CommunicationChannel } from "@/types/event-workspace";

export type UnifiedWorkflowStatus =
  | "in_queue"
  | "assigned_to_me"
  | "changes_requested"
  | "scheduled"
  | "posted"
  | "published";

export type UnifiedTabId =
  | "all"
  | "in_queue"
  | "assigned_to_me"
  | "scheduled"
  | "posted"
  | "published"
  | "changes_requested";

export type UnifiedViewScope = "assigned_to_me" | "all";

export type UnifiedDeliveryMethod =
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
}

export interface UnifiedApprovalHistoryEntry {
  label: string;
  timestamp: string;
  actor: string;
}

export interface UnifiedApprovalItem {
  id: string;
  source: "classic" | "campaign_builder";
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
  channel: CommunicationChannel | null;
  notes: string | null;
  preview: UnifiedApprovalPreview;
  requestedAt: string;
  approvalHistory: UnifiedApprovalHistoryEntry[];
}

export interface UnifiedApprovalSummaryCounts {
  inQueue: number;
  assignedToMe: number;
  scheduled: number;
  posted: number;
  published: number;
  changesRequested: number;
}

export interface UnifiedApprovalsPageData {
  items: UnifiedApprovalItem[];
  summary: UnifiedApprovalSummaryCounts;
  campaigns: Array<{ id: string; title: string }>;
  actorEmail: string | null;
  actorUserId: string | null;
  actorRoleId: string | null;
  role: import("@/lib/auth/campaign-roles").CampaignRole;
  canViewAll: boolean;
}

export interface ApprovalSchedulingItemRow {
  id: string;
  event_id: string;
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
  notes: string | null;
  requested_at: string;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}
