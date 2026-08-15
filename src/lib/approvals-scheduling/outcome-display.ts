import { isPublishNowDelivery } from "@/lib/campaign-builder-v2/delivery-method";
import type { UnifiedApprovalItem } from "@/lib/approvals-scheduling/types";

type ApproveLabelItem = Pick<
  UnifiedApprovalItem,
  "deliveryMethod" | "scheduleLabel"
>;

/**
 * Primary approve CTA — must match delivery intent:
 * Publish now → immediate Meta post after approve
 * Schedule → queue for the creator’s chosen datetime
 */
export function approveSocialButtonLabel(item: ApproveLabelItem): string {
  if (isPublishNowDelivery(item.deliveryMethod)) {
    return "Approve & publish now";
  }

  if (item.deliveryMethod === "manual-email") {
    return "Approve";
  }

  const label = item.scheduleLabel?.trim();
  if (!label) {
    return "Approve & schedule";
  }
  const short = label.match(/^([A-Za-z]{3,9}\.?\s+\d{1,2})/);
  if (short) {
    return `Approve for ${short[1]}`;
  }
  return `Approve for ${label.split(",")[0] ?? label}`;
}

/** Timing card headline in open review (Schedule section). */
export function approvalTimingHeadline(
  item: ApproveLabelItem,
  options?: { isFlyer?: boolean; isNewsletter?: boolean },
): string {
  if (options?.isNewsletter) {
    return (
      item.scheduleLabel?.trim() ||
      "Send time set by creator — Approve & Schedule"
    );
  }
  if (options?.isFlyer) {
    return "Print-ready";
  }
  if (isPublishNowDelivery(item.deliveryMethod)) {
    return "Publish immediately after approval";
  }
  if (item.deliveryMethod === "manual-email") {
    return item.scheduleLabel?.trim() || "Email post kit after approval";
  }
  return item.scheduleLabel?.trim() || "Schedule not set yet";
}

/** List / celebration timing line for social posts. */
export function approvalTimingListLabel(item: ApproveLabelItem): string {
  if (isPublishNowDelivery(item.deliveryMethod)) {
    return "Publish now";
  }
  if (item.deliveryMethod === "manual-email") {
    return "Email post kit";
  }
  return item.scheduleLabel?.trim() || "Timing TBD";
}

/** Post-approve celebration subline. */
export function approvalCelebrationSubline(item: ApproveLabelItem): string {
  if (isPublishNowDelivery(item.deliveryMethod)) {
    return "Publishing to your Page now";
  }
  if (item.deliveryMethod === "manual-email") {
    return "Post kit ready";
  }
  const when = item.scheduleLabel?.trim();
  return when ? `Scheduled · ${when}` : "Approved and scheduled";
}

/** Customer-facing Approvals outcome chip (Posted / Failed / Draft / …). */
export function approvalOutcomeChip(item: UnifiedApprovalItem): {
  label: string;
  className: string;
} {
  if (item.workflowStatus === "failed") {
    return {
      label: "Failed",
      className: "bg-[rgba(166,90,58,0.14)] text-[#a65a3a]",
    };
  }

  if (item.deliveryMethod === "draft-only") {
    return {
      label: "Draft",
      className: "bg-[rgba(92,85,76,0.12)] text-[#5c554c]",
    };
  }

  switch (item.workflowStatus) {
    case "assigned_to_me":
    case "in_queue":
      return {
        label: isPublishNowDelivery(item.deliveryMethod)
          ? "Needs approval · then publish now"
          : item.deliveryMethod === "schedule"
            ? "Needs approval · then schedule"
            : "Needs approval",
        className: "bg-[rgba(47,74,60,0.12)] text-[#2f4a3c]",
      };
    case "changes_requested":
      return {
        label: "Changes requested",
        className: "bg-[rgba(166,90,58,0.14)] text-[#a65a3a]",
      };
    case "scheduled":
      return {
        label: "Scheduled",
        className: "bg-[rgba(196,146,46,0.16)] text-[#7a5a12]",
      };
    case "posted":
    case "published":
      return {
        label: "Posted",
        className: "bg-[rgba(42,122,134,0.12)] text-[#2a7a86]",
      };
    default:
      return {
        label: item.statusDetail || "In review",
        className: "bg-cos-bg-alt text-cos-muted",
      };
  }
}

type OutcomeFields = Pick<UnifiedApprovalItem, "workflowStatus" | "deliveryMethod">;

export function isPostedOutcome(item: OutcomeFields): boolean {
  return (
    (item.workflowStatus === "published" || item.workflowStatus === "posted") &&
    item.deliveryMethod !== "draft-only"
  );
}

export function isFailedOutcome(item: Pick<UnifiedApprovalItem, "workflowStatus">): boolean {
  return item.workflowStatus === "failed";
}

export function isDraftOutcome(item: OutcomeFields): boolean {
  return (
    item.deliveryMethod === "draft-only" &&
    item.workflowStatus !== "failed" &&
    item.workflowStatus !== "changes_requested" &&
    item.workflowStatus !== "in_queue" &&
    item.workflowStatus !== "assigned_to_me"
  );
}

export function canRetryFailedApproval(item: UnifiedApprovalItem): boolean {
  return (
    item.workflowStatus === "failed" &&
    (item.platforms.includes("facebook") || item.platforms.includes("instagram"))
  );
}
