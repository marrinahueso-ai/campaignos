"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Circle } from "lucide-react";
import { useCampaignBuilder } from "@/components/campaign-builder-v2/CampaignBuilderProvider";
import { CampaignBuilderFooter } from "@/components/campaign-builder-v2/CampaignBuilderFooter";
import { ExpandedMilestoneReview } from "@/components/campaign-builder-v2/ExpandedMilestoneReview";
import { Button } from "@/components/ui/Button";
import {
  approveAllAndScheduleAction,
  saveDraftAction,
  sendForApprovalAction,
} from "@/lib/campaign-builder-v2/actions";
import {
  describeApprovalSubmitBlockers,
  isMilestoneEligibleForApprovalSubmit,
  matchesReviewApprovalFilter,
  previewAfterResendForApproval,
  resolveMilestoneGenerationStatus,
  type ReviewApprovalFilter,
} from "@/lib/campaign-builder-v2/milestone-status";
import { cn } from "@/lib/utils/cn";
import type { ApprovalWorkflowStepStatus } from "@/lib/campaign-builder-v2/types";

const REVIEW_TABS: Array<{ id: ReviewApprovalFilter; label: string }> = [
  { id: "all", label: "All Milestones" },
  { id: "needs-review", label: "Needs review" },
  { id: "approved", label: "Approved" },
  { id: "changes-requested", label: "Changes requested" },
];

function WorkflowStepIcon({ status }: { status: ApprovalWorkflowStepStatus }) {
  if (status === "complete") {
    return (
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-cos-success text-white">
        <Check className="h-4 w-4" strokeWidth={2.5} />
      </span>
    );
  }
  if (status === "pending") {
    return (
      <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-cos-warning bg-cos-warning/30">
        <Circle className="h-3 w-3 fill-cos-warning-text text-cos-warning-text" />
      </span>
    );
  }
  return (
    <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-cos-border bg-cos-card" />
  );
}

