"use client";

import { X } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatPlanningItemForPanel } from "@/components/communications-planning-calendar/PlanningCalendarFilters";
import { getChannelStyles } from "@/lib/communications-calendar/channel-styles";
import { cn } from "@/lib/utils/cn";
import type { PlanningCalendarItem } from "@/types/communications-calendar";

interface PlanningCalendarDetailPanelProps {
  item: (PlanningCalendarItem & { isOverdue?: boolean; isToday?: boolean }) | null;
  onClose: () => void;
}

export function PlanningCalendarDetailPanel({
  item,
  onClose,
}: PlanningCalendarDetailPanelProps) {
  if (!item) return null;

  const { typeLabel, channelLabel } = formatPlanningItemForPanel(item);
  const styles = getChannelStyles(item.channel);

  return (
    <aside className="fixed inset-y-0 right-0 z-40 flex w-full max-w-md flex-col border-l border-cos-border bg-white shadow-2xl">
      <div className="flex items-start justify-between border-b border-cos-border px-5 py-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-cos-accent">
            Communication Detail
          </p>
          <h2 className="mt-1 text-lg font-semibold text-cos-text">{item.title}</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-2 text-cos-dark-muted hover:bg-cos-bg hover:text-cos-muted"
          aria-label="Close detail panel"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
        <DetailRow label="Event" value={item.eventTitle} />
        <DetailRow
          label="Timeline step"
          value={item.timelineStepTitle ?? "Not linked to a step"}
        />
        <DetailRow label="Type" value={typeLabel} />
        <DetailRow
          label="Channel"
          value={
            <span
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-2.5 py-0.5 text-xs font-medium",
                styles.bg,
                styles.border,
                styles.text,
              )}
            >
              <span className={cn("h-2 w-2 rounded-full", styles.dot)} />
              {channelLabel}
            </span>
          }
        />
        <DetailRow
          label="Due date"
          value={
            <span className={cn(item.isOverdue && "font-semibold text-red-600")}>
              {formatDisplayDate(item.scheduledDate)}
              {item.isToday && (
                <Badge variant="info" className="ml-2">
                  Today
                </Badge>
              )}
              {item.isOverdue && (
                <Badge variant="warning" className="ml-2 bg-red-50 text-red-700">
                  Overdue
                </Badge>
              )}
            </span>
          }
        />
        <DetailRow
          label="Assigned user"
          value={item.assignedUser ?? "Unassigned — multi-user coming soon"}
        />
        <DetailRow
          label="Draft status"
          value={item.draftStatus ?? "—"}
        />
        <DetailRow
          label="Artwork status"
          value={item.artworkStatus ?? "—"}
        />
        <DetailRow
          label="Approval status"
          value={item.approvalStatus ?? "—"}
        />
        <DetailRow
          label="Publish status"
          value={item.publishStatus ?? item.status}
        />

        <section className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-cos-muted">
            Generated draft preview
          </p>
          <div className="rounded-xl border border-cos-border bg-cos-bg p-4">
            {item.draftContent ? (
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-cos-text">
                {item.draftContent}
              </p>
            ) : (
              <p className="text-sm text-cos-dark-muted">
                No draft yet. AI-generated drafts will appear here.
              </p>
            )}
            {item.versionNumber && (
              <p className="mt-3 text-xs text-cos-dark-muted">
                Version {item.versionNumber}
              </p>
            )}
          </div>
        </section>

        <section className="rounded-xl border border-dashed border-cos-border bg-cos-accent-soft/40 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-cos-text">
            AI-ready
          </p>
          <ul className="mt-2 space-y-1 text-xs text-cos-text/80">
            <li>AI draft generation</li>
            <li>AI artwork suggestions</li>
            <li>Smart scheduling recommendations</li>
            <li>Approval workflow routing</li>
          </ul>
        </section>
      </div>

      <div className="border-t border-cos-border p-5">
        <Button href={`/events/${item.eventId}`} className="w-full">
          Open event workspace
        </Button>
      </div>
    </aside>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-cos-muted">
        {label}
      </p>
      <div className="mt-1 text-sm text-cos-text">{value}</div>
    </div>
  );
}

function formatDisplayDate(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
