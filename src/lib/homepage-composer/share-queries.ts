import "server-only";

import { randomBytes } from "node:crypto";
import { normalizeComposerState } from "@/lib/homepage-composer/defaults";
import { exportHomepageHtml } from "@/lib/homepage-composer/export-html";
import type {
  HomepageComposerSharePreviewMode,
  HomepageComposerShareRecord,
  HomepageComposerShareStatus,
} from "@/lib/homepage-composer/share-types";
import type { HomepageComposerState } from "@/lib/homepage-composer/types";
import { createAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";

type ShareRow = {
  id: string;
  token: string;
  organization_id: string;
  created_by: string | null;
  title: string;
  composer_state: HomepageComposerState;
  preview_mode: HomepageComposerSharePreviewMode;
  as_of_date: string | null;
  include_visibility_memos: boolean;
  share_status: HomepageComposerShareStatus;
  approval_item_id: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
};

function mapShareRow(row: ShareRow): HomepageComposerShareRecord | null {
  const composerState = normalizeComposerState(row.composer_state);
  if (!composerState) return null;

  return {
    id: row.id,
    token: row.token,
    organizationId: row.organization_id,
    createdBy: row.created_by,
    title: row.title,
    composerState,
    previewMode: row.preview_mode,
    asOfDate: row.as_of_date,
    includeVisibilityMemos: row.include_visibility_memos,
    shareStatus: row.share_status,
    approvalItemId: row.approval_item_id,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function createHomepageComposerShareToken(): string {
  return randomBytes(24).toString("base64url");
}

export function isShareExpired(record: HomepageComposerShareRecord): boolean {
  if (!record.expiresAt) return false;
  return Date.parse(record.expiresAt) <= Date.now();
}

export function renderHomepageShareHtml(record: HomepageComposerShareRecord): string {
  const state = record.composerState;
  if (record.previewMode === "full_month") {
    return exportHomepageHtml(state, {
      showAllCards: true,
      includeVisibilityMemos: record.includeVisibilityMemos,
    });
  }

  return exportHomepageHtml(state, {
    asOfDate: record.asOfDate,
    includeVisibilityMemos: record.includeVisibilityMemos,
  });
}

export async function getHomepageComposerShareByToken(
  token: string,
): Promise<HomepageComposerShareRecord | null> {
  if (!token.trim() || !isSupabaseAdminConfigured()) {
    return null;
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("homepage_composer_shares")
    .select("*")
    .eq("token", token.trim())
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const record = mapShareRow(data as ShareRow);
  if (!record || isShareExpired(record)) {
    return null;
  }

  return record;
}

export async function insertHomepageComposerShare(input: {
  token: string;
  organizationId: string;
  createdBy: string | null;
  title: string;
  composerState: HomepageComposerState;
  previewMode: HomepageComposerSharePreviewMode;
  asOfDate: string | null;
  includeVisibilityMemos: boolean;
  shareStatus: HomepageComposerShareStatus;
}): Promise<{ token: string } | { error: string }> {
  if (!isSupabaseAdminConfigured()) {
    return { error: "Sharing is not configured yet. Try again later." };
  }

  const admin = createAdminClient();
  const { error } = await admin.from("homepage_composer_shares").insert({
    token: input.token,
    organization_id: input.organizationId,
    created_by: input.createdBy,
    title: input.title,
    composer_state: input.composerState,
    preview_mode: input.previewMode,
    as_of_date: input.asOfDate,
    include_visibility_memos: input.includeVisibilityMemos,
    share_status: input.shareStatus,
  });

  if (error) {
    return { error: "Could not create share link. Try again." };
  }

  return { token: input.token };
}
