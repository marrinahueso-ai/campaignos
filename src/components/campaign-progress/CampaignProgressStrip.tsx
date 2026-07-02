import type { CampaignProgressSnapshot } from "@/lib/campaign-progress/types";
import { cn } from "@/lib/utils/cn";

interface CampaignProgressStripProps {
  progress: CampaignProgressSnapshot;
  className?: string;
  id?: string;
}

export function CampaignProgressStrip({
  progress,
  className,
  id = "campaign-progress",
}: CampaignProgressStripProps) {
  const showCommunicationsCount = progress.communicationsTotal > 0;

  return (
    <section
      id={id}
      className={cn(
        "scroll-mt-8 border-t border-cos-border bg-cos-bg/40 px-5 py-4 lg:px-6",
        className,
      )}
      aria-label="Campaign progress"
    >
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="min-w-0 flex-1 space-y-2">
          <div
            className="h-2 overflow-hidden rounded-full bg-cos-border/60"
            role="progressbar"
            aria-valuenow={progress.completionPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Campaign completion"
          >
            <div
              className="h-full rounded-full bg-cos-primary transition-all"
              style={{ width: `${progress.completionPercent}%` }}
            />
          </div>
          <p className="text-xs text-cos-muted">
            {showCommunicationsCount ? (
              <>
                <span className="font-medium text-cos-text">
                  {progress.communicationsCompleted}
                </span>{" "}
                of {progress.communicationsTotal} communications complete
                <span className="mx-2 text-cos-border">·</span>
              </>
            ) : null}
            {progress.lastUpdatedLabel}
          </p>
        </div>
        <p className="shrink-0 text-2xl font-semibold tabular-nums text-cos-text">
          {progress.completionPercent}%
        </p>
      </div>

      <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-4">
        <ProgressStat label="Awaiting approval" value={progress.awaitingApproval} />
        <ProgressStat label="Scheduled" value={progress.scheduled} />
        <ProgressStat label="Published" value={progress.published} />
        <ProgressStat
          label="Artwork"
          value={progress.artworkLabel}
          artworkStatus={progress.artworkStatus}
        />
      </ul>
    </section>
  );
}

function ProgressStat({
  label,
  value,
  artworkStatus,
}: {
  label: string;
  value: number | string;
  artworkStatus?: CampaignProgressSnapshot["artworkStatus"];
}) {
  return (
    <li className="flex items-baseline justify-between gap-2 text-xs sm:flex-col sm:items-start sm:gap-0.5">
      <span className="text-cos-muted">{label}</span>
      <span
        className={cn(
          "font-medium text-cos-text",
          typeof value === "number" && "tabular-nums",
          artworkStatus === "complete" && "text-cos-success-text",
          artworkStatus === "needed" && "text-cos-warning-text",
        )}
      >
        {value}
      </span>
    </li>
  );
}
