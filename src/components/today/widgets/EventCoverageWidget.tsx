import Link from "next/link";
import { Check, Users } from "lucide-react";
import { DashboardWidgetCard } from "@/components/today/DashboardWidgetCard";
import type {
  DashboardEventCoverageItem,
  DashboardLibraryWidgetData,
} from "@/lib/today/dashboard-library-widget-filters";
import { cn } from "@/lib/utils/cn";

interface EventCoverageWidgetProps {
  items: DashboardLibraryWidgetData["eventCoverage"];
}

export function EventCoverageWidget({ items }: EventCoverageWidgetProps) {
  const visible = items.slice(0, 3);

  return (
    <DashboardWidgetCard icon={Users} title="Event coverage">
      {visible.length === 0 ? (
        <p className="flex items-center gap-2 text-sm text-cos-muted">
          <Check className="h-4 w-4 text-cos-success" aria-hidden />
          All upcoming events have leads.
        </p>
      ) : (
        <div className="flex h-full flex-col">
          <ul className="space-y-2.5">
            {visible.map((item) => (
              <CoverageRow key={item.id} item={item} />
            ))}
          </ul>
          <Link
            href="/settings/team-access"
            className="mt-4 text-xs font-medium text-cos-muted transition-colors hover:text-cos-text"
          >
            Assign leads →
          </Link>
        </div>
      )}
    </DashboardWidgetCard>
  );
}

function CoverageRow({ item }: { item: DashboardEventCoverageItem }) {
  return (
    <li>
      <Link
        href={item.href}
        className="flex items-start justify-between gap-3 rounded-xl bg-cos-card/55 px-3 py-2.5 transition-colors hover:bg-cos-card/80"
      >
        <span className="min-w-0 space-y-1.5">
          <span className="block truncate text-sm font-medium text-cos-text">
            {item.title}
          </span>
          <span className="block truncate text-xs text-cos-muted">
            {formatEventDate(item.date)} · {item.detailLine}
          </span>
          <span className="flex items-center gap-2">
            {item.leadInitials ? (
              <span
                className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-cos-card text-[9px] font-extrabold text-cos-muted ring-1 ring-black/[0.05]"
                title={item.leadName ?? undefined}
              >
                {item.leadInitials}
              </span>
            ) : (
              <span
                className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-dashed border-orange-400/60 bg-orange-50 text-[10px] font-extrabold text-orange-700"
                title="Unassigned"
              >
                ?
              </span>
            )}
            <span
              className={cn(
                "text-[11px] font-bold",
                item.status === "needs_lead"
                  ? "text-orange-700 group-data-[card-tone=dark]/card:text-orange-300"
                  : "text-cos-muted",
              )}
            >
              {item.status === "needs_lead" ? "Needs a lead" : "Needs a co-lead"}
            </span>
          </span>
        </span>
        <span className="shrink-0 text-[11px] font-semibold text-cos-muted">
          {formatDaysUntil(item.daysUntil)}
        </span>
      </Link>
    </li>
  );
}

function formatEventDate(date: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatDaysUntil(days: number): string {
  if (days <= 0) return "Today";
  if (days === 1) return "1 day";
  return `${days} days`;
}
