export type CampaignBuilderStepId =
  | "inspiration"
  | "milestones"
  | "preview"
  | "review"
  | "published";

export type MilestoneCategory = "awareness" | "reminder" | "event-day" | "recap";

export type MilestonePreviewStatus = "ready" | "needs-review" | "draft";

export type MilestoneStatusTag =
  | "complete"
  | "in-progress"
  | "needs-review"
  | "pending"
  | "not-started";

export type PlatformFormat =
  | "facebook-feed"
  | "facebook-story"
  | "instagram-feed"
  | "instagram-story"
  | "instagram-story-manual";

export type DeliveryMethod =
  | "auto-publish"
  | "schedule"
  | "manual-email"
  | "draft-only";

export type ApprovalRole = "creator" | "committee-chair" | "vp-comms";

export type MilestoneApprovalStatusValue =
  | "approved"
  | "pending"
  | "not-started";

export interface InspirationImage {
  id: string;
  label: string;
  url: string | null;
  previewUrl?: string | null;
}

/** Client-to-server payload — includes base64 for blob previews pending upload. */
export interface InspirationImagePayload extends InspirationImage {
  dataUrl?: string | null;
}

export interface CampaignOption {
  id: string;
  title: string;
  /** Dropdown label — may include formatted event date. */
  label: string;
  date: string;
  description: string;
}

export interface CampaignBuilderInspiration {
  campaignId: string;
  campaignName: string;
  eventDate: string;
  playbookId: string;
  inspirationImages: InspirationImage[];
  brandKitId: string;
  voiceTone: string;
  selectedLogoId: string | null;
  includeLogoInArtwork: boolean;
  useSchoolColors: boolean;
  primarySchoolColor: string | null;
  secondarySchoolColor: string | null;
  globalAiGuidance: string;
}

export interface CampaignBuilderMilestone {
  id: string;
  name: string;
  category: MilestoneCategory;
  purpose: string;
  suggestedDate: string;
  platforms: Array<"facebook" | "instagram">;
  platformFormats: PlatformFormat[];
  artworkNotes: string;
  captionNotes: string;
  statusTag: MilestoneStatusTag;
  sortOrder: number;
}

export interface PlatformCaption {
  platform: "facebook" | "instagram";
  text: string;
}

/** Shared artwork slots — one feed (1:1) and one story (9:16) per milestone. */
export interface MilestoneArtwork {
  feedUrl: string | null;
  storyUrl: string | null;
}

export type ArtworkView = "feed" | "story";

export interface MilestoneApprovalStatus {
  role: ApprovalRole;
  label: string;
  status: MilestoneApprovalStatusValue;
  timestamp: string | null;
}

export interface MilestonePreviewContent {
  milestoneId: string;
  status: MilestonePreviewStatus;
  artwork: MilestoneArtwork;
  captions: PlatformCaption[];
  enabledFormats: PlatformFormat[];
  deliveryMethod: DeliveryMethod;
  scheduleDate: string;
  scheduleTime: string;
  emailSendDate: string;
  emailSendTime: string;
  manualEmailTo: string;
  approvalStatuses: MilestoneApprovalStatus[];
}

export type ApprovalWorkflowStepStatus = "complete" | "pending" | "empty";

export interface ApprovalWorkflowStep {
  id: string;
  role: string;
  assigneeName: string | null;
  assigneeInitials: string | null;
  status: ApprovalWorkflowStepStatus;
}

export interface ReviewMilestoneRow {
  milestoneId: string;
  name: string;
  status: MilestonePreviewStatus;
  approvalInitials: string[];
  deliveryMethod: DeliveryMethod;
  scheduleLabel: string;
}

export type PreviewTabId =
  | "all"
  | "feed"
  | "story"
  | "captions"
  | "schedule";

export interface StepWarning {
  id: string;
  message: string;
  step: CampaignBuilderStepId;
  milestoneId?: string;
}

export interface CampaignBuilderSession {
  eventId: string;
  currentStep: CampaignBuilderStepId;
  inspiration: CampaignBuilderInspiration;
  milestones: CampaignBuilderMilestone[];
  previewContents: MilestonePreviewContent[];
  approvalWorkflow: ApprovalWorkflowStep[];
  reviewFilter: "all" | "needs-review" | "approved" | "changes-requested";
  selectedMilestoneId: string | null;
  previewTab: PreviewTabId;
  expandedReviewMilestoneIds: string[];
}

export interface CampaignBuilderStepMeta {
  id: CampaignBuilderStepId;
  label: string;
  subtitle?: string;
  statusLabel?: string;
}

export interface PlaybookOption {
  id: string;
  name: string;
}

export interface BrandKitOption {
  id: string;
  name: string;
}
