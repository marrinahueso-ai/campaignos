"use client";

import { Check, ChevronRight, GripVertical } from "lucide-react";
import {
  CAMPAIGN_WORKFLOW_STEP_LABELS,
  type CampaignWorkflowStep,
} from "@/components/event-workspace/CampaignWorkspaceTabs";
import { cn } from "@/lib/utils/cn";

const STEPPER_STEPS: CampaignWorkflowStep[] = [
  "plan",
  "artwork",
  "schedule",
  "publish",
  "published",
];

interface CaptionsProgressStepperProps {
  activeStep?: CampaignWorkflowStep;
  completedSteps?: CampaignWorkflowStep[];
  onStepSelect?: (step: CampaignWorkflowStep) => void;
}

export function CaptionsProgressStepper({
  activeStep = "schedule",
  completedSteps = ["plan", "artwork"],
  onStepSelect,
}: CaptionsProgressStepperProps) {
  return (
    <nav
      className="flex items-center gap-0 overflow-x-auto border-b border-cos-border bg-cos-card px-4 py-3 sm:px-5"
      aria-label="Campaign progress"
    >
      {STEPPER_STEPS.map((step, index) => {
        const isActive = step === activeStep;
        const isComplete = completedSteps.includes(step) && !isActive;
        const stepNumber = index + 1;
        const label = CAMPAIGN_WORKFLOW_STEP_LABELS[step];

        return (
          <div key={step} className="flex shrink-0 items-center">
            {index > 0 && (
              <ChevronRight
                className="mx-1.5 h-3.5 w-3.5 shrink-0 text-cos-border"
                aria-hidden
              />
            )}
            <button
              type="button"
              onClick={() => onStepSelect?.(step)}
              disabled={!onStepSelect}
              className={cn(
                "flex items-center gap-2 rounded-full px-2 py-1.5 text-left transition-colors sm:px-3",
                isActive && "bg-cos-bg",
                !isActive && onStepSelect && "hover:bg-cos-bg/50",
                !onStepSelect && "cursor-default",
              )}
              aria-current={isActive ? "step" : undefined}
            >
              {isComplete ? (
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cos-success text-white">
                  <Check className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
                </span>
              ) : isActive ? (
                <GripVertical className="h-4 w-4 shrink-0 text-cos-muted" aria-hidden />
              ) : (
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-cos-border bg-cos-card text-xs font-medium text-cos-muted">
                  {stepNumber}
                </span>
              )}

              {isActive ? (
                <span className="flex flex-col leading-tight">
                  <span className="text-[10px] font-medium tracking-[0.14em] text-cos-muted uppercase">
                    Step {stepNumber}
                  </span>
                  <span className="text-sm font-medium text-cos-text">{label}</span>
                </span>
              ) : (
                <span
                  className={cn(
                    "whitespace-nowrap text-sm",
                    isComplete ? "font-medium text-cos-text" : "text-cos-muted",
                  )}
                >
                  {label}
                </span>
              )}
            </button>
          </div>
        );
      })}
    </nav>
  );
}
