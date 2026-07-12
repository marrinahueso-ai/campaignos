import type {
  CampaignBuilderInspiration,
  CampaignBuilderMilestone,
  CampaignBuilderStepId,
  MilestonePreviewContent,
  StepWarning,
} from "@/lib/campaign-builder-v2/types";
import {
  countCompleteMilestones,
  derivedPreviewStatus,
} from "@/lib/campaign-builder-v2/milestone-status";
import { CAMPAIGN_BUILDER_STEPS } from "@/lib/campaign-builder-v2/navigation";

export function computeCampaignHealthPercent(
  milestones: CampaignBuilderMilestone[],
  previewContents: MilestonePreviewContent[],
): number {
  if (milestones.length === 0) {
    return 0;
  }

  const previewByMilestone = new Map(
    previewContents.map((content) => [content.milestoneId, content]),
  );

  let score = 0;
  const perMilestone = 100 / milestones.length;

  for (const milestone of milestones) {
    const preview = previewByMilestone.get(milestone.id);
    if (!preview) {
      continue;
    }

    const status = derivedPreviewStatus(preview);
    if (status === "ready") {
      score += perMilestone;
    } else if (status === "needs-review") {
      score += perMilestone * 0.65;
    } else {
      score += perMilestone * 0.25;
    }
  }

  return Math.round(Math.min(100, Math.max(0, score)));
}

export interface StepperStepState {
  subtitle: string;
  statusLabel: string;
  isWarning: boolean;
}

export function computeStepperStates(
  inspiration: CampaignBuilderInspiration,
  milestones: CampaignBuilderMilestone[],
  previewContents: MilestonePreviewContent[],
  currentStep: CampaignBuilderStepId,
): Record<CampaignBuilderStepId, StepperStepState> {
  const readyCount = previewContents.filter(
    (c) => derivedPreviewStatus(c) === "ready",
  ).length;
  const needsReviewCount = previewContents.filter(
    (c) => derivedPreviewStatus(c) === "needs-review",
  ).length;
  const draftCount = previewContents.filter(
    (c) => derivedPreviewStatus(c) === "draft",
  ).length;
  const configuredCount = previewContents.filter(
    (c) => derivedPreviewStatus(c) !== "draft",
  ).length;

  const { complete: generatedComplete, total: milestoneTotal } =
    countCompleteMilestones(milestones, previewContents);
  const previewStepMeta = CAMPAIGN_BUILDER_STEPS.find((step) => step.id === "preview");

  const inspirationComplete =
    Boolean(inspiration.campaignName) &&
    Boolean(inspiration.eventDate) &&
    Boolean(inspiration.playbookId);

  const milestonesComplete =
    milestones.length > 0 &&
    milestones.every((m) => m.name.trim() && m.purpose.trim());

  const previewComplete =
    previewContents.length > 0 && needsReviewCount === 0 && draftCount === 0;

  const reviewPending = previewContents.some(
    (c) =>
      c.approvalStatuses.some((a) => a.status !== "approved") ||
      derivedPreviewStatus(c) === "needs-review",
  );

  const stepOrder: CampaignBuilderStepId[] = [
    "inspiration",
    "milestones",
    "preview",
    "review",
    "published",
  ];
  const currentIndex = stepOrder.indexOf(currentStep);

  function statusForStep(
    step: CampaignBuilderStepId,
    complete: boolean,
    inProgress: boolean,
    warning: boolean,
    pendingLabel: string,
  ): StepperStepState {
    const stepIndex = stepOrder.indexOf(step);
    if (complete && stepIndex < currentIndex) {
      return { subtitle: "Complete", statusLabel: "Complete", isWarning: false };
    }
    if (warning) {
      return {
        subtitle: pendingLabel,
        statusLabel: "Needs review",
        isWarning: true,
      };
    }
    if (step === currentStep || inProgress) {
      return {
        subtitle: pendingLabel,
        statusLabel: "In progress",
        isWarning: false,
      };
    }
    if (stepIndex > currentIndex) {
      return {
        subtitle: "Not started",
        statusLabel: "Not started",
        isWarning: false,
      };
    }
    return {
      subtitle: pendingLabel,
      statusLabel: "Pending",
      isWarning: false,
    };
  }

  return {
    inspiration: statusForStep(
      "inspiration",
      inspirationComplete,
      currentStep === "inspiration",
      false,
      inspirationComplete ? "Complete" : "Add campaign details",
    ),
    milestones: statusForStep(
      "milestones",
      milestonesComplete && configuredCount === milestones.length,
      currentStep === "milestones",
      false,
      milestones.length > 0
        ? `${configuredCount} of ${milestones.length} complete`
        : "0 milestones",
    ),
    preview: statusForStep(
      "preview",
      previewComplete,
      currentStep === "preview",
      needsReviewCount > 0,
      generatedComplete > 0
        ? `${generatedComplete} of ${milestoneTotal} milestones complete`
        : (previewStepMeta?.subtitle ?? "Create content one milestone at a time"),
    ),
    review: statusForStep(
      "review",
      !reviewPending && readyCount === milestones.length,
      currentStep === "review",
      reviewPending && currentStep !== "published",
      reviewPending ? "Pending" : "Ready to publish",
    ),
    published: statusForStep(
      "published",
      currentStep === "published",
      false,
      false,
      currentStep === "published" ? "Complete" : "Not started",
    ),
  };
}

export function computeStepWarnings(
  milestones: CampaignBuilderMilestone[],
  previewContents: MilestonePreviewContent[],
): StepWarning[] {
  const warnings: StepWarning[] = [];

  for (const preview of previewContents) {
    if (derivedPreviewStatus(preview) === "needs-review") {
      const milestone = milestones.find((m) => m.id === preview.milestoneId);
      warnings.push({
        id: `preview-${preview.milestoneId}`,
        message: `${milestone?.name ?? "Milestone"} needs review`,
        step: "preview",
        milestoneId: preview.milestoneId,
      });
    }
  }

  for (const preview of previewContents) {
    const pendingApproval = preview.approvalStatuses.some(
      (a) => a.status === "pending",
    );
    if (pendingApproval || derivedPreviewStatus(preview) === "needs-review") {
      const milestone = milestones.find((m) => m.id === preview.milestoneId);
      warnings.push({
        id: `review-${preview.milestoneId}`,
        message: `${milestone?.name ?? "Milestone"} awaiting approval`,
        step: "review",
        milestoneId: preview.milestoneId,
      });
    }
  }

  return warnings;
}

export function computeStepperSubtitles(
  milestones: CampaignBuilderMilestone[],
  previewContents: MilestonePreviewContent[],
): Record<string, string> {
  const readyCount = previewContents.filter(
    (c) => derivedPreviewStatus(c) === "ready",
  ).length;
  const needsReviewCount = previewContents.filter(
    (c) => derivedPreviewStatus(c) === "needs-review",
  ).length;
  const draftCount = previewContents.filter(
    (c) => derivedPreviewStatus(c) === "draft",
  ).length;
  const configuredCount = previewContents.filter(
    (c) => derivedPreviewStatus(c) !== "draft",
  ).length;

  return {
    inspiration: "Complete",
    milestones:
      milestones.length > 0
        ? `${configuredCount} of ${milestones.length} complete`
        : "0 milestones",
    preview:
      needsReviewCount > 0
        ? `${needsReviewCount} need review`
        : readyCount > 0
          ? `${readyCount} ready`
          : draftCount > 0
            ? `${draftCount} drafts`
            : "Not started",
    review: "Pending",
    published: "Not started",
  };
}
