import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { CampaignWorkflowStep } from "@/components/event-workspace/CampaignWorkspaceTabs";

interface CampaignWorkflowStepHeaderProps {
  question: string;
  description: string;
  nextStep?: CampaignWorkflowStep;
  nextLabel?: string;
}

export function CampaignWorkflowStepHeader({
  question,
  description,
  nextStep,
  nextLabel,
}: CampaignWorkflowStepHeaderProps) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-cos-border bg-cos-bg/40 p-5">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium uppercase tracking-wide text-cos-muted">
          This step
        </p>
        <h2 className="mt-1 text-lg font-semibold text-cos-text">{question}</h2>
        <p className="mt-2 text-sm text-cos-muted">{description}</p>
      </div>
      {nextStep && nextLabel && (
        <Button href={`#${nextStep}`} size="sm" className="shrink-0">
          {nextLabel}
          <ArrowRight className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
