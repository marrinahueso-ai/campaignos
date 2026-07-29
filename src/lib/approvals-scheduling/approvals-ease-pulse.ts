import {
  isDraftOutcome,
  isFailedOutcome,
  isPostedOutcome,
} from "./outcome-display.ts";
import { summarizeCounts } from "./status.ts";
import type { UnifiedApprovalItem } from "./types.ts";

/** Pulse filters on org Approvals and event Approvals tab (Ease mockup). */
export type ApprovalsEasePulse =
  | "needs"
  | "scheduled"
  | "posted"
  | "failed"
  | "changes";

export const DEFAULT_APPROVALS_EASE_PULSE: ApprovalsEasePulse = "needs";

export const APPROVALS_EASE_PULSE_OPTIONS: {
  id: ApprovalsEasePulse;
  label: string;
}[] = [
  { id: "needs", label: "Needs you" },
  { id: "scheduled", label: "Scheduled" },
  { id: "posted", label: "Posted" },
  { id: "failed", label: "Failed" },
  { id: "changes", label: "Changes" },
];

export function parseApprovalsEasePulse(
  value: string | null,
): ApprovalsEasePulse | null {
  return (
    APPROVALS_EASE_PULSE_OPTIONS.find((option) => option.id === value)?.id ??
    null
  );
}

export function approvalMatchesEasePulse(
  item: UnifiedApprovalItem,
  pulse: ApprovalsEasePulse,
): boolean {
  switch (pulse) {
    case "needs":
      return (
        item.workflowStatus === "assigned_to_me" ||
        item.workflowStatus === "in_queue"
      );
    case "scheduled":
      return item.workflowStatus === "scheduled" && !isDraftOutcome(item);
    case "posted":
      return isPostedOutcome(item);
    case "failed":
      return isFailedOutcome(item);
    case "changes":
      return item.workflowStatus === "changes_requested";
    default:
      return true;
  }
}

export interface ApprovalsEasePulseCounts {
  needs: number;
  scheduled: number;
  posted: number;
  failed: number;
  changes: number;
}

export function computeApprovalsEasePulseCounts(
  items: UnifiedApprovalItem[],
): ApprovalsEasePulseCounts {
  const counts = summarizeCounts(items);
  return {
    needs: counts.assigned_to_me + counts.in_queue,
    scheduled: items.filter(
      (item) => item.workflowStatus === "scheduled" && !isDraftOutcome(item),
    ).length,
    posted: items.filter(isPostedOutcome).length,
    failed: counts.failed,
    changes: counts.changes_requested,
  };
}

export const APPROVALS_EASE_EMPTY_COPY: Record<
  ApprovalsEasePulse,
  { title: string; body: string }
> = {
  needs: {
    title: "Nothing waiting on you",
    body: "When a campaign needs your approval, it shows up here with the artwork ready to review.",
  },
  scheduled: {
    title: "Nothing scheduled yet",
    body: "Approved posts land here with their publish time until they go live on your Page.",
  },
  posted: {
    title: "Nothing posted yet",
    body: "Posts that went live on your Page show up here.",
  },
  failed: {
    title: "Nothing failed to post",
    body: "If a post doesn’t go through, it lands here so you can retry.",
  },
  changes: {
    title: "Nothing to fix right now",
    body: "When someone on your team sends something back, it lands here with their note.",
  },
};

export function approvalsEaseSectionLabel(
  pulse: ApprovalsEasePulse,
): string {
  switch (pulse) {
    case "needs":
      return "Waiting on your review";
    case "scheduled":
      return "On the calendar";
    case "posted":
      return "Already live";
    case "failed":
      return "Needs a retry";
    case "changes":
      return "Needs edits";
    default:
      return "Waiting on your review";
  }
}

export function eventApprovalsEaseSectionLabel(
  pulse: ApprovalsEasePulse,
): string {
  switch (pulse) {
    case "failed":
      return "Needs a retry";
    case "posted":
      return "Already live";
    case "scheduled":
      return "On the calendar";
    case "changes":
      return "Needs edits";
    case "needs":
    default:
      return "Needs you next";
  }
}

export function eventApprovalsEaseEmptyMessage(
  pulse: ApprovalsEasePulse,
): string {
  switch (pulse) {
    case "scheduled":
      return "Nothing scheduled for this event yet.";
    case "posted":
      return "Nothing posted for this event yet.";
    case "failed":
      return "Nothing failed to post for this event.";
    case "changes":
      return "Nothing waiting for edits on this event.";
    case "needs":
    default:
      return "Nothing waiting on you for this event.";
  }
}
