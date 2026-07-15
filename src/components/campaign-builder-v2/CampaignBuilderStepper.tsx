"use client";

import { AlertTriangle, Check } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { CAMPAIGN_BUILDER_STEPS } from "@/lib/campaign-builder-v2/navigation";
import type { CampaignBuilderStepId } from "@/lib/campaign-builder-v2/types";
import type { StepperStepState } from "@/lib/campaign-builder-v2/health";
import type { StepWarning } from "@/lib/campaign-builder-v2/types";

interface CampaignBuilderStepperProps {
  currentStep: CampaignBuilderStepId;
  stepStates: Record<CampaignBuilderStepId, StepperStepState>;
  warnings: StepWarning[];
  onStepClick?: (step: CampaignBuilderStepId) => void;
  onWarningClick?: (warning: StepWarning) => void;
}

export function CampaignBuilderStepper({
  currentStep,
  stepStates,
  warnings,
  onStepClick,
  onWarningClick,
}: CampaignBuilderStepperProps) {
  const warningCount = warnings.length;

  return (
    <nav
      aria-label="Campaign builder progress"
      className="border-b border-cos-border bg-cos-card px-4 py-4 lg:px-8"
    >
      {warningCount > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-cos-warning-text">
            <AlertTriangle className="h-3.5 w-3.5" strokeWidth={2} />
            {warningCount} need{warningCount === 1 ? "s" : ""} attention
          </span>
          {warnings.slice(0, 3).map((warning) => (
            <button
              key={warning.id}
              type="button"
              onClick={() => onWarningClick?.(warning)}
              className="border border-cos-warning/40 bg-cos-warning/10 px-2 py-0.5 text-[11px] font-medium text-cos-warning-text transition-colors hover:bg-cos-warning/20"
            >
              {warning.message}
            </button>
          ))}
        </div>
      )}

      <ol className="flex flex-wrap items-start gap-x-2 gap-y-3 lg:gap-x-0">
        {CAMPAIGN_BUILDER_STEPS.map((step, index) => {
          const state = stepStates[step.id];
          const isCurrent = step.id === currentStep;
          // Checkmark for completed work; keep current-step styling when on that step
          const isComplete =
            state?.statusLabel === "Complete" && !isCurrent;

          return (
            <li key={step.id} className="flex min-w-0 flex-1 items-start">
              <button
                type="button"
                onClick={() => onStepClick?.(step.id)}
                className="group flex w-full min-w-0 cursor-pointer flex-col items-start text-left transition-colors"
              >
                <div className="flex w-full items-center gap-2">
                  <span
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-medium transition-colors",
                      isComplete
                        ? "border-cos-success bg-cos-success text-white"
                        : isCurrent
                          ? "border-cos-text bg-cos-text text-[#f6f2eb]"
                          : state?.isWarning
                            ? "border-cos-warning bg-cos-warning/20 text-cos-warning-text"
                            : "border-cos-border bg-cos-card text-cos-muted",
                    )}
                  >
                    {isComplete ? (
                      <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                    ) : (
                      index + 1
                    )}
                  </span>
                  {index < CAMPAIGN_BUILDER_STEPS.length - 1 && (
                    <span
                      className={cn(
                        "hidden h-px flex-1 lg:block",
                        isComplete ? "bg-cos-success" : "bg-cos-border",
                      )}
                      aria-hidden="true"
                    />
                  )}
                </div>
                <span
                  className={cn(
                    "mt-2 text-xs font-medium tracking-wide",
                    isCurrent ? "text-cos-text" : "text-cos-muted",
                  )}
                >
                  {step.label}
                </span>
                {state && (
                  <span
                    className={cn(
                      "mt-0.5 text-[11px]",
                      state.isWarning
                        ? "font-medium text-cos-warning-text"
                        : "text-cos-muted",
                    )}
                  >
                    {state.subtitle}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
