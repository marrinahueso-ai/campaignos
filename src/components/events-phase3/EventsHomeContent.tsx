"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  LayoutList,
  Plus,
  Search,
} from "lucide-react";
import {
  EventsHomeArtwork,
  EventsUpcomingSection,
} from "@/components/events-phase3/EventsUpcomingSection";
import { EventStatusBadge } from "@/components/events/EventStatusBadge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  CAMPAIGNS_PAGE_SIZE,
  getUpcomingCampaignEvents,
  paginateCampaignEvents,
  totalCampaignPages,
} from "@/lib/events/campaign-page-filters";
import {
  EVENTS_HOME_SUMMARY_CARDS,
  EVENTS_HOME_SUMMARY_OVERLAP_NOTE,
  buildEventsHomeMonthFilterOptions,
  countEventsHomeSummary,
  matchesEventsHomeMonth,
  matchesEventsHomeSummary,
  type EventsHomeMonthFilter,
  type EventsHomeSummaryKey,
} from "@/lib/events/events-home-summary";
import { resolveEventsHomeListArtwork } from "@/lib/events/resolve-events-home-list-artwork";
import { EVENT_TYPE_LABELS } from "@/lib/playbooks/constants";
import { formatEventDate, formatEventTime } from "@/lib/utils/dates";
import type { HeroArtworkSelection } from "@/lib/event-workspace/select-hero-artwork";
import type { Event } from "@/types";
import { cn } from "@/lib/utils/cn";

export type EventsHomeResponsiblePerson = {
  displayName: string;
  organizationTitle: string | null;
};

interface EventsHomeContentProps {
  events: Event[];
  today: string;
  /** Exact eventId → artwork from getEventArtworkMap / selectHeroArtwork */
  artworkByEventId: Record<string, HeroArtworkSelection | null>;
  responsibleByEventId: Record<string, EventsHomeResponsiblePerson>;
  playbookNameByEventId?: Record<string, string | null>;
  schoolYears?: Array<{ id: string; label: string }>;
  activeSchoolYearId?: string | null;
}

