import type { CommunicationChannel } from "@/types/event-workspace";
import type { MetaPublishMode } from "@/lib/meta-publishing/publish-mode";
import type { MetaPublishSurfaces } from "@/types/playbooks";

export type MetaPublishPlatform = "facebook" | "instagram";
export type MetaPublishPlacement = "feed" | "story";

export type MetaPublicationSlotStatus =
  | "draft"
  | "scheduled"
  | "approved"
  | "posting"
  | "published"
  | "failed"
  | "cancelled";

export interface MetaConnection {
  id: string;
  organizationId: string;
  facebookPageId: string;
  instagramAccountId: string;
  pageAccessToken: string;
  pageName: string | null;
  tokenExpiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MetaConnectionRow {
  id: string;
  organization_id: string;
  facebook_page_id: string;
  instagram_account_id: string;
  page_access_token: string;
  page_name: string | null;
  token_expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface MetaPublicationSlot {
  id: string;
  eventId: string;
  relativeDay: number;
  milestoneTitle: string;
  platform: MetaPublishPlatform;
  placement: MetaPublishPlacement;
  eventAssetId: string | null;
  communicationItemId: string | null;
  scheduledFor: string | null;
  status: MetaPublicationSlotStatus;
  externalPostId: string | null;
  publishError: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MetaPublicationSlotRow {
  id: string;
  event_id: string;
  relative_day: number;
  milestone_title: string;
  platform: MetaPublishPlatform;
  placement: MetaPublishPlacement;
  event_asset_id: string | null;
  communication_item_id: string | null;
  scheduled_for: string | null;
  status: MetaPublicationSlotStatus;
  external_post_id: string | null;
  publish_error: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export type MetaPublishBundleStatus =
  | "needs_artwork"
  | "needs_caption"
  | "ready"
  | "scheduled"
  | "approved"
  | "posting"
  | "failed"
  | "published"
  | "skipped"
  | "channel_only";

export interface MetaPublishTargetPreview {
  platform: MetaPublishPlatform;
  placement: MetaPublishPlacement;
  label: string;
}

export interface MetaPublishBundle {
  relativeDay: number;
  title: string;
  dueDate: string | null;
  scheduledFor: string | null;
  captionPreview: string | null;
  storyCaptionPreview: string | null;
  feedArtworkUrl: string | null;
  storyArtworkUrl: string | null;
  status: MetaPublishBundleStatus;
  targets: MetaPublishTargetPreview[];
  missingArtwork: string[];
  /** Communication channel from the plan step — null for legacy bundles. */
  channel: CommunicationChannel | null;
  /** False for newsletter, email, morning announcements, etc. */
  isMetaPost: boolean;
  /** Plan step id when this milestone maps to a communication step. */
  stepId: string | null;
  /** Feed/story/both preference for Meta posts on this milestone. */
  metaPublishSurfaces: MetaPublishSurfaces;
  /** Story posted manually via Post Kit — skips story auto-publish. */
  storyManualPublish: boolean;
  /** Derived single publish mode for UI and scheduling logic. */
  publishMode: MetaPublishMode;
  /** When story post kit email was sent for manual story modes. */
  storyReminderSentAt: string | null;
}

export type MetaPublishActionResult = {
  success: boolean;
  error?: string | null;
  updatedCount?: number;
  publishedCount?: number;
  failedCount?: number;
};
