import { cn } from "@/lib/utils/cn";
import { Check } from "lucide-react";

interface WizardProgressProps {
  steps: string[];
  currentStep: number;
}

export function WizardProgress({ steps, currentStep }: WizardProgressProps) {
  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="flex items-center justify-between">
        {steps.map((label, index) => {
          const stepNumber = index + 1;
          const isComplete = stepNumber < currentStep;
          const isCurrent = stepNumber === currentStep;

          return (
            <div key={label} className="flex flex-1 items-center">
              <div className="flex flex-col items-center gap-2">
                <div
                  className={cn(
                    "flex h-9 w-9 items-center justify-center border text-sm font-medium transition-colors",
                    isComplete && "border-cos-text bg-cos-text text-white",
                    isCurrent && "border-cos-text bg-cos-card text-cos-text",
                    !isComplete &&
                      !isCurrent &&
                      "border-cos-border bg-cos-card text-cos-muted",
                  )}
                >
                  {isComplete ? <Check className="h-4 w-4" /> : stepNumber}
                </div>
                <span
                  className={cn(
                    "hidden text-xs font-medium sm:block",
                    isCurrent ? "text-cos-text" : "text-cos-muted",
                  )}
                >
                  {label}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "mx-2 h-px flex-1",
                    stepNumber < currentStep ? "bg-cos-text" : "bg-cos-border",
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
