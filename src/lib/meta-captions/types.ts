import type { MetaArtworkPlacement } from "@/lib/artwork-v2/campaign-phases";

export type MetaSocialCaptionPlacement = MetaArtworkPlacement;

export type MetaSocialCaptionStatus = "draft" | "approved";

export interface MetaSocialCaption {
  id: string;
  eventId: string;
  relativeDay: number;
  milestoneTitle: string;
  placement: MetaSocialCaptionPlacement;
  content: string;
  status: MetaSocialCaptionStatus;
  createdAt: string;
  updatedAt: string;
}

export interface MetaSocialCaptionRow {
  id: string;
  event_id: string;
  relative_day: number;
  milestone_title: string;
  placement: MetaSocialCaptionPlacement;
  content: string;
  status: MetaSocialCaptionStatus;
  created_at: string;
  updated_at: string;
}

export interface MetaSocialCaptionPlacementState {
  id: string | null;
  content: string | null;
  status: MetaSocialCaptionStatus | null;
}

export interface MetaSocialCaptionMilestone {
  relativeDay: number;
  title: string;
  hasApprovedFeedArtwork: boolean;
  feed: MetaSocialCaptionPlacementState;
  story: MetaSocialCaptionPlacementState;
}

export type MetaCaptionTone = "Friendly" | "Professional" | "Enthusiastic" | "Concise";
export type MetaCaptionLength = "Short" | "Medium" | "Long";

export interface MetaCaptionGenerationOptions {
  tone?: MetaCaptionTone;
  length?: MetaCaptionLength;
  /** Current caption draft the user edited or selected — used as revision context. */
  revisionContext?: string | null;
}

export type MetaSocialCaptionActionResult = {
  success: boolean;
  error?: string | null;
  content?: string | null;
  generatedCount?: number;
};
