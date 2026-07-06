import Link from "next/link";
import { AlertTriangle, ExternalLink } from "lucide-react";
import type { InboxAiSourceUsed } from "@/types/inbox-ai-sources";

interface InboxAiSourceSummaryProps {
  sourceUsed: InboxAiSourceUsed | null | undefined;
}

export function InboxAiSourceSummary({ sourceUsed }: InboxAiSourceSummaryProps) {
  if (!sourceUsed) {
    return null;
  }

  const checkedLabels = sourceUsed.sourcesChecked
    .filter((source) => source.checked)
    .map((source) =>
      source.fetchError ? `${source.label} (unavailable)` : source.label,
    );

  return (
    <div className="mt-2 space-y-1.5 rounded-lg border border-cos-border bg-cos-bg/50 px-3 py-2 text-[11px] leading-relaxed text-cos-muted">
      <p>
        <span className="font-medium text-cos-text">Sources checked:</span>{" "}
        {checkedLabels.length > 0 ? checkedLabels.join(", ") : "None configured"}
      </p>

      {sourceUsed.answerFrom ? (
        <p>
          <span className="font-medium text-cos-text">Answer from:</span>{" "}
          {sourceUsed.answerFrom.label}
          {" · "}
          <Link
            href={sourceUsed.answerFrom.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-0.5 text-cos-accent hover:underline"
          >
            View page
            <ExternalLink className="h-3 w-3" aria-hidden />
          </Link>
        </p>
      ) : (
        <p className="inline-flex items-start gap-1 text-amber-700">
          <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
          <span>
            <span className="font-medium text-cos-text">Answer from:</span> none — follow up
            needed
          </span>
        </p>
      )}
    </div>
  );
}
