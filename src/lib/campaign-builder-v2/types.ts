export type CampaignBuilderStepId =
  | "inspiration"
  | "milestones"
  | "preview"
  | "review"
  | "published";

export type MilestoneCategory = "awareness" | "reminder" | "event-day" | "recap";

export type MilestonePreviewStatus = "ready" | "needs-review" | "draft";

export type MilestoneGenerationStatus =
  | "ready_to_generate"
  | "queued"
  | "generating"
  | "generated"
  | "needs_review"
  | "changes_requested"
  | "awaiting_approval"
  | "approved"
  | "scheduled"
  | "published"
  | "failed";

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
  /** Optional per-image note for AI (Creative Setup). */
  comment?: string;
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

/** Mutually exclusive color modes for Creative Setup. */
export type CreativeColorMode =
  | "none"
  | "organization_palette"
  | "inspiration_palette"
  | "custom_palette";

/**
 * Campaign foundation + Creative Setup selections.
 * Creative fields default to explicit None — never auto-select org logo/colors/tone.
 */
export interface CampaignBuilderInspiration {
  campaignId: string;
  campaignName: string;
  eventDate: string;
  playbookId: string;
  inspirationImages: InspirationImage[];
  /** Overall note applied when inspiration images are present. */
  inspirationOverallComment: string;
  brandKitId: string;
  /** Joined voice tones for prompts; empty string = None. */
  voiceTone: string;
  /** Multi-select voice/tone chips; empty = None. */
  voiceToneValues: string[];
  selectedLogoId: string | null;
  includeLogoInArtwork: boolean;
  /** Set when the user toggles logo inclusion — not auto-defaulted on page load. */
  includeLogoInArtworkUserSet?: boolean;
  /** Session-uploaded logo (not from org brand kit). */
  uploadedLogoUrl?: string | null;
  uploadedLogoLabel?: string | null;
  /** Authoritative color selection mode (None by default). */
  colorMode: CreativeColorMode;
  /** Custom swatches when colorMode === "custom_palette". */
  customPaletteColors: string[];
  /** Derived from colorMode === "organization_palette" for legacy prompt paths. */
  useSchoolColors: boolean;
  primarySchoolColor: string | null;
  secondarySchoolColor: string | null;
  /** Notes to AI — blank means null/unused downstream. */
  globalAiGuidance: string;
}

/**
 * Explicit per-milestone override of a campaign-level creative setting.
 * "inherit" (the default / absent) means use the campaign Creative Setup
 * value as-is. "none" is a real, explicit opt-out for this milestone only —
 * it must never fall back to the campaign value. "selected" carries a
 * milestone-specific value that replaces the campaign value for this
 * milestone only.
 */
export type CreativeOverride<T> =
  | { mode: "inherit" }
  | { mode: "none" }
  | { mode: "selected"; value: T };

export interface MilestoneLogoOverrideValue {
  logoId: string;
  logoUrl?: string | null;
  logoName?: string | null;
}

export interface MilestoneColorsOverrideValue {
  mode: CreativeColorMode;
  colors?: string[];
}

/** Optional per-milestone overrides of the campaign Creative Setup. Absent = inherit. */
export interface MilestoneCreativeOverrides {
  logo?: CreativeOverride<MilestoneLogoOverrideValue>;
  colors?: CreativeOverride<MilestoneColorsOverrideValue>;
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
  /** Explicit inherit/selected/none overrides of campaign logo + colors. Absent = inherit everything. */
  creativeOverrides?: MilestoneCreativeOverrides;
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
  generationStatus?: MilestoneGenerationStatus;
  generationStartedAt?: string | null;
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
  /** playbookId the current `milestones` were built from, or null if they
   * were never sourced from a real playbook (e.g. still the generic seed
   * template). Used to detect when the user has selected a different
   * playbook than the one milestones currently reflect. */
  milestonesPlaybookId: string | null;
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
