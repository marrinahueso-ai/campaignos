import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  applyResolvedApproverToWorkflow,
  sanitizeApprovalWorkflowDemoAssignees,
  toResolvedWorkflowApprover,
} from "../approval-workflow.ts";
import { buildDefaultApprovalWorkflow } from "../seed-data.ts";
import { normalizeCampaignBuilderSession } from "../normalize-session.ts";
import type { ApprovalWorkflowStep } from "../types.ts";

describe("buildDefaultApprovalWorkflow", () => {
  it("does not seed fake approver names", () => {
    const workflow = buildDefaultApprovalWorkflow();
    const chair = workflow.find((step) => step.id === "committee-chair");
    const vp = workflow.find((step) => step.id === "vp-comms");

    assert.equal(chair?.assigneeName, null);
    assert.equal(chair?.assigneeInitials, null);
    assert.equal(chair?.status, "empty");
    assert.equal(vp?.assigneeName, null);
    assert.equal(vp?.status, "empty");
    assert.ok(
      !workflow.some((step) =>
        (step.assigneeName ?? "").toLowerCase().includes("sarah"),
      ),
    );
  });
});

describe("toResolvedWorkflowApprover", () => {
  it("returns null person fields when Team Access has no assignee", () => {
    const resolved = toResolvedWorkflowApprover({
      organizationRoleName: "Committee Chair",
      assigneeDisplayName: "Board",
      hasAssignedPerson: false,
    });

    assert.equal(resolved.organizationRoleName, "Committee Chair");
    assert.equal(resolved.assigneeDisplayName, null);
    assert.equal(resolved.assigneeInitials, null);
  });

  it("maps display name and initials when a person is assigned", () => {
    const resolved = toResolvedWorkflowApprover({
      organizationRoleName: "VP Communications",
      assigneeDisplayName: "Alex Rivera",
      hasAssignedPerson: true,
    });

    assert.equal(resolved.assigneeDisplayName, "Alex Rivera");
    assert.equal(resolved.assigneeInitials, "AR");
    assert.equal(resolved.organizationRoleName, "VP Communications");
  });
});

describe("applyResolvedApproverToWorkflow", () => {
  it("fills the primary approver step and updates the role label", () => {
    const next = applyResolvedApproverToWorkflow(buildDefaultApprovalWorkflow(), {
      organizationRoleName: "VP Communications",
      assigneeDisplayName: "Alex Rivera",
      assigneeInitials: "AR",
    });

    const chair = next.find((step) => step.id === "committee-chair");
    assert.equal(chair?.role, "VP Communications");
    assert.equal(chair?.assigneeName, "Alex Rivera");
    assert.equal(chair?.assigneeInitials, "AR");
    assert.equal(chair?.status, "pending");

    const creator = next.find((step) => step.id === "creator");
    assert.equal(creator?.assigneeName, "You");
    assert.equal(creator?.status, "complete");

    const vp = next.find((step) => step.id === "vp-comms");
    assert.equal(vp?.assigneeName, null);
    assert.equal(vp?.status, "empty");
  });

  it("leaves the primary step unassigned when no person is resolved", () => {
    const next = applyResolvedApproverToWorkflow(buildDefaultApprovalWorkflow(), {
      organizationRoleName: "Committee Chair",
      assigneeDisplayName: null,
      assigneeInitials: null,
    });

    const chair = next.find((step) => step.id === "committee-chair");
    assert.equal(chair?.role, "Committee Chair");
    assert.equal(chair?.assigneeName, null);
    assert.equal(chair?.status, "empty");
  });

  it("overwrites stale Sarah M. seed names", () => {
    const stale: ApprovalWorkflowStep[] = [
      {
        id: "creator",
        role: "Creator",
        assigneeName: "You",
        assigneeInitials: "YO",
        status: "complete",
      },
      {
        id: "committee-chair",
        role: "Committee Chair",
        assigneeName: "Sarah M.",
        assigneeInitials: "SM",
        status: "pending",
      },
      {
        id: "vp-comms",
        role: "VP Communications",
        assigneeName: null,
        assigneeInitials: null,
        status: "empty",
      },
      {
        id: "scheduled",
        role: "Scheduled / Delivered",
        assigneeName: null,
        assigneeInitials: null,
        status: "empty",
      },
    ];

    const cleared = applyResolvedApproverToWorkflow(stale, {
      organizationRoleName: "Committee Chair",
      assigneeDisplayName: null,
      assigneeInitials: null,
    });
    assert.equal(
      cleared.find((step) => step.id === "committee-chair")?.assigneeName,
      null,
    );

    const replaced = applyResolvedApproverToWorkflow(stale, {
      organizationRoleName: "Event Chair",
      assigneeDisplayName: "Jordan Lee",
      assigneeInitials: "JL",
    });
    const chair = replaced.find((step) => step.id === "committee-chair");
    assert.equal(chair?.assigneeName, "Jordan Lee");
    assert.equal(chair?.role, "Event Chair");
  });

  it("preserves complete status from scheduling sync", () => {
    const workflow = buildDefaultApprovalWorkflow().map((step) =>
      step.id === "committee-chair"
        ? { ...step, status: "complete" as const, assigneeName: "Approved" }
        : step,
    );

    const next = applyResolvedApproverToWorkflow(workflow, {
      organizationRoleName: "Committee Chair",
      assigneeDisplayName: "Alex Rivera",
      assigneeInitials: "AR",
    });

    const chair = next.find((step) => step.id === "committee-chair");
    assert.equal(chair?.status, "complete");
    assert.equal(chair?.assigneeName, "Alex Rivera");
  });
});

describe("sanitizeApprovalWorkflowDemoAssignees / normalize", () => {
  it("strips Sarah M. during session normalize", () => {
    const session = normalizeCampaignBuilderSession(
      {
        approvalWorkflow: [
          {
            id: "committee-chair",
            role: "Committee Chair",
            assigneeName: "Sarah M.",
            assigneeInitials: "SM",
            status: "pending",
          },
        ],
      },
      "evt-1",
      "Fair",
      "2026-08-15",
    );

    const chair = session.approvalWorkflow.find(
      (step) => step.id === "committee-chair",
    );
    assert.equal(chair?.assigneeName, null);
    assert.equal(chair?.assigneeInitials, null);
  });

  it("sanitize helper clears demo names without resolution", () => {
    const cleaned = sanitizeApprovalWorkflowDemoAssignees([
      {
        id: "committee-chair",
        role: "Committee Chair",
        assigneeName: "Sarah M.",
        assigneeInitials: "SM",
        status: "pending",
      },
    ]);
    assert.equal(cleaned[0]?.assigneeName, null);
    assert.equal(cleaned[0]?.status, "empty");
  });
});
