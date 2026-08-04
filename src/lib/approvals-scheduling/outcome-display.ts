import type { UnifiedApprovalItem } from "@/lib/approvals-scheduling/types";

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
        label: "Needs approval",
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