export function EventsHomeContent({
  events,
  today,
  artworkByEventId,
  responsibleByEventId,
  playbookNameByEventId = {},
  schoolYears = [],
  activeSchoolYearId = null,
}: EventsHomeContentProps) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | Event["status"]>("all");
  const [summary, setSummary] = useState<EventsHomeSummaryKey | "all">("all");
  const [monthFilter, setMonthFilter] = useState<EventsHomeMonthFilter>("all");
  const [responsibleFilter, setResponsibleFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [schoolYearFilter, setSchoolYearFilter] = useState<string>(
    activeSchoolYearId ?? "all",
  );
  const [page, setPage] = useState(1);

  const summaryCounts = useMemo(
    () => countEventsHomeSummary(events, today),
    [events, today],
  );

  const monthOptions = useMemo(
    () => buildEventsHomeMonthFilterOptions(events, today),
    [events, today],
  );

  const responsibleOptions = useMemo(() => {
    const names = new Set<string>();
    for (const value of Object.values(responsibleByEventId)) {
      if (value.displayName && value.displayName !== "Not assigned") {
        names.add(value.displayName);
      }
    }
    return [...names].sort((a, b) => a.localeCompare(b));
  }, [responsibleByEventId]);

  const typeOptions = useMemo(() => {
    const types = new Set<string>();
    for (const event of events) {
      if (event.eventType) {
        types.add(event.eventType);
      }
    }
    return [...types].sort();
  }, [events]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return events.filter((event) => {
      if (
        schoolYearFilter !== "all" &&
        event.schoolYearId !== schoolYearFilter
      ) {
        return false;
      }
      if (status !== "all" && event.status !== status) {
        return false;
      }
      if (!matchesEventsHomeSummary(event, summary, today)) {
        return false;
      }
      if (!matchesEventsHomeMonth(event, monthFilter, today)) {
        return false;
      }
      if (typeFilter !== "all" && event.eventType !== typeFilter) {
        return false;
      }
      const responsible = responsibleByEventId[event.id];
      if (
        responsibleFilter !== "all" &&
        responsible?.displayName !== responsibleFilter
      ) {
        return false;
      }
      if (!needle) {
        return true;
      }
      const haystack = [
        event.title,
        event.description,
        event.location,
        event.eventType,
        responsible?.displayName,
        responsible?.organizationTitle,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [
    events,
    search,
    status,
    summary,
    monthFilter,
    today,
    typeFilter,
    responsibleFilter,
    responsibleByEventId,
    schoolYearFilter,
  ]);

  const upcomingEvents = useMemo(
    () => getUpcomingCampaignEvents(filtered, today),
    [filtered, today],
  );

  const pageCount = totalCampaignPages(filtered.length, CAMPAIGNS_PAGE_SIZE);
  const currentPage = Math.min(page, pageCount);
  const paginatedEvents = paginateCampaignEvents(
    filtered,
    currentPage,
    CAMPAIGNS_PAGE_SIZE,
  );
  const rangeStart =
    filtered.length === 0 ? 0 : (currentPage - 1) * CAMPAIGNS_PAGE_SIZE + 1;
  const rangeEnd = Math.min(
    currentPage * CAMPAIGNS_PAGE_SIZE,
    filtered.length,
  );

  function resetPage() {
    setPage(1);
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="font-display text-4xl text-cos-text sm:text-5xl">
            Events
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-cos-muted sm:text-base">
            View all events, their status, and who is responsible for each.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button href="/events/create">
            <Plus className="h-4 w-4" />
            Create Event
          </Button>
        </div>
      </header>

      <div className="space-y-2">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {EVENTS_HOME_SUMMARY_CARDS.map((card) => {
            const selected = summary === card.key;
            return (
              <button
                key={card.key}
                type="button"
                onClick={() => {
                  setSummary((current) =>
                    current === card.key ? "all" : card.key,
                  );
                  resetPage();
                }}
                className={cn(
                  "flex min-h-[6rem] flex-col items-center justify-center gap-1.5 rounded-2xl px-4 py-5 text-center transition-all duration-200",
                  selected
                    ? "bg-cos-dark text-white shadow-[0_12px_28px_rgba(42,38,34,0.22)] ring-1 ring-cos-dark"
                    : "bg-cos-bg-alt text-cos-text shadow-[0_1px_0_rgba(255,252,247,0.9)_inset,0_2px_4px_rgba(42,38,34,0.06),0_10px_22px_rgba(42,38,34,0.08)] ring-1 ring-black/[0.04] hover:-translate-y-0.5 hover:shadow-[0_1px_0_rgba(255,252,247,0.95)_inset,0_6px_12px_rgba(42,38,34,0.08),0_16px_32px_rgba(42,38,34,0.1)]",
                )}
              >
                <p
                  className={cn(
                    "text-xs font-medium tracking-wide uppercase",
                    selected ? "text-white/70" : "text-cos-muted",
                  )}
                >
                  {card.label}
                </p>
                <p
                  className={cn(
                    "font-display text-3xl leading-none tabular-nums",
                    selected ? "text-white" : "text-cos-text",
                  )}
                >
                  {summaryCounts[card.key]}
                </p>
              </button>
            );
          })}
        </div>
        <p className="text-xs text-cos-muted">{EVENTS_HOME_SUMMARY_OVERLAP_NOTE}</p>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-cos-border bg-cos-card p-3 lg:flex-row lg:flex-wrap lg:items-center">
        <div className="relative min-w-0 flex-1 basis-[14rem]">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-cos-muted" />
          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              resetPage();
            }}
            placeholder="Search events..."
            className="w-full rounded-lg border border-cos-border bg-white py-2 pr-3 pl-9 text-sm text-cos-text outline-none focus:border-cos-primary"
          />
        </div>
        <select
          value={status}
          onChange={(event) => {
            setStatus(event.target.value as "all" | Event["status"]);
            resetPage();
          }}
          className="rounded-lg border border-cos-border bg-white px-3 py-2 text-sm"
          aria-label="Filter by status"
        >
          <option value="all">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="scheduled">Scheduled</option>
          <option value="published">Published</option>
        </select>
        <select
          value={monthFilter}
          onChange={(event) => {
            setMonthFilter(event.target.value);
            resetPage();
          }}
          className="rounded-lg border border-cos-border bg-white px-3 py-2 text-sm"
          aria-label="Filter by month or date"
        >
          {monthOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <select
          value={typeFilter}
          onChange={(event) => {
            setTypeFilter(event.target.value);
            resetPage();
          }}
          className="rounded-lg border border-cos-border bg-white px-3 py-2 text-sm"
          aria-label="Filter by category"
        >
          <option value="all">All Categories</option>
          {typeOptions.map((type) => (
            <option key={type} value={type}>
              {EVENT_TYPE_LABELS[type as keyof typeof EVENT_TYPE_LABELS] ?? type}
            </option>
          ))}
        </select>
        <select
          value={responsibleFilter}
          onChange={(event) => {
            setResponsibleFilter(event.target.value);
            resetPage();
          }}
          className="rounded-lg border border-cos-border bg-white px-3 py-2 text-sm"
          aria-label="Filter by responsible person"
        >
          <option value="all">All Responsible People</option>
          {responsibleOptions.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        {schoolYears.length > 1 ? (
          <select
            value={schoolYearFilter}
            onChange={(event) => {
              setSchoolYearFilter(event.target.value);
              resetPage();
            }}
            className="rounded-lg border border-cos-border bg-white px-3 py-2 text-sm"
            aria-label="Filter by school year"
          >
            <option value="all">All school years</option>
            {schoolYears.map((year) => (
              <option key={year.id} value={year.id}>
                {year.label}
              </option>
            ))}
          </select>
        ) : null}
        <div className="flex rounded-lg border border-cos-border p-0.5">
          <span className="inline-flex items-center gap-1 rounded-md bg-cos-bg px-3 py-1.5 text-xs font-medium text-cos-text">
            <LayoutList className="h-3.5 w-3.5" />
            List
          </span>
          <Link
            href="/calendar"
            className="inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium text-cos-muted hover:text-cos-text"
          >
            <CalendarDays className="h-3.5 w-3.5" />
            Calendar
          </Link>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No events match"
          description="Try clearing filters, or create a new event."
          action={{ label: "Create Event", href: "/events/create" }}
        />
      ) : (
        <>
          <EventsUpcomingSection
            events={upcomingEvents}
            artworkByEventId={artworkByEventId}
            responsibleByEventId={responsibleByEventId}
          />

          <section className="space-y-4">
            <h2 className="font-display text-2xl text-cos-text">All Events</h2>
            <div className="space-y-3">
              {paginatedEvents.map((event) => {
                const responsible = responsibleByEventId[event.id] ?? {
                  displayName: "Not assigned",
                  organizationTitle: null,
                };
                const playbookName = playbookNameByEventId[event.id];
                const typeLabel = event.eventType
                  ? (EVENT_TYPE_LABELS[event.eventType] ?? event.eventType)
                  : event.category;
                return (
                  <div
                    key={event.id}
                    className="flex flex-col gap-4 rounded-xl border border-cos-border bg-cos-card p-3 sm:flex-row sm:items-center sm:gap-4 sm:p-3.5"
                  >
                    <EventsHomeArtwork
                      artwork={resolveEventsHomeListArtwork(
                        event,
                        artworkByEventId[event.id],
                      )}
                      eventTitle={event.title}
                      size="row"
                    />
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/events/${event.id}`}
                          className="truncate font-semibold text-cos-text hover:text-cos-primary"
                        >
                          {event.title}
                        </Link>
                        {typeLabel ? (
                          <span className="rounded-full bg-cos-bg px-2 py-0.5 text-[11px] text-cos-muted">
                            {typeLabel}
                          </span>
                        ) : null}
                        {playbookName ? (
                          <span className="rounded-full border border-cos-border px-2 py-0.5 text-[11px] text-cos-muted">
                            {playbookName}
                          </span>
                        ) : null}
                      </div>
                      <p className="text-sm text-cos-muted">
                        {formatEventDate(event.date)}
                        {event.time ? ` · ${formatEventTime(event.time)}` : ""}
                      </p>
                    </div>
                    <EventStatusBadge status={event.status} />
                    <div className="min-w-[140px]">
                      <p className="text-sm font-medium text-cos-text">
                        {responsible.displayName}
                      </p>
                      {responsible.organizationTitle ? (
                        <p className="text-xs text-cos-muted">
                          {responsible.organizationTitle}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        href={`/events/${event.id}`}
                        variant="secondary"
                        size="sm"
                      >
                        View Details
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-cos-muted">
                Showing {rangeStart}–{rangeEnd} of {filtered.length}{" "}
                {filtered.length === 1 ? "event" : "events"}
              </p>
              <div className="inline-flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                  disabled={currentPage <= 1}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-cos-border bg-cos-card text-cos-muted disabled:opacity-40"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                {Array.from({ length: pageCount }, (_, index) => index + 1)
                  .filter((pageNumber) => {
                    if (pageCount <= 5) return true;
                    if (pageNumber === 1 || pageNumber === pageCount) return true;
                    return Math.abs(pageNumber - currentPage) <= 1;
                  })
                  .map((pageNumber, index, visible) => {
                    const prev = visible[index - 1];
                    const showEllipsis =
                      prev !== undefined && pageNumber - prev > 1;
                    return (
                      <span
                        key={pageNumber}
                        className="inline-flex items-center gap-1"
                      >
                        {showEllipsis ? (
                          <span className="px-1 text-xs text-cos-muted">…</span>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => setPage(pageNumber)}
                          className={cn(
                            "flex h-8 min-w-8 items-center justify-center rounded-lg border text-xs font-medium",
                            pageNumber === currentPage
                              ? "border-cos-accent bg-cos-bg-alt text-cos-text"
                              : "border-cos-border bg-cos-card text-cos-muted hover:text-cos-text",
                          )}
                        >
                          {pageNumber}
                        </button>
                      </span>
                    );
                  })}
                <button
                  type="button"
                  onClick={() =>
                    setPage((value) => Math.min(pageCount, value + 1))
                  }
                  disabled={currentPage >= pageCount}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-cos-border bg-cos-card text-cos-muted disabled:opacity-40"
                  aria-label="Next page"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

/** Kept exported so fallback/legacy imports stay discoverable in tests. */
export const EVENTS_HOME_FALLBACK_NOTE =
  "CampaignsPageContent remains available when NEXT_PUBLIC_EVENTS_PHASE3_UI=false";
