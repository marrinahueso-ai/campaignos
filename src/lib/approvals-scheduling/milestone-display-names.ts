import { normalizeMilestoneName } from "@/lib/campaign-builder-v2/milestone-names";
import type { UnifiedApprovalItem } from "@/lib/approvals-scheduling/types";

/** Channel labels that must never win as a post name. */
const CHANNEL_POST_NAMES = new Set([
  "facebook",
  "instagram",
  "email",
  "flyer",
  "social",
  "newsletter",
]);

export function isChannelPostName(name: string | null | undefined): boolean {
  const trimmed = name?.trim() ?? "";
  if (!trimmed) return true;
  return CHANNEL_POST_NAMES.has(trimmed.toLowerCase());
}

export function displayApprovalPostName(name: string | null | undefined): string {
  const normalized = normalizeMilestoneName(String(name ?? "").trim());
  if (isChannelPostName(normalized)) {
    return "Social post";
  }
  return normalized;
}

/** Overlay live Social post names onto unified approval items. */
export function applyLiveMilestoneNames(
  items: UnifiedApprovalItem[],
  liveNames: Map<string, string>,
): UnifiedApprovalItem[] {
  return items.map((item) => {
    const milestoneId = item.campaignMilestoneId?.trim();
    if (milestoneId) {
      const live = liveNames.get(milestoneId);
      if (live && !isChannelPostName(live)) {
        return { ...item, milestoneName: normalizeMilestoneName(live) };
      }
    }
    return {
      ...item,
      milestoneName: displayApprovalPostName(item.milestoneName),
    };
  });
}
