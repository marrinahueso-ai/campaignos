"use client";

import { useState } from "react";
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
import { cn } from "@/lib/utils/cn";
import type { ApprovalWorkflowStepStatus } from "@/lib/campaign-builder-v2/types";

const REVIEW_TABS = [
  { id: "all", label: "All Milestones" },
  { id: "needs-review", label: "Needs review" },
  { id: "approved", label: "Approved" },
  { id: "changes-requested", label: "Changes requested" },
] as const;

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
  const [isSending, setIsSending] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const sortedMilestones = [...session.milestones].sort(
    (a, b) => a.sortOrder - b.sortOrder,
  );

  const filteredMilestones = sortedMilestones.filter((milestone) => {
    const preview = session.previewContents.find(
      (c) => c.milestoneId === milestone.id,
    );
    if (!preview) return false;
    if (session.reviewFilter === "all") return true;
    if (session.reviewFilter === "needs-review") {
      return preview.status === "needs-review";
    }
    if (session.reviewFilter === "approved") {
      return preview.status === "ready";
    }
    return preview.status === "draft";
  });

  async function handleSendForApproval() {
    setIsSending(true);
    try {
      const result = await sendForApprovalAction(session.eventId);
      setActionMessage(result.message);
    } finally {
      setIsSending(false);
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
              {session.previewContents.filter((c) => c.status === "ready").length}{" "}
              ready ·{" "}
              {
                session.previewContents.filter((c) => c.status === "needs-review")
                  .length
              }{" "}
              need review
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
                      milestone={milestone}
                      preview={preview}
                      isExpanded={isExpanded}
                      onToggle={() => toggleExpandedReview(milestone.id)}
                      onUpdatePreview={(patch) =>
                        updatePreviewContent(milestone.id, patch)
                      }
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
                        {step.assigneeName ??
                          (step.status === "pending" ? "Pending" : "—")}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </aside>
          </div>

          <div className="rounded border border-cos-border bg-cos-bg/40 px-4 py-3 text-sm text-cos-muted">
            Content must be approved before publishing. Creator → Committee Chair →
            VP Communications → Scheduled/Delivered.
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
          <>
            <Button
              variant="secondary"
              onClick={handleApproveAll}
              disabled={isSending}
            >
              Approve all & schedule
            </Button>
            <Button onClick={handleSendForApproval} disabled={isSending}>
              {isSending ? "Sending…" : "Send for approval"}
            </Button>
          </>
        }
      />
    </div>
  );
}
