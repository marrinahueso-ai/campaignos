import Link from "next/link";
import { Check, ClipboardList } from "lucide-react";
import { DashboardWidgetCard } from "@/components/today/DashboardWidgetCard";
import { CHANNEL_LABELS } from "@/lib/playbooks/constants";
import type { ApprovalQueueItem } from "@/types/event-workspace";

interface ApprovalsWidgetProps {
  items: ApprovalQueueItem[];
}

export function ApprovalsWidget({ items }: ApprovalsWidgetProps) {
  const visible = items.slice(0, 3);

  return (
    <DashboardWidgetCard icon={ClipboardList} title="Approvals">
      {visible.length === 0 ? (
        <p className="flex items-center gap-2 text-sm text-cos-muted">
          <Check className="h-4 w-4 text-cos-success" aria-hidden />
          Nothing waiting on you.
        </p>
      ) : (
        <div className="flex h-full flex-col">
          <ul className="space-y-3">
            {visible.map((item) => (
              <li key={item.id}>
                <Link
                  href={`/events/${item.eventId}?tab=approvals`}
                  className="flex items-start gap-3 rounded-xl transition-colors hover:bg-cos-card/70"
                >
                  <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cos-card text-cos-muted ring-1 ring-black/[0.04]">
                    <ClipboardList className="h-3.5 w-3.5" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-cos-text">
                      {item.preview.milestoneTitle?.trim() ||
                        CHANNEL_LABELS[item.channel] ||
                        "Approval"}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-cos-muted">
                      {item.eventTitle}
                    </span>
                  </span>
                  <span className="shrink-0 text-[11px] text-cos-muted">
                    {formatShortDate(item.requestedAt)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <Link
            href="/approvals"
            className="mt-4 text-xs font-medium text-cos-muted transition-colors hover:text-cos-text"
          >
            View all ({items.length}) →
          </Link>
        </div>
      )}
    </DashboardWidgetCard>
  );
}

function formatShortDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
