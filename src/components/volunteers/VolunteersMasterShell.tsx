"use client";

import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  RefreshCw,
  Search,
  UserPlus,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import { eventVolunteersHref } from "@/lib/events/event-responsibility";
import {
  filterVolunteersMasterEvents,
  getVolunteerFillRateBand,
  getVolunteerFillRateLabel,
  type VolunteerFillRateBand,
  type VolunteersMasterEventRow,
  type VolunteersMasterFilter,
  type VolunteersMasterPageData,
  type VolunteersMasterUnderfilledRole,
} from "@/lib/event-volunteers/org-master-shared";
import { formatDateTime, formatLocalDate } from "@/lib/utils/dates";
import { cn } from "@/lib/utils/cn";

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

interface VolunteersMasterShellProps {
  data: VolunteersMasterPageData;
}

const FILTER_CHIPS: Array<{ id: VolunteersMasterFilter; label: string }> = [
  { id: "upcoming", label: "Upcoming" },
  { id: "needs_people", label: "Needs people" },
  { id: "covered", label: "Covered" },
  { id: "all", label: "All" },
];

type KpiCardKey =
  | "total_volunteers"
  | "fill_rate"
  | "underfilled"
  | "upcoming";

function formatEventDateLabel(date: string): string {
  return formatLocalDate(date, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function eventInitials(title: string): string {
  const parts = title.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

function toggleFilter(
  current: VolunteersMasterFilter,
  next: VolunteersMasterFilter,
): VolunteersMasterFilter {
  return current === next ? "all" : next;
}

export function VolunteersMasterShell({ data }: VolunteersMasterShellProps) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<VolunteersMasterFilter>("upcoming");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filteredEvents = useMemo(
    () => filterVolunteersMasterEvents(data.events, { filter, search }),
    [data.events, filter, search],
  );

  const activeKpi: KpiCardKey | null =
    filter === "upcoming"
      ? "upcoming"
      : filter === "needs_people" || filter === "underfilled"
        ? "underfilled"
        : filter === "covered"
          ? "fill_rate"
          : filter === "all"
            ? "total_volunteers"
            : null;

  return (
    <div className="studio-page space-y-6 pb-12">
      <div>
        <h1 className="font-display text-4xl text-cos-text">Volunteer Master</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-cos-muted">
          Org-wide volunteer fill rates and underfilled roles. Aggregate counts
          only — no volunteer personal data.
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-3">
        <KpiCard
          icon={Users}
          label="Total Volunteers"
          value={String(data.kpis.totalVolunteers)}
          description="Across all upcoming events."
          active={activeKpi === "total_volunteers"}
          onClick={() => setFilter("all")}
        />
        <KpiCard
          icon={CheckCircle2}
          label="Overall Fill Rate"
          value={
            data.kpis.overallFillRatePercent === null
              ? "—"
              : `${data.kpis.overallFillRatePercent}%`
          }
          description="All roles."
          active={activeKpi === "fill_rate"}
          onClick={() => setFilter(toggleFilter(filter, "covered"))}
        />
        <KpiCard
          icon={UserPlus}
          label="Underfilled Roles"
          value={String(data.kpis.underfilledRoleCount)}
          description={
            data.kpis.underfilledEventCount === 0
              ? "None right now."
              : `Across ${data.kpis.underfilledEventCount} event${
                  data.kpis.underfilledEventCount === 1 ? "" : "s"
                }.`
          }
          active={activeKpi === "underfilled"}
          onClick={() => setFilter(toggleFilter(filter, "needs_people"))}
        />
        <KpiCard
          icon={CalendarDays}
          label="Upcoming Events"
          value={String(data.kpis.upcomingEventCount)}
          description="Next 60 days."
          active={activeKpi === "upcoming"}
          onClick={() => setFilter(toggleFilter(filter, "upcoming"))}
        />
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cos-muted" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search events or roles…"
            className="h-10 w-full rounded-xl border border-cos-border bg-cos-card pl-9 pr-3 text-sm text-cos-text outline-none focus:border-cos-dark"
            aria-label="Search events or roles"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {FILTER_CHIPS.map((chip) => {
            const isActive =
              chip.id === "needs_people"
                ? filter === "needs_people" || filter === "underfilled"
                : filter === chip.id;
            return (
              <button
                key={chip.id}
                type="button"
                onClick={() => setFilter(chip.id)}
                aria-pressed={isActive}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                  isActive
                    ? "bg-cos-dark text-white"
                    : "bg-cos-bg-alt text-cos-muted ring-1 ring-black/[0.04] hover:text-cos-text",
                )}
              >
                {chip.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <section className="min-w-0 rounded-2xl bg-cos-card p-5 shadow-[0_1px_0_rgba(255,252,247,0.9)_inset,0_2px_4px_rgba(42,38,34,0.06),0_10px_22px_rgba(42,38,34,0.08)] ring-1 ring-black/[0.04]">
          <div className="mb-4 flex items-baseline justify-between gap-3">
            <h2 className="font-display text-2xl text-cos-text">
              Upcoming Events
            </h2>
            <span className="text-xs text-cos-muted">
              {filteredEvents.length} shown
            </span>
          </div>

          {filteredEvents.length === 0 ? (
            <EmptyEventsState hasAny={data.events.length > 0} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[40rem] border-collapse text-left">
                <thead>
                  <tr className="border-b border-cos-border text-[11px] font-semibold uppercase tracking-wide text-cos-muted">
                    <th className="pb-3 pr-3 font-semibold">Event &amp; Date</th>
                    <th className="pb-3 pr-3 font-semibold">Fill Rate</th>
                    <th className="pb-3 pr-3 font-semibold">
                      Top Roles (by volunteers)
                    </th>
                    <th className="w-10 pb-3" />
                  </tr>
                </thead>
                <tbody>
                  {filteredEvents.map((event) => (
                    <EventTableRow
                      key={event.id}
                      event={event}
                      expanded={expandedId === event.id}
                      onToggle={() =>
                        setExpandedId((current) =>
                          current === event.id ? null : event.id,
                        )
                      }
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <ThisWeekRail
          roles={data.thisWeekUnderfilled}
          onViewAll={() => setFilter("underfilled")}
        />
      </div>

      <footer className="flex items-center justify-center gap-2 pt-2 text-center text-xs text-cos-muted">
        <RefreshCw className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <p>
          Volunteer data is synced from SignUpGenius
          {data.lastSuccessfulSyncAt
            ? `. Last sync: ${formatDateTime(data.lastSuccessfulSyncAt)}.`
            : "."}{" "}
          Sync and connect live on each event&apos;s Volunteers tab.
        </p>
      </footer>
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  description,
  active,
  onClick,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  description: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex min-h-[7rem] w-full max-w-[17.5rem] flex-1 basis-[14rem] flex-col items-center justify-center gap-2 rounded-2xl px-5 py-5 text-center transition-all duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cos-accent focus-visible:ring-offset-2 focus-visible:ring-offset-cos-bg",
        active
          ? "bg-cos-dark text-white shadow-[0_12px_28px_rgba(42,38,34,0.22)] ring-1 ring-cos-dark"
          : "bg-cos-bg-alt text-cos-text shadow-[0_1px_0_rgba(255,252,247,0.9)_inset,0_2px_4px_rgba(42,38,34,0.06),0_10px_22px_rgba(42,38,34,0.08)] ring-1 ring-black/[0.04] hover:-translate-y-0.5 hover:shadow-[0_1px_0_rgba(255,252,247,0.95)_inset,0_6px_12px_rgba(42,38,34,0.08),0_16px_32px_rgba(42,38,34,0.1)]",
      )}
    >
      <div className="flex items-center justify-center gap-2">
        <span
          className={cn(
            "text-xs font-medium tracking-wide uppercase",
            active ? "text-white/70" : "text-cos-muted",
          )}
        >
          {label}
        </span>
        <Icon
          className={cn(
            "h-4 w-4 shrink-0",
            active ? "text-white/80" : "text-cos-muted",
          )}
          aria-hidden
        />
      </div>
      <span
        className={cn(
          "font-display text-3xl leading-none tabular-nums",
          active ? "text-white" : "text-cos-text",
        )}
      >
        {value}
      </span>
      <span className={cn("text-xs", active ? "text-white/70" : "text-cos-muted")}>
        {description}
      </span>
    </button>
  );
}

function EventArtworkAvatar({
  title,
  artworkUrl,
}: {
  title: string;
  artworkUrl: string | null;
}) {
  if (artworkUrl) {
    return (
      <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-cos-accent-soft ring-1 ring-cos-border/60">
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
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cos-accent-soft text-xs font-semibold text-cos-dark ring-1 ring-cos-border/40"
      aria-hidden
    >
      {eventInitials(title)}
    </span>
  );
}

function FillRateCell({ percent }: { percent: number | null }) {
  const fillLabel = percent === null ? "—" : `${percent}%`;
  const fillWidth =
    percent === null ? 0 : Math.max(0, Math.min(100, percent));
  const band = getVolunteerFillRateBand(percent);
  const statusLabel = getVolunteerFillRateLabel(percent);
  const styles = band ? FILL_RATE_BAND_STYLES[band] : null;
  const isFullyStaffed = band === "fully_staffed";

  return (
    <div
      className="min-w-[7rem]"
      title={statusLabel ?? undefined}
      aria-label={
        percent === null
          ? "Fill rate unavailable"
          : `Fill rate ${fillLabel}${statusLabel ? `, ${statusLabel}` : ""}`
      }
    >
      <p
        className={cn(
          "flex items-center gap-1 text-sm font-medium tabular-nums",
          styles?.text ?? "text-cos-muted",
        )}
      >
        {fillLabel}
        {isFullyStaffed ? (
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
        ) : null}
      </p>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-cos-bg-alt">
        <div
          className={cn(
            "h-full rounded-full transition-[width]",
            styles?.bar ?? "bg-cos-border",
          )}
          style={{ width: `${fillWidth}%` }}
        />
      </div>
    </div>
  );
}

function EventTableRow({
  event,
  expanded,
  onToggle,
}: {
  event: VolunteersMasterEventRow;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <tr className="border-b border-cos-border/70 align-middle">
        <td className="py-4 pr-3">
          <div className="flex items-center gap-3">
            <EventArtworkAvatar
              title={event.title}
              artworkUrl={event.artworkUrl}
            />
            <div className="min-w-0">
              <Link
                href={eventVolunteersHref(event.id)}
                className="block truncate font-medium text-cos-text hover:underline"
              >
                {event.title}
              </Link>
              <p className="text-xs text-cos-muted">
                {formatEventDateLabel(event.date)}
              </p>
            </div>
          </div>
        </td>
        <td className="py-4 pr-3">
          <FillRateCell percent={event.fillRatePercent} />
        </td>
        <td className="py-4 pr-3">
          {event.topRoles.length === 0 ? (
            <span className="text-sm text-cos-muted">
              {event.hasSnapshot ? "No filled roles yet" : "No sync data yet"}
            </span>
          ) : (
            <ul className="space-y-0.5 text-sm text-cos-text">
              {event.topRoles.map((role) => (
                <li key={role.name} className="flex items-baseline gap-1.5">
                  <span className="truncate">{role.name}</span>
                  <span className="tabular-nums text-cos-muted">
                    ({role.filledCount})
                  </span>
                </li>
              ))}
            </ul>
          )}
        </td>
        <td className="py-4 text-right">
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={expanded}
            aria-label={expanded ? "Collapse event" : "Expand event"}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-cos-muted transition-colors hover:bg-cos-bg-alt hover:text-cos-text"
          >
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform",
                expanded && "rotate-180",
              )}
            />
          </button>
        </td>
      </tr>
      {expanded ? (
        <tr className="border-b border-cos-border/70 bg-cos-bg/40">
          <td colSpan={4} className="px-4 py-3">
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <Link
                href={eventVolunteersHref(event.id)}
                className="inline-flex items-center gap-1.5 font-medium text-cos-dark hover:underline"
              >
                Open Volunteers tab
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              {event.signupUrl ? (
                <a
                  href={event.signupUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-cos-muted hover:text-cos-text hover:underline"
                >
                  Open signup
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              ) : null}
              {event.underfilledRoleCount > 0 ? (
                <span className="text-cos-muted">
                  {event.underfilledRoleCount} underfilled role
                  {event.underfilledRoleCount === 1 ? "" : "s"}
                  {typeof event.openSpots === "number"
                    ? ` · ${event.openSpots} open spot${event.openSpots === 1 ? "" : "s"}`
                    : ""}
                </span>
              ) : (
                <span className="text-cos-muted">
                  {event.isCovered
                    ? "All roles covered"
                    : "Connect or sync SignUpGenius for fill stats"}
                </span>
              )}
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
}

function ThisWeekRail({
  roles,
  onViewAll,
}: {
  roles: VolunteersMasterUnderfilledRole[];
  onViewAll: () => void;
}) {
  return (
    <aside className="rounded-2xl bg-cos-card p-5 shadow-[0_1px_0_rgba(255,252,247,0.9)_inset,0_2px_4px_rgba(42,38,34,0.06),0_10px_22px_rgba(42,38,34,0.08)] ring-1 ring-black/[0.04]">
      <h2 className="font-display text-2xl text-cos-text">This week</h2>
      <p className="mt-1 text-xs text-cos-muted">Underfilled roles only.</p>

      {roles.length === 0 ? (
        <p className="mt-6 text-sm text-cos-muted">
          No underfilled roles for events this week.
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {roles.map((role) => (
            <li key={`${role.eventId}:${role.roleName}`}>
              <Link
                href={eventVolunteersHref(role.eventId)}
                className="flex items-start gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-cos-bg-alt"
              >
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border border-cos-border bg-cos-bg" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-cos-text">
                    {role.roleName}
                    <span className="font-normal text-cos-muted">
                      {" "}
                      · {role.eventTitle}
                    </span>
                  </span>
                  <span className="mt-0.5 block text-xs text-cos-muted">
                    {formatEventDateLabel(role.eventDate)}
                  </span>
                </span>
                <span className="shrink-0 rounded-md bg-cos-bg-alt px-1.5 py-0.5 text-xs font-medium tabular-nums text-cos-muted">
                  -{role.openSpots}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={onViewAll}
        className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-cos-dark hover:underline"
      >
        View all underfilled roles
        <ArrowRight className="h-3.5 w-3.5" />
      </button>
    </aside>
  );
}

function EmptyEventsState({ hasAny }: { hasAny: boolean }) {
  return (
    <div className="rounded-xl bg-cos-bg/60 px-4 py-10 text-center">
      <p className="text-sm text-cos-muted">
        {hasAny
          ? "No events match this search or filter."
          : "No volunteer events yet. Connect SignUpGenius or add a Volunteer Signup link on an event to see it here."}
      </p>
      {!hasAny ? (
        <Link
          href="/events"
          className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-cos-dark hover:underline"
        >
          Go to Events
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      ) : null}
    </div>
  );
}
