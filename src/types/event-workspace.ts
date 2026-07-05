export type EventAssetType =
  | "hero_image"
  | "flyer"
  | "facebook_graphic"
  | "instagram_graphic"
  | "instagram_story"
  | "newsletter_banner"
  | "email_header"
  | "pdf"
  | "canva_link"
  | "logo_used"
  | "miscellaneous"
  | "square_graphic"
  | "logo"
  | "document";

export type EventAssetStatus = "pending" | "uploaded" | "placeholder";

export type CreativePlanStatus =
  | "needed"
  | "in_progress"
  | "generated"
  | "approved"
  | "published";

export interface AiReviewResult {
  verdict: "looks_good" | "suggestions";
  suggestions: string[];
  checkedAt: string;
}

export interface InspirationMatchResult {
  message: string;
  matchedAssetId: string | null;
  matchedEventTitle: string | null;
  recommendedAction: "use_style" | "similar" | null;
}

export interface EventAssetVersion {
  id: string;
  eventAssetId: string;
  versionNumber: number;
  filename: string | null;
  storagePath: string | null;
  uploadedBy: string | null;
  canvaUrl: string | null;
  createdAt: string;
}

export interface EventAssetVersionRow {
  id: string;
  event_asset_id: string;
  version_number: number;
  filename: string | null;
  storage_path: string | null;
  uploaded_by: string | null;
  canva_url: string | null;
  created_at: string;
}

export type CommunicationChannel =
  | "website_announcement"
  | "newsletter"
  | "facebook"
  | "instagram"
  | "email"
  | "flyer"
  | "principal_notes"
  | "morning_announcements"
  | "volunteer_signup";

export type CommunicationStatus =
  | "draft"
  | "generated"
  | "pending_approval"
  | "approved"
  | "changes_requested"
  | "published";

export type ApprovalStatus = "pending" | "approved" | "rejected";

export type PublicationStatus = "scheduled" | "published" | "cancelled";

export type ActivityType =
  | "calendar_imported"
  | "workspace_created"
  | "communications_generated"
  | "board_approval"
  | "published"
  | "event_completed";

export interface EventAsset {
  id: string;
  eventId: string;
  assetType: EventAssetType;
  filename: string | null;
  storagePath: string | null;
  status: EventAssetStatus;
  aiGenerated: boolean;
  uploadedBy: string | null;
  currentVersion: number;
  tags: string[];
  isFavorite: boolean;
  canvaUrl: string | null;
  isCustom: boolean;
  planStatus: CreativePlanStatus | null;
  planLabel: string | null;
  generationPrompt: string | null;
  aiReview: AiReviewResult | null;
  inspirationMatch: InspirationMatchResult | null;
  generationSettings: import("@/lib/ai-artwork/types").ArtworkGenerationSettings | null;
  createdAt: string;
  updatedAt: string;
}

export interface EventAssetRow {
  id: string;
  event_id: string;
  asset_type: EventAssetType;
  filename: string | null;
  storage_path: string | null;
  status: EventAssetStatus;
  ai_generated: boolean;
  uploaded_by?: string | null;
  current_version?: number;
  tags?: string[] | null;
  is_favorite?: boolean;
  canva_url?: string | null;
  is_custom?: boolean;
  plan_status?: CreativePlanStatus | null;
  plan_label?: string | null;
  generation_prompt?: string | null;
  ai_review?: AiReviewResult | null;
  inspiration_match?: InspirationMatchResult | null;
  generation_settings?: import("@/lib/ai-artwork/types").ArtworkGenerationSettings | null;
  created_at: string;
  updated_at: string;
}

export interface CommunicationItem {
  id: string;
  eventId: string;
  channel: CommunicationChannel;
  eventCommunicationStepId: string | null;
  status: CommunicationStatus;
  lastUpdated: string;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
  latestContent: string | null;
}

export interface CommunicationItemRow {
  id: string;
  event_id: string;
  channel: CommunicationChannel;
  event_communication_step_id: string | null;
  status: CommunicationStatus;
  last_updated: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface CommunicationVersion {
  id: string;
  communicationItemId: string;
  content: string;
  versionNumber: number;
  createdBy: string | null;
  createdAt: string;
}

export interface CommunicationVersionRow {
  id: string;
  communication_item_id: string;
  content: string;
  version_number: number;
  created_by: string | null;
  created_at: string;
}

export interface ApprovalRequest {
  id: string;
  eventId: string;
  communicationItemId: string | null;
  communicationVersionId: string | null;
  status: ApprovalStatus;
  requestedAt: string;
  resolvedAt: string | null;
  notes: string | null;
  assignedOrganizationRoleId: string | null;
  assignedUserId: string | null;
  requestedByUserId: string | null;
  assigneeDisplayName: string | null;
  createdAt: string;
}

export interface ApprovalRequestRow {
  id: string;
  event_id: string;
  communication_item_id: string | null;
  communication_version_id?: string | null;
  status: ApprovalStatus;
  requested_at: string;
  resolved_at: string | null;
  notes: string | null;
  assigned_organization_role_id?: string | null;
  assigned_user_id?: string | null;
  requested_by_user_id?: string | null;
  created_at: string;
}

export interface ApprovalQueuePreview {
  milestoneTitle: string | null;
  scheduledFor: string | null;
  captionText: string | null;
  storyCaptionSnippet: string | null;
  artworkThumbnailUrl: string | null;
}

export interface ApprovalQueueItem {
  id: string;
  eventId: string;
  eventTitle: string;
  communicationItemId: string;
  channel: CommunicationChannel;
  status: ApprovalStatus;
  communicationStatus: CommunicationStatus;
  requestedAt: string;
  assigneeDisplayName: string;
  assignedToMe: boolean;
  submittedByMe: boolean;
  notes: string | null;
  preview: ApprovalQueuePreview;
}

export interface PublicationScheduleItem {
  id: string;
  eventId: string;
  communicationItemId: string | null;
  scheduledFor: string;
  status: PublicationStatus;
  createdAt: string;
  updatedAt: string;
}

export interface PublicationScheduleRow {
  id: string;
  event_id: string;
  communication_item_id: string | null;
  scheduled_for: string;
  status: PublicationStatus;
  created_at: string;
  updated_at: string;
}

export interface ActivityLogEntry {
  id: string;
  eventId: string;
  activityType: ActivityType;
  title: string;
  description: string | null;
  occurredAt: string;
  createdAt: string;
}

export interface ActivityLogRow {
  id: string;
  event_id: string;
  activity_type: ActivityType;
  title: string;
  description: string | null;
  occurred_at: string;
  created_at: string;
}

export interface EventOverviewInput {
  description: string;
  time: string | null;
  location: string | null;
  audience: string | null;
  theme: string | null;
  eventOwner: string | null;
  budget: string | null;
  volunteerNeeds: string | null;
}

export interface EventDetailsInput extends EventOverviewInput {
  title: string;
  date: string;
  category: string | null;
}

export interface EventWorkspaceData {
  assets: EventAsset[];
  communications: CommunicationItem[];
  timeline: ActivityLogEntry[];
  approvalRequests: ApprovalRequest[];
  publicationSchedule: PublicationScheduleItem[];
}

export interface StepCommunicationDraft {
  communicationItemId: string;
  eventId: string;
  stepId: string;
  channel: CommunicationChannel;
  stepTitle: string;
  dueDate: string;
  content: string;
  status: CommunicationStatus;
  versionNumber: number;
  lastUpdated: string;
}
