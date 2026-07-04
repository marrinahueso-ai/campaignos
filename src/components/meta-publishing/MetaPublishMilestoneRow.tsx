import { Button } from "@/components/ui/Button";
import { planDueDateToScheduledTime } from "@/lib/campaign-plan/plan-milestone-display";
import { formatDateTime } from "@/lib/utils/dates";
import type { MetaPublishBundle, MetaPublishBundleStatus } from "@/lib/meta-publishing/types";
import { cn } from "@/lib/utils/cn";

function statusLabel(status: MetaPublishBundleStatus): string {
  switch (status) {
    case "ready":
      return "Ready";
    case "scheduled":
      return "Scheduled";
    case "approved":
      return "Queued";
    case "failed":
      return "Failed";
    case "published":
      return "Published";
    case "posting":
      return "Publishing…";
    default:
      return status.replaceAll("_", " ");
  }
}

function statusClassName(status: MetaPublishBundleStatus): string {
  switch (status) {
    case "published":
    case "approved":
    case "posting":
      return "bg-emerald-50 text-emerald-700";
    case "failed":
      return "bg-red-50 text-red-700";
    case "ready":
      return "bg-cos-accent-soft text-cos-text";
    case "scheduled":
      return "bg-cos-info/50 text-cos-text";
    default:
      return "bg-cos-bg text-cos-muted";
  }
}

interface MetaPublishMilestoneRowProps {
  bundle: MetaPublishBundle;
  onPublish?: () => void;
  publishPending?: boolean;
}

export function MetaPublishMilestoneRow({
  bundle,
  onPublish,
  publishPending = false,
}: MetaPublishMilestoneRowProps) {
  const when = bundle.scheduledFor
    ? formatDateTime(bundle.scheduledFor)
    : bundle.dueDate
      ? formatDateTime(planDueDateToScheduledTime(bundle.dueDate) ?? "")
      : "Ready now";

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-cos-border bg-cos-card px-4 py-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-cos-text">{bundle.title}</p>
        <p className="mt-0.5 text-xs text-cos-muted">{when}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span
          className={cn(
            "rounded-full px-2.5 py-0.5 text-xs font-medium",
            statusClassName(bundle.status),
          )}
        >
          {statusLabel(bundle.status)}
        </span>
        {onPublish && bundle.status !== "published" && (
          <Button type="button" size="sm" disabled={publishPending} onClick={onPublish}>
            {publishPending ? "…" : "Publish"}
          </Button>
        )}
      </div>
    </li>
  );
}
