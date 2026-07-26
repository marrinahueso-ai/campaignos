"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import {
  EventsEaseAheadCard,
  EventsEaseEmpty,
  EventsEaseFocusCard,
  EventsEaseMonthGlance,
  EventsEaseQueueRow,
  EventsEaseSuiteStrip,
  easeLensToSummary,
  type EventsEaseLens,
  type EventsHomeResponsiblePerson,
} from "@/components/events-phase3/EventsEaseList";
import {
  EVENTS_HOME_DEFAULT_SUMMARY,
  buildEventsHomeMonthFilterOptions,
  countEventsHomeSummary,
  matchesEventsHomeMonth,
  matchesEventsHomeSummary,
  type EventsHomeMonthFilter,
} from "@/lib/events/events-home-summary";
import type { EventsHomeLayout } from "@/lib/events/events-home-layout";
import type { HeroArtworkSelection } from "@/lib/event-workspace/select-hero-artwork";
import { normalizeDateOnly } from "@/lib/utils/dates";
import type { Event } from "@/types";
import { cn } from "@/lib/utils/cn";

export type { EventsHomeResponsiblePerson };

interface EventsHomeContentProps {
  events: Event[];
  today: string;
  artworkByEventId: Record<string, HeroArtworkSelection | null>;
  responsibleByEventId: Record<string, EventsHomeResponsiblePerson>;
  playbookNameByEventId?: Record<string, string | null>;
  schoolYears?: Array<{ id: string; label: string }>;
  activeSchoolYearId?: string | null;
  /** Kept for page compatibility; KPI card layout is unused in ease UI. */
  initialSummaryLayout: EventsHomeLayout;
}

const PULSE_TABS: Array<{ id: EventsEaseLens; label: string }> = [
  { id: "upcoming", label: "Upcoming" },
  { id: "needs_setup", label: "Needs setup" },
  { id: "ready_to_run", label: "Ready" },
  { id: "needs_follow_up", label: "Follow-up" },
  { id: "done", label: "Done" },
  { id: "month", label: "Month" },
  { id: "all", label: "All" },
];

function defaultLensFromSummary(): EventsEaseLens {
  if (EVENTS_HOME_DEFAULT_SUMMARY === "next_60_days") return "upcoming";
  return "upcoming";
}

