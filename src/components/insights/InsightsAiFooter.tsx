import { Lightbulb } from "lucide-react";

interface InsightsAiFooterProps {
  recommendation: string | null;
}

export function InsightsAiFooter({ recommendation }: InsightsAiFooterProps) {
  if (!recommendation) {
    return null;
  }

  return (
    <div className="flex flex-col gap-4 border border-cos-border bg-cos-card px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <Lightbulb className="mt-0.5 h-4 w-4 text-cos-accent" strokeWidth={1.5} />
        <p className="text-sm leading-relaxed text-cos-text">{recommendation}</p>
      </div>
      <button
        type="button"
        disabled
        className="inline-flex h-9 items-center justify-center border border-cos-border px-4 text-xs text-cos-muted"
        title="Detailed recommendations view is not available in this release."
      >
        View Recommendations
      </button>
    </div>
  );
}
