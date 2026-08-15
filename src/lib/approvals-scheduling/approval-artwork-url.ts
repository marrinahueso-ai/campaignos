import {
  getUnifiedApprovalPreview,
  type UnifiedApprovalItem,
} from "@/lib/approvals-scheduling/types";

/**
 * Canonical list/card artwork URL for Approvals surfaces.
 * Prefer feed, then story, then list thumbnail — same order as ReviewDrawer.
 */
export function approvalArtworkUrl(item: UnifiedApprovalItem): string {
  const preview = getUnifiedApprovalPreview(item);
  const url =
    preview.feedArtworkUrl ||
    preview.storyArtworkUrl ||
    item.thumbnailUrl;
  return url?.trim() || "";
}
