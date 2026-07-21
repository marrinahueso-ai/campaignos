import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applySchedulingOutcomeToPreview,
  applySchedulingRowsToSession,
  schedulingWorkflowToSessionOutcome,
} from "../sync-session-from-scheduling.ts";
import type {
  CampaignBuilderSession,
  MilestonePreviewContent,
} from "../types.ts";

function preview(
  overrides: Partial<MilestonePreviewContent> = {},
): MilestonePreviewContent {
  return {
    milestoneId: "ms-1",
    status: "ready",
    generationStatus: "awaiting_approval",
    generationStartedAt: null,
    artwork: { feedUrl: "https://example.com/f.png", storyUrl: null },
    captions: [
      { platform: "facebook", text: "Hi" },
      { platform: "instagram", text: "Hi" },
    ],
    enabledFormats: ["facebook-feed", "instagram-feed"],
    deliveryMethod: "auto-publish",
    scheduleDate: "2026-07-18",
    scheduleTime: "13:00",
    emailSendDate: "2026-07-18",
    emailSendTime: "13:00",
    manualEmailTo: "",
    manualUploadLink: "",
    approvalStatuses: [
      {
        role: "creator",
        label: "Creator",
        status: "approved",
        timestamp: "2026-07-01T00:00:00.000Z",
      },
      {
        role: "committee-chair",
        label: "Committee Chair",
        status: "pending",
        timestamp: "2026-07-01T00:00:00.000Z",
      },
    ],
    ...overrides,
  };
}

describe("sync-session-from-scheduling", () => {
  it("maps scheduled workflow to session scheduled + approved statuses", () => {
    assert.equal(schedulingWorkflowToSessionOutcome("scheduled"), "scheduled");
    const next = applySchedulingOutcomeToPreview(preview(), "scheduled", "t1");
    assert.equal(next.generationStatus, "scheduled");
    assert.ok(next.approvalStatuses.every((entry) => entry.status === "approved"));
  });

  it("stores change-request comment and clears it on approve/schedule", () => {
    const withComment = applySchedulingOutcomeToPreview(
      preview(),
      "changes_requested",
      "t1",
      "Please warm up the colors",
    );
    assert.equal(withComment.generationStatus, "changes_requested");
    assert.equal(withComment.changeRequestComment, "Please warm up the colors");

    const scheduled = applySchedulingOutcomeToPreview(
      withComment,
      "scheduled",
      "t2",
    );
    assert.equal(scheduled.generationStatus, "scheduled");
    assert.equal(scheduled.changeRequestComment, null);
  });

  it("syncs change-request notes from scheduling rows into the session", () => {
    const session = {
      eventId: "evt-1",
      currentStep: "review",
      inspiration: {} as CampaignBuilderSession["inspiration"],
      milestones: [{ id: "ms-1", name: "Announcement" }],
      milestonesPlaybookId: null,
      previewContents: [preview()],
      approvalWorkflow: [
        {
          id: "committee-chair",
          role: "Committee Chair",
          assigneeName: null,
          assigneeInitials: null,
          status: "pending",
        },
        {
          id: "scheduled",
          role: "Scheduled / Delivered",
          assigneeName: null,
          assigneeInitials: null,
          status: "empty",
        },
      ],
      reviewFilter: "all",
      selectedMilestoneId: "ms-1",
      previewTab: "all",
      expandedReviewMilestoneIds: [],
    } as unknown as CampaignBuilderSession;

    const next = applySchedulingRowsToSession(session, [
      {
        campaignMilestoneId: "ms-1",
        milestoneName: "Announcement",
        workflowStatus: "changes_requested",
        notes: "Fix the caption date",
      },
    ]);

    assert.equal(next.previewContents[0]?.generationStatus, "changes_requested");
    assert.equal(next.previewContents[0]?.changeRequestComment, "Fix the caption date");
  });

  it("upgrades awaiting_approval when Approvals row is scheduled", () => {
    const session = {
      eventId: "evt-1",
      currentStep: "review",
      inspiration: {} as CampaignBuilderSession["inspiration"],
      milestones: [{ id: "ms-1", name: "Announcement" }],
      milestonesPlaybookId: null,
      previewContents: [preview()],
      approvalWorkflow: [
        {
          id: "committee-chair",
          role: "Committee Chair",
          assigneeName: null,
          assigneeInitials: null,
          status: "pending",
        },
        {
          id: "scheduled",
          role: "Scheduled / Delivered",
          assigneeName: null,
          assigneeInitials: null,
          status: "empty",
        },
      ],
      reviewFilter: "all",
      selectedMilestoneId: "ms-1",
      previewTab: "all",
      expandedReviewMilestoneIds: [],
    } as unknown as CampaignBuilderSession;

    const next = applySchedulingRowsToSession(session, [
      {
        campaignMilestoneId: "ms-1",
        milestoneName: "Announcement",
        workflowStatus: "scheduled",
      },
    ]);

    assert.equal(next.previewContents[0]?.generationStatus, "scheduled");
    assert.equal(
      next.approvalWorkflow.find((step) => step.id === "scheduled")?.status,
      "complete",
    );
  });
});
