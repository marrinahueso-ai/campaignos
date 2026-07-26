"use client";

import { AlertTriangle, Check } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import {
  CAMPAIGN_BUILDER_STEPS,
  type CampaignBuilderStepperStepId,
} from "@/lib/campaign-builder-v2/navigation";
import type { CampaignBuilderStepId } from "@/lib/campaign-builder-v2/types";
import type { StepperStepState } from "@/lib/campaign-builder-v2/health";
import type { StepWarning } from "@/lib/campaign-builder-v2/types";

const STEP_HINTS: Record<CampaignBuilderStepperStepId, string> = {
  inspiration: "Logos · inspiration · playbook",
  milestones: "Dates · drag · edit",
  preview: "Artwork · formats · reapprove",
  review: "Approve · send",
};

const STEP_SHORT_LABELS: Record<CampaignBuilderStepperStepId, string> = {
  inspiration: "Creative Setup",
  milestones: "Milestones",
  preview: "Preview",
  review: "Review",
};

interface CampaignBuilderStepperProps {
  currentStep: CampaignBuilderStepId;
  stepStates: Record<CampaignBuilderStepperStepId, StepperStepState>;
  warnings: StepWarning[];
  onStepClick?: (step: CampaignBuilderStepId) => void;
  onWarningClick?: (warning: StepWarning) => void;
  /** Vertical left rail (composer style) vs legacy horizontal bar */
  variant?: "rail" | "horizontal";
}

export function CampaignBuilderStepper({
  currentStep,
  stepStates,
  warnings,
  onStepClick,
  onWarningClick,
  variant = "rail",
}: CampaignBuilderStepperProps) {
  const warningCount = warnings.length;

  if (variant === "rail") {
    return (
      <nav
        aria-label="Campaign builder steps"
        className="h-fit rounded-[22px] border border-cos-border/60 bg-cos-bg-alt p-3.5 lg:sticky lg:top-4"
      >
        <p className="mb-2 px-2.5 text-[11px] font-bold uppercase tracking-[0.08em] text-cos-muted">
          Steps
        </p>

        {warningCount > 0 ? (
          <div className="mb-3 space-y-1.5 px-1">
            <span className="inline-flex items-center gap-1.5 px-1.5 text-[11px] font-semibold text-cos-warning-text">
              <AlertTriangle className="h-3.5 w-3.5" strokeWidth={2} />
              {warningCount} need{warningCount === 1 ? "s" : ""} attention
            </span>
            {warnings.slice(0, 2).map((warning) => (
              <button
                key={warning.id}
                type="button"
                onClick={() => onWarningClick?.(warning)}
                className="block w-full rounded-xl border border-cos-warning/40 bg-cos-warning/10 px-2.5 py-1.5 text-left text-[11px] font-medium text-cos-warning-text transition-colors hover:bg-cos-warning/20"
              >
                {warning.message}
              </button>
            ))}
          </div>
        ) : null}

        <ol className="space-y-1">
          {CAMPAIGN_BUILDER_STEPS.map((step, index) => {
            const state = stepStates[step.id];
            const isCurrent = step.id === currentStep;
            const isComplete =
              state?.statusLabel === "Complete" && !isCurrent;

            return (
              <li key={step.id}>
                <button
                  type="button"
                  onClick={() => onStepClick?.(step.id)}
                  className={cn(
                    "mb-0.5 w-full rounded-[14px] px-3 py-2.5 text-left text-sm font-semibold text-cos-text transition",
                    isCurrent
                      ? "bg-cos-card shadow-[0_8px_28px_rgba(28,36,48,0.06)]"
                      : "hover:bg-white/45",
                  )}
                >
                  <span className="flex items-center gap-2">
                    <span
                      className={cn(
                        "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                        isComplete
                          ? "bg-cos-success text-white"
                          : isCurrent
                            ? "bg-cos-text text-[#f6f2eb]"
                            : state?.isWarning
                              ? "bg-cos-warning/30 text-cos-warning-text"
                              : "bg-cos-border/80 text-cos-muted",
                      )}
                    >
                      {isComplete ? (
                        <Check className="h-3 w-3" strokeWidth={2.5} />
                      ) : (
                        index + 1
                      )}
                    </span>
                    <span>
                      {index + 1} · {STEP_SHORT_LABELS[step.id]}
                    </span>
                  </span>
                  <small className="mt-0.5 block pl-7 text-xs font-medium text-cos-muted">
                    {state?.isWarning
                      ? state.subtitle
                      : STEP_HINTS[step.id]}
                  </small>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>
    );
  }

  // Legacy horizontal (kept for any callers)
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