export function ReviewStep() {
  const {
    session,
    goToStep,
    setReviewFilter,
    toggleExpandedReview,
    updatePreviewContent,
  } = useCampaignBuilder();
  const router = useRouter();
  const [isSending, setIsSending] = useState(false);
  const [resendingMilestoneId, setResendingMilestoneId] = useState<string | null>(
    null,
  );
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [resendMessages, setResendMessages] = useState<Record<string, string>>(
    {},
  );

  const sortedMilestones = [...session.milestones].sort(
    (a, b) => a.sortOrder - b.sortOrder,
  );

  const filteredMilestones = sortedMilestones.filter((milestone) => {
    const preview = session.previewContents.find(
      (c) => c.milestoneId === milestone.id,
    );
    if (!preview) return false;
    return matchesReviewApprovalFilter(preview, session.reviewFilter);
  });

  const pendingReviewCount = session.previewContents.filter(
    (c) => resolveMilestoneGenerationStatus(c) === "awaiting_approval",
  ).length;
  const approvedCount = session.previewContents.filter((c) => {
    const status = resolveMilestoneGenerationStatus(c);
    return (
      status === "approved" || status === "scheduled" || status === "published"
    );
  }).length;
  const changesRequestedCount = session.previewContents.filter(
    (c) => resolveMilestoneGenerationStatus(c) === "changes_requested",
  ).length;

  const eligibleSubmitMilestones = sortedMilestones.filter((milestone) => {
    const preview = session.previewContents.find(
      (c) => c.milestoneId === milestone.id,
    );
    return preview ? isMilestoneEligibleForApprovalSubmit(preview) : false;
  });
  const eligibleSubmitPreviews = eligibleSubmitMilestones
    .map((milestone) =>
      session.previewContents.find((c) => c.milestoneId === milestone.id),
    )
    .filter((preview): preview is NonNullable<typeof preview> => Boolean(preview));
  const bulkIsReapprovalOnly =
    eligibleSubmitPreviews.length > 0 &&
    eligibleSubmitPreviews.every(
      (preview) =>
        resolveMilestoneGenerationStatus(preview) === "changes_requested",
    );
  const sendDisabledReason =
    eligibleSubmitMilestones.length === 0
      ? changesRequestedCount > 0
        ? "Use Send for re-approval on each changes-requested milestone after edits."
        : describeApprovalSubmitBlockers(
            sortedMilestones,
            session.previewContents,
          )
      : null;

  async function handleSendForApproval() {
    if (eligibleSubmitMilestones.length === 0) {
      setActionMessage(
        sendDisabledReason ?? "No milestones are ready to send for approval.",
      );
      return;
    }

    setIsSending(true);
    try {
      const result = await sendForApprovalAction({
        eventId: session.eventId,
        campaignName: session.inspiration.campaignName,
        milestones: eligibleSubmitMilestones,
        previewContents: eligibleSubmitPreviews,
      });
      setActionMessage(result.message);
      if (result.success) {
        for (const preview of eligibleSubmitPreviews) {
          updatePreviewContent(
            preview.milestoneId,
            previewAfterResendForApproval(preview),
          );
        }
        goToStep("published");
      }
    } finally {
      setIsSending(false);
    }
  }

  async function handleResendMilestone(milestoneId: string) {
    const milestone = session.milestones.find((entry) => entry.id === milestoneId);
    const preview = session.previewContents.find(
      (c) => c.milestoneId === milestoneId,
    );
    if (!milestone || !preview) {
      return;
    }

    setResendingMilestoneId(milestoneId);
    setResendMessages((prev) => {
      const next = { ...prev };
      delete next[milestoneId];
      return next;
    });

    try {
      const result = await sendForApprovalAction({
        eventId: session.eventId,
        campaignName: session.inspiration.campaignName,
        milestones: [milestone],
        previewContents: [preview],
      });
      if (!result.success) {
        setResendMessages((prev) => ({
          ...prev,
          [milestoneId]: result.message,
        }));
        return;
      }

      updatePreviewContent(
        milestoneId,
        previewAfterResendForApproval(preview),
      );
      setResendMessages((prev) => ({
        ...prev,
        [milestoneId]: result.message || "Sent for approval.",
      }));
      router.refresh();
    } finally {
      setResendingMilestoneId(null);
    }
  }

  async function handleApproveAll() {
    setIsSending(true);
    try {
      const result = await approveAllAndScheduleAction(session.eventId);
      setActionMessage(result.message);
      if (result.success) {
        goToStep("published");
      }
    } finally {
      setIsSending(false);
    }
  }

  async function handleSaveDraft() {
    setIsSending(true);
    try {
      const result = await saveDraftAction(session.eventId);
      setActionMessage(result.message);
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 overflow-y-auto px-4 py-8 lg:px-8">
        <div className="studio-page space-y-6">
          <header>
            <h1 className="font-display text-4xl text-cos-text">
              Review & Approve
            </h1>
          </header>

          <div className="cos-card flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-display text-2xl text-cos-text">
                {session.inspiration.campaignName}
              </p>
              <p className="mt-1 text-sm text-cos-muted">
                {session.milestones.length} milestones · Event{" "}
                {session.inspiration.eventDate}
              </p>
            </div>
            <p className="text-sm text-cos-muted">
              {pendingReviewCount} pending review · {approvedCount} approved ·{" "}
              {changesRequestedCount} changes requested
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
            <div className="space-y-4">
              <div className="flex gap-1 overflow-x-auto border-b border-cos-border">
                {REVIEW_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setReviewFilter(tab.id)}
                    className={cn(
                      "shrink-0 px-4 py-2 text-sm font-medium transition-colors",
                      session.reviewFilter === tab.id
                        ? "border-b-2 border-cos-text text-cos-text"
                        : "text-cos-muted hover:text-cos-text",
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="cos-card !p-0 overflow-hidden">
                {filteredMilestones.map((milestone, index) => {
                  const preview = session.previewContents.find(
                    (c) => c.milestoneId === milestone.id,
                  );
                  if (!preview) return null;

                  const isExpanded = session.expandedReviewMilestoneIds.includes(
                    milestone.id,
                  );

                  return (
                    <ExpandedMilestoneReview
                      key={milestone.id}
                      index={index}
                      eventId={session.eventId}
                      milestone={milestone}
                      preview={preview}
                      isExpanded={isExpanded}
                      onToggle={() => toggleExpandedReview(milestone.id)}
                      onUpdatePreview={(patch) =>
                        updatePreviewContent(milestone.id, patch)
                      }
                      onResendForApproval={() => {
                        void handleResendMilestone(milestone.id);
                      }}
                      isResending={resendingMilestoneId === milestone.id}
                      resendMessage={resendMessages[milestone.id] ?? null}
                    />
                  );
                })}
              </div>
            </div>

            <aside className="cos-card h-fit space-y-4">
              <h2 className="font-display text-xl text-cos-text">
                Approval workflow
              </h2>
              <ol className="space-y-0">
                {session.approvalWorkflow.map((step, index) => (
                  <li key={step.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <WorkflowStepIcon status={step.status} />
                      {index < session.approvalWorkflow.length - 1 && (
                        <span className="my-1 h-full w-px min-h-[2rem] bg-cos-border" />
                      )}
                    </div>
                    <div className="pb-4">
                      <p className="text-sm font-medium text-cos-text">
                        {step.role}
                      </p>
                      <p className="text-xs text-cos-muted">
                        {step.assigneeName ?? "—"}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </aside>
          </div>

          <div className="rounded border border-cos-border bg-cos-bg/40 px-4 py-3 text-sm text-cos-muted">
            Content must be approved before publishing. Creator → Committee Chair →
            VP Communications → Scheduled/Delivered. Changes-requested milestones
            can be edited (caption, schedule, artwork) and resent without
            regenerating other milestones.
            {actionMessage && (
              <span className="mt-1 block font-medium text-cos-text">
                {actionMessage}
              </span>
            )}
          </div>
        </div>
      </div>

      <CampaignBuilderFooter
        showContinue={false}
        onBack={() => goToStep("preview")}
        leftActions={
          <Button variant="ghost" size="sm" onClick={handleSaveDraft} disabled={isSending}>
            Save as draft
          </Button>
        }
        rightActions={
          <div className="flex flex-col items-stretch gap-2 sm:items-end">
            {sendDisabledReason ? (
              <p className="max-w-sm text-right text-xs text-cos-muted">
                {sendDisabledReason}
              </p>
            ) : null}
            <div className="flex flex-wrap items-center justify-end gap-3">
              <Button
                variant="secondary"
                onClick={handleApproveAll}
                disabled={isSending}
              >
                Approve all & schedule
              </Button>
              <Button
                onClick={handleSendForApproval}
                disabled={isSending || eligibleSubmitMilestones.length === 0}
                title={sendDisabledReason ?? undefined}
              >
                {isSending
                  ? "Sending…"
                  : bulkIsReapprovalOnly
                    ? "Send for re-approval"
                    : "Send for approval"}
              </Button>
            </div>
          </div>
        }
      />
    </div>
  );
}