export function EventsHomeContent({
  events,
  today,
  artworkByEventId,
  responsibleByEventId,
  schoolYears = [],
  activeSchoolYearId = null,
}: EventsHomeContentProps) {
  const [search, setSearch] = useState("");
  const [lens, setLens] = useState<EventsEaseLens>(defaultLensFromSummary);
  const [schoolYearFilter, setSchoolYearFilter] = useState<string>(
    activeSchoolYearId ?? "all",
  );
  const [allMonthFilter, setAllMonthFilter] =
    useState<EventsHomeMonthFilter>("all");
  const [focusId, setFocusId] = useState<string | null>(null);
  const [monthViewKey, setMonthViewKey] = useState(() =>
    normalizeDateOnly(today).slice(0, 7),
  );

  const eventsForCounts = useMemo(() => {
    if (schoolYearFilter === "all") return events;
    return events.filter((event) => event.schoolYearId === schoolYearFilter);
  }, [events, schoolYearFilter]);

  const summaryCounts = useMemo(
    () => countEventsHomeSummary(eventsForCounts, today),
    [eventsForCounts, today],
  );

  const monthOptions = useMemo(() => {
    const options = buildEventsHomeMonthFilterOptions(eventsForCounts, today);
    // Prefer concrete YYYY-MM options for All; keep this/next for convenience.
    return options;
  }, [eventsForCounts, today]);

  const searched = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return eventsForCounts.filter((event) => {
      if (!needle) return true;
      const responsible = responsibleByEventId[event.id];
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
  }, [eventsForCounts, search, responsibleByEventId]);

  const lensEvents = useMemo(() => {
    if (lens === "month") return searched;
    const summary = easeLensToSummary(lens);
    let next = searched.filter((event) =>
      matchesEventsHomeSummary(event, summary, today),
    );
    if (lens === "all" && allMonthFilter !== "all") {
      next = next.filter((event) =>
        matchesEventsHomeMonth(event, allMonthFilter, today),
      );
    }
    return [...next].sort((a, b) => a.date.localeCompare(b.date));
  }, [searched, lens, today, allMonthFilter]);

  const upcomingSorted = useMemo(
    () =>
      [...searched]
        .filter((event) =>
          matchesEventsHomeSummary(event, "next_60_days", today),
        )
        .sort((a, b) => a.date.localeCompare(b.date)),
    [searched, today],
  );

  useEffect(() => {
    setFocusId(null);
  }, [lens, search, schoolYearFilter]);

  const focusEvent =
    lens === "upcoming"
      ? (upcomingSorted.find((event) => event.id === focusId) ??
        upcomingSorted[0] ??
        null)
      : null;
  const aheadEvents =
    lens === "upcoming" && focusEvent
      ? upcomingSorted.filter((event) => event.id !== focusEvent.id).slice(0, 3)
      : [];
  const queueEvents =
    lens === "upcoming" && focusEvent
      ? upcomingSorted
          .filter((event) => event.id !== focusEvent.id)
          .slice(aheadEvents.length)
      : lens === "month"
        ? []
        : lensEvents;

  const pulseCounts = {
    upcoming: summaryCounts.next_60_days,
    needs_setup: summaryCounts.needs_setup,
    ready_to_run: summaryCounts.ready_to_run,
    needs_follow_up: summaryCounts.needs_follow_up,
    done: summaryCounts.done,
    month: eventsForCounts.length,
    all: eventsForCounts.length,
  };

  const emptyCopy: Record<
    Exclude<EventsEaseLens, "month">,
    { title: string; body: string }
  > = {
    upcoming: {
      title: "Nothing in the next 60 days",
      body: "When you add or schedule events ahead, they show up here so you can see the season coming.",
    },
    needs_setup: {
      title: "No drafts need setup",
      body: "Draft events that still need polish land here.",
    },
    ready_to_run: {
      title: "Nothing ready to run",
      body: "Scheduled events still ahead appear in Ready.",
    },
    needs_follow_up: {
      title: "No follow-ups waiting",
      body: "Past events that aren’t published yet show up here.",
    },
    done: {
      title: "Nothing published yet",
      body: "Published events collect here when you’re done.",
    },
    all: {
      title: events.length === 0 ? "No events yet" : "No matches",
      body:
        events.length === 0
          ? "Create an event, or start from Create with AI."
          : "Try a different search or month filter.",
    },
  };

  function personFor(eventId: string): EventsHomeResponsiblePerson {
    return (
      responsibleByEventId[eventId] ?? {
        displayName: "Unassigned",
        organizationTitle: null,
      }
    );
  }

  return (
    <div className="studio-page relative space-y-8 pb-12 before:pointer-events-none before:absolute before:top-0 before:left-[-2rem] before:h-60 before:w-60 before:rounded-full before:bg-[radial-gradient(circle,rgba(107,129,113,0.12),transparent_70%)] before:content-[''] after:pointer-events-none after:absolute after:top-10 after:right-0 after:h-52 after:w-52 after:rounded-full after:bg-[radial-gradient(circle,rgba(196,146,46,0.1),transparent_70%)] after:content-['']">
      <header className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-4xl tracking-[-0.02em] text-cos-text sm:text-5xl">
            Events
          </h1>
          <p className="mt-3 max-w-xl text-base leading-relaxed text-cos-muted">
            See what&apos;s coming — then open an event or make something with
            AI. Same calm studio feel as Create with AI.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/create-with-ai"
            className="inline-flex items-center rounded-full bg-[#2f4a3c] px-[18px] py-[11px] text-[13px] font-bold text-[#f6f2eb] shadow-[0_0_0_3px_rgba(47,74,60,0.12)] transition hover:-translate-y-px hover:bg-[#243c30]"
          >
            Create with AI
          </Link>
          <Link
            href="/events/create"
            className="inline-flex items-center rounded-full border-[1.5px] border-cos-border bg-cos-card px-[18px] py-[11px] text-[13px] font-bold text-cos-text transition hover:-translate-y-px"
          >
            New event
          </Link>
        </div>
      </header>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div
          className="flex flex-wrap items-center gap-2"
          role="tablist"
          aria-label="Event lenses"
        >
          {PULSE_TABS.map((tab) => {
            const active = lens === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setLens(tab.id)}
                className={cn(
                  "rounded-full px-3.5 py-2 text-[13px] font-bold transition",
                  active
                    ? "bg-cos-card text-cos-text shadow-[0_8px_28px_rgba(28,36,48,0.06)] ring-1 ring-cos-border"
                    : "text-cos-muted hover:bg-[rgba(255,252,247,0.7)] hover:text-cos-text",
                  active && tab.id === "upcoming"
                    ? "shadow-[0_0_0_3px_rgba(47,74,60,0.12)]"
                    : null,
                )}
              >
                {tab.label}
                {tab.id !== "month" ? (
                  <span
                    className={cn(
                      "ml-1.5 inline-block min-w-[1.25em] tabular-nums",
                      active ? "text-[#2f4a3c]" : "text-cos-muted",
                    )}
                  >
                    {pulseCounts[tab.id]}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
          {schoolYears.length > 1 ? (
            <select
              value={schoolYearFilter}
              onChange={(event) => setSchoolYearFilter(event.target.value)}
              aria-label="School year"
              className="h-9 rounded-full border border-cos-border bg-cos-card px-3 text-[13px] font-bold text-cos-text outline-none"
            >
              <option value="all">All years</option>
              {schoolYears.map((year) => (
                <option key={year.id} value={year.id}>
                  {year.label}
                </option>
              ))}
            </select>
          ) : null}
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-cos-muted" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search events…"
              className="h-9 w-full min-w-[180px] rounded-full border border-cos-border bg-cos-card pr-3 pl-9 text-[13px] text-cos-text outline-none focus:border-cos-dark sm:w-[220px]"
              aria-label="Search events"
            />
          </div>
          <Link
            href="/calendar"
            className="px-2.5 py-2 text-[13px] font-bold text-cos-muted hover:text-cos-text"
          >
            Full calendar →
          </Link>
        </div>
      </div>

      {lens === "month" ? (
        <section className="space-y-3">
          <p className="text-[11px] font-extrabold tracking-[0.08em] text-cos-muted uppercase">
            Month at a glance
          </p>
          <EventsEaseMonthGlance
            events={searched}
            today={today}
            viewMonthKey={monthViewKey}
            onViewMonthKeyChange={setMonthViewKey}
          />
        </section>
      ) : lens === "upcoming" ? (
        upcomingSorted.length === 0 ? (
          <EventsEaseEmpty
            title={emptyCopy.upcoming.title}
            body={emptyCopy.upcoming.body}
          />
        ) : (
          <div className="space-y-9">
            <section className="space-y-3">
              <p className="flex flex-wrap items-baseline justify-between gap-2 text-[11px] font-extrabold tracking-[0.08em] text-cos-muted uppercase">
                <span>Coming up · next 60 days</span>
                <span className="font-semibold tracking-normal normal-case">
                  See the season ahead
                </span>
              </p>
              <div className="grid gap-3.5 lg:grid-cols-[minmax(0,1.35fr)_minmax(240px,0.85fr)]">
                {focusEvent ? (
                  <EventsEaseFocusCard
                    key={focusEvent.id}
                    event={focusEvent}
                    today={today}
                    artwork={artworkByEventId[focusEvent.id] ?? null}
                    responsible={personFor(focusEvent.id)}
                  />
                ) : null}
                {aheadEvents.length > 0 ? (
                  <div className="flex flex-col gap-2.5">
                    {aheadEvents.map((event) => (
                      <EventsEaseAheadCard
                        key={event.id}
                        event={event}
                        today={today}
                        artwork={artworkByEventId[event.id] ?? null}
                        onSelect={() => setFocusId(event.id)}
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            </section>

            {queueEvents.length > 0 ? (
              <section className="space-y-3">
                <p className="text-[11px] font-extrabold tracking-[0.08em] text-cos-muted uppercase">
                  Also ahead · {queueEvents.length} more
                </p>
                <div className="flex flex-col gap-2">
                  {queueEvents.map((event) => (
                    <EventsEaseQueueRow
                      key={event.id}
                      event={event}
                      today={today}
                      artwork={artworkByEventId[event.id] ?? null}
                      responsible={personFor(event.id)}
                    />
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        )
      ) : (
        <section className="space-y-3">
          {lens === "all" ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-[11px] font-extrabold tracking-[0.08em] text-cos-muted uppercase">
                All events
              </p>
              <div className="flex flex-wrap items-center gap-2.5">
                <select
                  value={allMonthFilter}
                  onChange={(event) =>
                    setAllMonthFilter(event.target.value as EventsHomeMonthFilter)
                  }
                  aria-label="Filter by month and year"
                  className="h-9 appearance-none rounded-full border border-cos-border bg-cos-card bg-[length:12px] bg-[position:right_14px_center] bg-no-repeat px-3.5 pr-9 text-[13px] font-bold text-cos-text shadow-[0_8px_28px_rgba(28,36,48,0.06)] outline-none"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='none' stroke='%237a7166' stroke-width='1.8'%3E%3Cpath d='M2 4l4 4 4-4'/%3E%3C/svg%3E")`,
                  }}
                >
                  {monthOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.value === "all"
                        ? "All months"
                        : option.label}
                    </option>
                  ))}
                </select>
                <span className="text-xs font-semibold text-cos-muted">
                  {lensEvents.length === 1
                    ? "Showing 1"
                    : `Showing ${lensEvents.length}`}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-[11px] font-extrabold tracking-[0.08em] text-cos-muted uppercase">
              {PULSE_TABS.find((tab) => tab.id === lens)?.label}
            </p>
          )}

          {lensEvents.length === 0 ? (
            <EventsEaseEmpty
              title={emptyCopy[lens].title}
              body={emptyCopy[lens].body}
            />
          ) : (
            <div className="flex flex-col gap-2">
              {lensEvents.map((event) => (
                <EventsEaseQueueRow
                  key={event.id}
                  event={event}
                  today={today}
                  artwork={artworkByEventId[event.id] ?? null}
                  responsible={personFor(event.id)}
                />
              ))}
            </div>
          )}
        </section>
      )}

      <EventsEaseSuiteStrip />
    </div>
  );
}
