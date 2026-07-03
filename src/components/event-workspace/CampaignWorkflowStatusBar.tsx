"use client";

import { ArrowRight } from "lucide-react";
import { CampaignProgressStrip } from "@/components/campaign-progress/CampaignProgressStrip";
import {
  CAMPAIGN_WORKFLOW_STEP_LABELS,
  type CampaignWorkflowStep,
} from "@/components/event-workspace/CampaignWorkspaceTabs";
import { EventArchivedBanner } from "@/components/event-workspace/EventManageMenu";
import { Button } from "@/components/ui/Button";
import type { CampaignProgressSnapshot } from "@/lib/campaign-progress/types";
import { isArchivedEvent } from "@/lib/events/event-status";
import type { EventNextStep } from "@/lib/event-workspace/get-next-helpful-action";
import {
  resolveSuggestedWorkflowStep,
  workflowStepFromHref,
} from "@/lib/event-workspace/resolve-suggested-workflow-step";
import type { Event } from "@/types";

interface CampaignWorkflowStatusBarProps {
  event: Event;
  nextStep: EventNextStep;
  campaignProgress: CampaignProgressSnapshot;
  activeWorkflowStep: CampaignWorkflowStep;
  onWorkflowStepSelect: (step: CampaignWorkflowStep) => void;
}

function resolveHeadline(
  nextStep: EventNextStep,
  campaignProgress: CampaignProgressSnapshot,
): string {
  const nextAction = campaignProgress.nextAction;
  if (
    nextAction &&
    !nextAction.title.toLowerCase().includes("nothing needed") &&
    !nextAction.title.toLowerCase().includes("event workspace")
  ) {
    return nextAction.title;
  }

  return nextStep.action;
}

function resolveCtaLabel(
  suggestedStep: CampaignWorkflowStep,
  campaignProgress: CampaignProgressSnapshot,
): string {
  const nextAction = campaignProgress.nextAction;
  if (nextAction?.href.includes("/approvals")) {
    return "Review approvals";
  }

  return `Continue in ${CAMPAIGN_WORKFLOW_STEP_LABELS[suggestedStep]}`;
}

export function CampaignWorkflowStatusBar({
  event,
  nextStep,
  campaignProgress,
  activeWorkflowStep,
  onWorkflowStepSelect,
}: CampaignWorkflowStatusBarProps) {
  const archived = isArchivedEvent(event);
  const suggestedStep = resolveSuggestedWorkflowStep(campaignProgress);
  const headline = resolveHeadline(nextStep, campaignProgress);
  const ctaLabel = resolveCtaLabel(suggestedStep, campaignProgress);

  const nextActionHref = campaignProgress.nextAction?.href ?? null;
  const externalHref =
    nextActionHref &&
    !nextActionHref.includes(`/events/${event.id}`) &&
    workflowStepFromHref(nextActionHref) === null
      ? nextActionHref
      : null;

  function handleContinue() {
    onWorkflowStepSelect(suggestedStep);
    document
      .getElementById("campaign-workflow-tabs")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="overflow-hidden rounded-3xl bg-cos-card shadow-sm">
      {archived && (
        <div className="px-5 pt-5 lg:px-6">
          <EventArchivedBanner />
        </div>
      )}

      <div className="p-5 lg:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-1.5">
            <p className="studio-eyebrow">Social media</p>
            <h2 className="font-display text-xl tracking-tight text-cos-text sm:text-2xl">
              {headline}
            </h2>
            {nextStep.dueMessage && (
              <p className="text-sm text-cos-muted">{nextStep.dueMessage}</p>
            )}
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {externalHref ? (
              <Button href={externalHref} size="sm">
                {ctaLabel}
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            ) : (
              <Button size="sm" onClick={handleContinue}>
                {ctaLabel}
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>

        <p className="mt-4 text-xs text-cos-muted">
          Currently viewing{" "}
          <span className="font-medium text-cos-text">
            {CAMPAIGN_WORKFLOW_STEP_LABELS[activeWorkflowStep]}
          </span>
          {" · "}
          {campaignProgress.completionPercent}% complete
        </p>
      </div>

      <CampaignProgressStrip progress={campaignProgress} />
    </div>
  );
}
