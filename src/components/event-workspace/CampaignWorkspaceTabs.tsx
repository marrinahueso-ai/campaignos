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
  { id: "plan", label: "Communication Plan" },
  { id: "artwork", label: "Artwork" },
  { id: "schedule", label: "Posts & Schedule" },
  { id: "publish", label: "Review & Publish" },
  { id: "published", label: "Published" },
];

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

function stepFromHash(hash: string): CampaignWorkflowStep | null {
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
}

export function CampaignWorkspaceTabs({
  plan,
  artwork,
  schedule,
  publish,
  published,
  defaultStep = "plan",
}: CampaignWorkspaceTabsProps) {
  const [activeStep, setActiveStep] = useState<CampaignWorkflowStep>(defaultStep);
  const [initialized, setInitialized] = useState(false);

  const syncFromHash = useCallback(() => {
    const fromHash = stepFromHash(window.location.hash);
    if (fromHash) {
      setActiveStep(fromHash);
      return;
    }

    setActiveStep(defaultStep);
    window.history.replaceState(null, "", `#${defaultStep}`);
  }, [defaultStep]);

  useEffect(() => {
    syncFromHash();
    setInitialized(true);
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, [syncFromHash]);

  function selectStep(step: CampaignWorkflowStep) {
    setActiveStep(step);
    window.history.replaceState(null, "", `#${step}`);
  }

  const panels: Record<CampaignWorkflowStep, React.ReactNode> = {
    plan,
    artwork,
    schedule,
    publish,
    published,
  };

  return (
    <div className="border border-cos-border bg-cos-card">
      <div
        className="sticky top-0 z-10 border-b border-cos-border bg-cos-card/95 px-4 pt-5 backdrop-blur-sm lg:px-6"
        role="navigation"
        aria-label="Campaign workflow"
      >
        <p className="studio-eyebrow mb-4 px-1">Campaign workflow</p>
        <div className="flex gap-0 overflow-x-auto" role="tablist">
          {WORKFLOW_STEPS.map((step, index) => {
            const isActive = activeStep === step.id;
            return (
              <button
                key={step.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-controls={`campaign-step-${step.id}`}
                id={`campaign-step-trigger-${step.id}`}
                onClick={() => selectStep(step.id)}
                className={cn(
                  "shrink-0 border-b-2 px-3 py-3 text-left transition-colors sm:px-5",
                  isActive
                    ? "border-cos-dark bg-cos-bg text-cos-text"
                    : "border-transparent text-cos-muted hover:bg-cos-bg/60 hover:text-cos-text",
                )}
              >
                <span className="block text-[10px] tracking-[0.14em] text-cos-muted uppercase">
                  Step {index + 1}
                </span>
                <span className="font-display mt-0.5 block text-base">{step.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-6 lg:p-8">
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
