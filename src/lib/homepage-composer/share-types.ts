import type { HomepageComposerState } from "@/lib/homepage-composer/types";

/** Lifecycle for share links — approvals will extend this later. */
export type HomepageComposerShareStatus =
  | "draft"
  | "shared"
  | "pending_approval"
  | "approved";

export type HomepageComposerSharePreviewMode = "full_month" | "as_of_date";

export type HomepageComposerShareRecord = {
  id: string;
  token: string;
  organizationId: string;
  createdBy: string | null;
  title: string;
  composerState: HomepageComposerState;
  previewMode: HomepageComposerSharePreviewMode;
  asOfDate: string | null;
  includeVisibilityMemos: boolean;
  shareStatus: HomepageComposerShareStatus;
  approvalItemId: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateHomepageComposerShareInput = {
  state: HomepageComposerState;
  previewMode?: HomepageComposerSharePreviewMode;
  asOfDate?: string | null;
  includeVisibilityMemos?: boolean;
  /** Defaults to shared; draft reserved for future approval-first flow. */
  shareStatus?: HomepageComposerShareStatus;
};

export type CreateHomepageComposerShareResult =
  | { success: true; token: string; url: string }
  | { success: false; error: string };
