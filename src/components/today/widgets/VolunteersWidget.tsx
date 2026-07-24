import Link from "next/link";
import { Check, Users } from "lucide-react";
import { DashboardWidgetCard } from "@/components/today/DashboardWidgetCard";
import {
  getVolunteerFillRateBand,
  getVolunteerFillRateLabel,
  type VolunteerFillRateBand,
  type VolunteersMasterEventRow,
} from "@/lib/event-volunteers/org-master-shared";
import { cn } from "@/lib/utils/cn";

interface VolunteersWidgetProps {
  items: VolunteersMasterEventRow[];
}

const FILL_RATE_BAND_STYLES: Record<
  VolunteerFillRateBand,
  { text: string; bar: string }
> = {
  critical: {
    text: "text-cos-error-text",
    bar: "bg-cos-error",
  },
  needs_attention: {
    text: "text-orange-800",
    bar: "bg-orange-500",
  },
  fair_progress: {
    text: "text-amber-800",
    bar: "bg-amber-400",
  },
  healthy: {
    text: "text-cos-success-text",
    bar: "bg-cos-success",
  },
  fully_staffed: {
    text: "text-cos-success-text",
    bar: "bg-cos-success",
  },
};

export function VolunteersWidget({ items }: VolunteersWidgetProps) {
  const visible = items.slice(0, 3);

  return (
    <DashboardWidgetCard icon={Users} title="Volunteers">
      {visible.length === 0 ? (
        <p className="flex items-center gap-2 text-sm text-cos-muted">
          <Check className="h-4 w-4 text-cos-success" aria-hidden />
          All upcoming events are covered.
        </p>
      ) : (
        <div className="flex h-full flex-col">
          <ul className="space-y-3">
            {visible.map((event) => (
              <li key={event.id}>
                <Link
                  href={`/events/${event.id}?tab=volunteers`}
                  className="flex items-start gap-3 rounded-xl transition-colors hover:bg-cos-card/70"
                >
                  <EventArtworkThumb
                    title={event.title}
                    artworkUrl={event.artworkUrl}
                  />
                  <span className="min-w-0 flex-1 space-y-1.5">
                    <span className="flex items-start justify-between gap-2">
                      <span className="min-w-0 truncate text-sm font-medium text-cos-text">
                        {event.title}
                      </span>
                      <span className="shrink-0 text-[11px] text-cos-muted">
                        {formatShortDate(event.date)}
                      </span>
                    </span>
                    <FillRateRow percent={event.fillRatePercent} />
                    <span className="block truncate text-xs text-cos-muted">
                      {openSpotsLabel(event)}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <Link
            href="/volunteers"
            className="mt-4 text-xs font-medium text-cos-muted transition-colors hover:text-cos-text"
          >
            View all ({items.length}) →
          </Link>
        </div>
      )}
    </DashboardWidgetCard>
  );
}

function FillRateRow({ percent }: { percent: number | null }) {
  const fillLabel = percent === null ? "—" : `${percent}%`;
  const fillWidth =
    percent === null ? 0 : Math.max(0, Math.min(100, percent));
  const band = getVolunteerFillRateBand(percent);
  const statusLabel = getVolunteerFillRateLabel(percent);
  const styles = band ? FILL_RATE_BAND_STYLES[band] : null;

  return (
    <span
      className="flex items-center gap-2"
      title={statusLabel ?? undefined}
      aria-label={
        percent === null
          ? "Fill rate unavailable"
          : `Fill rate ${fillLabel}${statusLabel ? `, ${statusLabel}` : ""}`
      }
    >
      <span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-cos-card ring-1 ring-black/[0.04]">
        <span
          className={cn(
            "block h-full rounded-full transition-[width]",
            styles?.bar ?? "bg-cos-border",
          )}
          style={{ width: `${fillWidth}%` }}
        />
      </span>
      <span
        className={cn(
          "shrink-0 text-[11px] font-medium tabular-nums",
          styles?.text ?? "text-cos-muted",
        )}
      >
        {fillLabel}
      </span>
    </span>
  );
}

function EventArtworkThumb({
  title,
  artworkUrl,
}: {
  title: string;
  artworkUrl: string | null;
}) {
  if (artworkUrl) {
    return (
      <span className="mt-0.5 relative h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-cos-card ring-1 ring-black/[0.06]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={artworkUrl}
          alt=""
          className="h-full w-full object-cover object-center"
          loading="lazy"
        />
      </span>
    );
  }

  return (
    <span
      className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cos-card text-cos-muted ring-1 ring-black/[0.04]"
      aria-hidden
      title={title}
    >
      <Users className="h-3.5 w-3.5" />
    </span>
  );
}

function openSpotsLabel(event: VolunteersMasterEventRow): string {
  if (event.openSpots != null && event.openSpots > 0) {
    return event.openSpots === 1
      ? "1 open spot"
      : `${event.openSpots} open spots`;
  }
  if (event.underfilledRoleCount > 0) {
    return event.underfilledRoleCount === 1
      ? "1 role needs people"
      : `${event.underfilledRoleCount} roles need people`;
  }
  return "Needs volunteers";
}

function formatShortDate(date: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}
