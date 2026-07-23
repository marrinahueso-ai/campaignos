import type { ApprovalWorkflowStep } from "./types.ts";

/** Known fake seed names that must never remain in persisted sessions. */
const STALE_DEMO_APPROVER_NAMES = new Set(["sarah m."]);

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "—";
  }
  if (parts.length === 1) {
    return parts[0]!.slice(0, 2).toUpperCase();
  }
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

/** Subset of resolveApprovalAssignee result safe to pass into the client. */
export type ApprovalAssigneeLike = {
  organizationRoleName: string | null;
  assigneeDisplayName: string;
  hasAssignedPerson: boolean;
  assignedUserId?: string | null;
};

export type ResolvedWorkflowApprover = {
  organizationRoleName: string | null;
  assigneeDisplayName: string | null;
  assigneeInitials: string | null;
  /** Organization user id when Team Access linked a member; null for contact-name-only. */
  assignedUserId: string | null;
};

export function isStaleDemoApproverName(name: string | null | undefined): boolean {
  if (!name?.trim()) {
    return false;
  }
  return STALE_DEMO_APPROVER_NAMES.has(name.trim().toLowerCase());
}

/**
 * True when Review should send to someone else (Send for approval).
 * False when the Team Access approver is missing, unassigned, or the current user
 * (self-approve / Approve all & schedule).
 */
export function hasDistinctExternalReviewer(
  resolved: ResolvedWorkflowApprover | null | undefined,
  currentOrganizationUserId?: string | null,
): boolean {
  if (!resolved?.assigneeDisplayName?.trim()) {
    return false;
  }
  const assignedUserId = resolved.assignedUserId?.trim() || null;
  const currentUserId = currentOrganizationUserId?.trim() || null;
  if (assignedUserId && currentUserId && assignedUserId === currentUserId) {
    return false;
  }
  return true;
}

/**
 * Map send-for-approval assignee resolution into serializable Review-sidebar fields.
 * Role-only fallbacks (e.g. "Board") are treated as unassigned people.
 */
export function toResolvedWorkflowApprover(
  assignee: ApprovalAssigneeLike,
): ResolvedWorkflowApprover {
  if (!assignee.hasAssignedPerson) {
    return {
      organizationRoleName: assignee.organizationRoleName,
      assigneeDisplayName: null,
      assigneeInitials: null,
      assignedUserId: null,
    };
  }

  const displayName = assignee.assigneeDisplayName.trim();
  return {
    organizationRoleName: assignee.organizationRoleName,
    assigneeDisplayName: displayName || null,
    assigneeInitials: displayName ? initialsFromName(displayName) : null,
    assignedUserId: assignee.assignedUserId?.trim() || null,
  };
}

/**
 * Strip demo seed assignee names from any workflow step (e.g. persisted "Sarah M.").
 */
export function sanitizeApprovalWorkflowDemoAssignees(
  workflow: ApprovalWorkflowStep[],
): ApprovalWorkflowStep[] {
  return workflow.map((step) => {
    if (!isStaleDemoApproverName(step.assigneeName)) {
      return step;
    }
    return {
      ...step,
      assigneeName: null,
      assigneeInitials: null,
      status: step.status === "complete" ? step.status : "empty",
    };
  });
}

/**
 * Merge org-resolved default approver into the Review sidebar workflow.
 * Updates the primary approver step (`committee-chair`); leaves creator /
 * vp-comms / scheduled steps alone aside from demo-name cleanup.
 * Preserves complete statuses from scheduling sync.
 */
export function applyResolvedApproverToWorkflow(
  workflow: ApprovalWorkflowStep[],
  resolved: ResolvedWorkflowApprover,
): ApprovalWorkflowStep[] {
  const cleaned = sanitizeApprovalWorkflowDemoAssignees(workflow);

  return cleaned.map((step) => {
    if (step.id !== "committee-chair") {
      return step;
    }

    const role =
      resolved.organizationRoleName?.trim() || step.role || "Committee Chair";

    if (step.status === "complete") {
      return {
        ...step,
        role,
        assigneeName: resolved.assigneeDisplayName ?? step.assigneeName,
        assigneeInitials: resolved.assigneeInitials ?? step.assigneeInitials,
      };
    }

    if (resolved.assigneeDisplayName) {
      return {
        ...step,
        role,
        assigneeName: resolved.assigneeDisplayName,
        assigneeInitials: resolved.assigneeInitials,
        status: "pending",
      };
    }

    return {
      ...step,
      role,
      assigneeName: null,
      assigneeInitials: null,
      status: "empty",
    };
  });
}

export function withResolvedApprovalWorkflow(
  session: {
    approvalWorkflow: ApprovalWorkflowStep[];
  },
  resolved: ResolvedWorkflowApprover | null | undefined,
): { approvalWorkflow: ApprovalWorkflowStep[] } {
  const base = {
    approvalWorkflow: sanitizeApprovalWorkflowDemoAssignees(
      session.approvalWorkflow,
    ),
  };
  if (!resolved) {
    return base;
  }
  return {
    approvalWorkflow: applyResolvedApproverToWorkflow(
      base.approvalWorkflow,
      resolved,
    ),
  };
}
