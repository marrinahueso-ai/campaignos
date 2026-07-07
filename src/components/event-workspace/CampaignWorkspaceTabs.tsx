"use client";

import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils/cn";

export type CampaignWorkflowStep =
  | "plan"
  | "artwork"
  | "schedule"
  | "publish"
  | "published";

/** @deprecated Use CampaignWorkflowStep */
export type CampaignWorkspaceTab = CampaignWorkflowStep;

const WORKFLOW_STEPS: { id: CampaignWorkflowStep; label: string }[] = [
  { id: "plan", label: "Campaign plan" },
  { id: "artwork", label: "Artwork" },
  { id: "schedule", label: "Captions" },
  { id: "publish", label: "Review & publish" },
  { id: "published", label: "Published" },
];

export const CAMPAIGN_WORKFLOW_STEP_LABELS = Object.fromEntries(
  WORKFLOW_STEPS.map((step) => [step.id, step.label]),
) as Record<CampaignWorkflowStep, string>;

export const CAMPAIGN_WORKFLOW_STEP_ORDER: CampaignWorkflowStep[] = WORKFLOW_STEPS.map(
  (step) => step.id,
);

/** Steps that render CaptionsProgressStepper — hide the legacy tab bar. */
export const CAMPAIGN_WORKFLOW_PROGRESS_STEPPER_STEPS: CampaignWorkflowStep[] =
  CAMPAIGN_WORKFLOW_STEP_ORDER;

export function resolveCompletedWorkflowSteps(
  activeStep: CampaignWorkflowStep,
): CampaignWorkflowStep[] {
  const activeIndex = CAMPAIGN_WORKFLOW_STEP_ORDER.indexOf(activeStep);
  if (activeIndex <= 0) {
    return [];
  }

  return CAMPAIGN_WORKFLOW_STEP_ORDER.slice(0, activeIndex);
}

const LEGACY_HASH_TO_STEP: Record<string, CampaignWorkflowStep> = {
  plan: "plan",
  "communication-plan": "plan",
  overview: "plan",
  captions: "schedule",
  timeline: "schedule",
  "drafts-messages": "schedule",
  artwork: "artwork",
  creative: "artwork",
  "event-assets": "artwork",
  memory: "artwork",
  schedule: "schedule",
  approval: "publish",
  approvals: "publish",
  publishing: "publish",
  publish: "publish",
  published: "published",
  activity: "published",
  "notes-memory": "published",
};

export function stepFromHash(hash: string): CampaignWorkflowStep | null {
  const id = hash.replace("#", "");
  if (!id) {
    return null;
  }

  if (WORKFLOW_STEPS.some((step) => step.id === id)) {
    return id as CampaignWorkflowStep;
  }

  return LEGACY_HASH_TO_STEP[id] ?? null;
}

interface CampaignWorkspaceTabsProps {
  plan: React.ReactNode;
  artwork: React.ReactNode;
  schedule: React.ReactNode;
  publish: React.ReactNode;
  published: React.ReactNode;
  defaultStep?: CampaignWorkflowStep;
  /** Controlled step (e.g. planning hub social tab). */
  activeStep?: CampaignWorkflowStep;
  onStepChange?: (step: CampaignWorkflowStep) => void;
  /** When false, workflow step is local state only (embedded in planning hub). */
  manageHash?: boolean;
  /** Steps that render full-bleed without the default workflow tab bar. */
  fullBleedSteps?: CampaignWorkflowStep[];
  id?: string;
}

export function CampaignWorkspaceTabs({
  plan,
  artwork,
  schedule,
  publish,
  published,
  defaultStep = "plan",
  activeStep: controlledStep,
  onStepChange,
  manageHash = true,
  fullBleedSteps = CAMPAIGN_WORKFLOW_PROGRESS_STEPPER_STEPS,
  id = "campaign-workflow-tabs",
}: CampaignWorkspaceTabsProps) {
  const [internalStep, setInternalStep] = useState<CampaignWorkflowStep>(defaultStep);
  const activeStep = controlledStep ?? internalStep;
  const [initialized, setInitialized] = useState(
    () => controlledStep !== undefined || !manageHash,
  );

  const syncFromHash = useCallback(() => {
    if (controlledStep !== undefined || !manageHash) {
      return;
    }

    const fromHash = stepFromHash(window.location.hash);
    if (fromHash) {
      setInternalStep(fromHash);
      return;
    }

    setInternalStep(defaultStep);
    window.history.replaceState(null, "", `#${defaultStep}`);
  }, [controlledStep, defaultStep, manageHash]);

  useEffect(() => {
    syncFromHash();
    setInitialized(true);
    if (!manageHash) {
      return;
    }
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, [syncFromHash, manageHash]);

  useEffect(() => {
    if (controlledStep !== undefined || manageHash) {
      return;
    }
    setInternalStep(defaultStep);
  }, [controlledStep, defaultStep, manageHash]);

  const panels: Record<CampaignWorkflowStep, React.ReactNode> = {
    plan,
    artwork,
    schedule,
    publish,
    published,
  };

  const isFullBleed = fullBleedSteps.includes(activeStep);

  return (
    <div
      id={id}
      className={cn("scroll-mt-8", isFullBleed ? "bg-transparent" : "border border-cos-border bg-cos-card")}
    >
      <div className={isFullBleed ? undefined : "p-6 lg:p-8"}>
        {!initialized ? (
          <div className="min-h-[12rem] animate-pulse rounded-2xl bg-cos-bg/60" />
        ) : (
          WORKFLOW_STEPS.map((step) =>
            activeStep === step.id ? (
              <div
                key={step.id}
                id={`campaign-step-${step.id}`}
                role="tabpanel"
                aria-labelledby={`campaign-step-trigger-${step.id}`}
                className="space-y-6"
              >
                {panels[step.id]}
              </div>
            ) : null,
          )
        )}
      </div>
    </div>
  );
}
