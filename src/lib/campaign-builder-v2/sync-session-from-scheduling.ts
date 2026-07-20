import type {
  ApprovalWorkflowStep,
  CampaignBuilderSession,
  MilestoneGenerationStatus,
  MilestonePreviewContent,
} from "./types.ts";
import { milestoneNameMatchKey } from "./milestone-names.ts";

export type SchedulingSessionOutcome =
  | "approved"
  | "scheduled"
  | "published"
  | "changes_requested";

/** Map Approvals hub workflow_status → Create with AI generation status. */
export function schedulingWorkflowToSessionOutcome(
  workflowStatus: string,
): SchedulingSessionOutcome | null {
  switch (workflowStatus) {
    case "changes_requested":
      return "changes_requested";
    case "scheduled":
      return "scheduled";
    case "posted":
    case "published":
      return "published";
    default:
      return null;
  }
}

export function applySchedulingOutcomeToPreview(
  preview: MilestonePreviewContent,
  outcome: SchedulingSessionOutcome,
  at: string = new Date().toISOString(),
): MilestonePreviewContent {
  if (outcome === "changes_requested") {
    const approvalStatuses =
      preview.approvalStatuses.length > 0
        ? preview.approvalStatuses.map((entry) =>
            entry.role === "creator"
              ? entry
              : {
                  ...entry,
                  status: "pending" as const,
                  timestamp: at,
                },
          )
        : [
            {
              role: "creator" as const,
              label: "Creator",
              status: "approved" as const,
              timestamp: at,
            },
            {
              role: "committee-chair" as const,
              label: "Committee Chair",
              status: "pending" as const,
              timestamp: at,
            },
          ];

    return {
      ...preview,
      generationStatus: "changes_requested",
      approvalStatuses,
    };
  }

  const generationStatus: MilestoneGenerationStatus =
    outcome === "published"
      ? "published"
      : outcome === "scheduled"
        ? "scheduled"
        : "approved";

  const approvalStatuses =
    preview.approvalStatuses.length > 0
      ? preview.approvalStatuses.map((entry) => ({
          ...entry,
          status: "approved" as const,
          timestamp: entry.timestamp ?? at,
        }))
      : [
          {
            role: "creator" as const,
            label: "Creator",
            status: "approved" as const,
            timestamp: at,
          },
          {
            role: "committee-chair" as const,
            label: "Committee Chair",
            status: "approved" as const,
            timestamp: at,
          },
        ];

  return {
    ...preview,
    generationStatus,
    status: "ready",
    approvalStatuses,
  };
}

export function applySchedulingOutcomeToWorkflow(
  workflow: ApprovalWorkflowStep[],
  outcome: SchedulingSessionOutcome,
): ApprovalWorkflowStep[] {
  if (outcome === "changes_requested") {
    return workflow.map((step) => {
      if (step.id === "creator") {
        return { ...step, status: "complete" as const };
      }
      if (step.id === "committee-chair" || step.id === "vp-comms") {
        return {
          ...step,
          status: "pending" as const,
          assigneeName: step.assigneeName,
        };
      }
      if (step.id === "scheduled") {
        return { ...step, status: "empty" as const, assigneeName: null };
      }
      return step;
    });
  }

  return workflow.map((step) => {
    if (
      step.id === "creator" ||
      step.id === "committee-chair" ||
      step.id === "vp-comms"
    ) {
      return {
        ...step,
        status: "complete" as const,
        assigneeName: step.assigneeName ?? "Approved",
      };
    }
    if (step.id === "scheduled") {
      return {
        ...step,
        status: "complete" as const,
        assigneeName: outcome === "published" ? "Published" : "Scheduled",
      };
    }
    return step;
  });
}

export type SchedulingStatusRow = {
  campaignMilestoneId: string | null;
  milestoneName: string;
  workflowStatus: string;
};

/**
 * Upgrade Create with AI session milestones that Approvals already resolved.
 * Does not downgrade content that is still in_queue / assigned_to_me.
 */
export function applySchedulingRowsToSession(
  session: CampaignBuilderSession,
  rows: SchedulingStatusRow[],
): CampaignBuilderSession {
  if (rows.length === 0) {
    return session;
  }

  const byMilestoneId = new Map<string, SchedulingSessionOutcome>();
  const byNameKey = new Map<string, SchedulingSessionOutcome>();

  for (const row of rows) {
    const outcome = schedulingWorkflowToSessionOutcome(row.workflowStatus);
    if (!outcome) {
      continue;
    }
    const milestoneId = row.campaignMilestoneId?.trim();
    if (milestoneId) {
      byMilestoneId.set(milestoneId, outcome);
    }
    const nameKey = milestoneNameMatchKey(row.milestoneName);
    if (nameKey) {
      byNameKey.set(nameKey, outcome);
    }
  }

  if (byMilestoneId.size === 0 && byNameKey.size === 0) {
    return session;
  }

  let touched = false;
  let workflowOutcome: SchedulingSessionOutcome | null = null;

  const previewContents = session.previewContents.map((preview) => {
    const byId = byMilestoneId.get(preview.milestoneId);
    const milestone = session.milestones.find(
      (entry) => entry.id === preview.milestoneId,
    );
    const byName = milestone
      ? byNameKey.get(milestoneNameMatchKey(milestone.name))
      : undefined;
    const outcome = byId ?? byName;
    if (!outcome) {
      return preview;
    }

    // Don't pull a published milestone back to awaiting via stale local flags.
    const next = applySchedulingOutcomeToPreview(preview, outcome);
    if (
      next.generationStatus !== preview.generationStatus ||
      next.approvalStatuses.some(
        (entry, index) => entry.status !== preview.approvalStatuses[index]?.status,
      )
    ) {
      touched = true;
      workflowOutcome = outcome;
    }
    return next;
  });

  if (!touched) {
    return session;
  }

  return {
    ...session,
    previewContents,
    approvalWorkflow: workflowOutcome
      ? applySchedulingOutcomeToWorkflow(
          session.approvalWorkflow,
          workflowOutcome,
        )
      : session.approvalWorkflow,
  };
}
