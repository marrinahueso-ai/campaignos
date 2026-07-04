import type { MilestoneArtworkStatus } from "@/lib/artwork-v2/batch-generate";
import type { MetaPublishBundle, MetaPublishBundleStatus } from "@/lib/meta-publishing/types";

export type MilestoneWorkflowBadgeStatus =
  | MilestoneArtworkStatus
  | "scheduled"
  | "published";

export function findMetaPublishBundleForDay(
  bundles: MetaPublishBundle[],
  relativeDay: number,
): MetaPublishBundle | undefined {
  return bundles.find((bundle) => bundle.relativeDay === relativeDay);
}

/** Maps bundle publish state to workflow badge override, when applicable. */
export function resolvePublishWorkflowBadgeStatus(
  bundleStatus: MetaPublishBundleStatus | undefined,
): "scheduled" | "published" | null {
  if (!bundleStatus) {
    return null;
  }

  if (bundleStatus === "published") {
    return "published";
  }

  if (bundleStatus === "scheduled" || bundleStatus === "approved") {
    return "scheduled";
  }

  return null;
}

export function resolveMilestoneWorkflowBadgeStatus(
  baseStatus: MilestoneArtworkStatus,
  bundle: MetaPublishBundle | undefined,
): MilestoneWorkflowBadgeStatus {
  const publishStatus = resolvePublishWorkflowBadgeStatus(bundle?.status);
  if (publishStatus) {
    return publishStatus;
  }

  return baseStatus;
}

export function milestoneWorkflowBadgeLabel(status: MilestoneWorkflowBadgeStatus): string {
  switch (status) {
    case "published":
      return "Published";
    case "scheduled":
      return "Scheduled";
    case "complete":
      return "Complete";
    case "ready_for_review":
      return "Ready for review";
    case "in_progress":
      return "In progress";
    default:
      return "Not started";
  }
}

export function milestoneWorkflowBadgeClassName(status: MilestoneWorkflowBadgeStatus): string {
  switch (status) {
    case "published":
    case "scheduled":
    case "complete":
      return "bg-emerald-50 text-emerald-700";
    case "ready_for_review":
      return "bg-amber-50 text-amber-800";
    case "in_progress":
    case "not_started":
    default:
      return "bg-cos-bg text-cos-muted";
  }
}
