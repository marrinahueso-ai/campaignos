import {
  stepFromHash,
  type CampaignWorkflowStep,
} from "@/components/event-workspace/CampaignWorkspaceTabs";
import type { CampaignProgressSnapshot } from "@/lib/campaign-progress/types";

export function workflowStepFromHref(href: string): CampaignWorkflowStep | null {
  const hashIndex = href.indexOf("#");
  if (hashIndex < 0) {
    return null;
  }

  return stepFromHash(href.slice(hashIndex));
}

export function resolveSuggestedWorkflowStep(
  progress: CampaignProgressSnapshot,
): CampaignWorkflowStep {
  if (progress.nextAction?.href.includes("/approvals")) {
    return "publish";
  }

  const fromNextAction = progress.nextAction?.href
    ? workflowStepFromHref(progress.nextAction.href)
    : null;
  if (fromNextAction) {
    return fromNextAction;
  }

  if (
    progress.artworkStatus === "needed" ||
    progress.artworkStatus === "in_progress"
  ) {
    return "artwork";
  }

  if (progress.awaitingApproval > 0) {
    return "publish";
  }

  if (progress.published > 0 && progress.completionPercent >= 85) {
    return "published";
  }

  if (
    progress.scheduled > 0 ||
    (progress.communicationsTotal > 0 &&
      progress.communicationsCompleted < progress.communicationsTotal)
  ) {
    return "schedule";
  }

  return "plan";
}
