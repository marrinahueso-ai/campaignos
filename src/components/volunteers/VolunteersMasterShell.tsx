"use client";

import Link from "next/link";
import { RefreshCw, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  VolunteersEmptyEase,
  VolunteersFocusCard,
  VolunteersQueueRow,
} from "@/components/volunteers/VolunteersEaseList";
import {
  eventMatchesNeedsPeopleFilter,
  eventMatchesVolunteersSearch,
  filterVolunteersMasterEvents,
  type VolunteersMasterFilter,
  type VolunteersMasterPageData,
} from "@/lib/event-volunteers/org-master-shared";
import type { VolunteersMasterLayout } from "@/lib/event-volunteers/volunteers-master-layout";
import { formatDateTime } from "@/lib/utils/dates";
import { cn } from "@/lib/utils/cn";

type EaseFilter = "needs_people" | "upcoming" | "covered" | "all";

interface VolunteersMasterShellProps {
  data: VolunteersMasterPageData;
  /** Kept for page compatibility; KPI card layout is unused in ease UI. */
  initialKpiLayout?: VolunteersMasterLayout;
}

const PULSE_TABS: Array<{ id: EaseFilter; label: string }> = [
  { id: "needs_people", label: "Needs people" },
  { id: "upcoming", label: "Upcoming" },
  { id: "covered", label: "Covered" },
  { id: "all", label: "All" },
];

export function VolunteersMasterShell({
  data,
}: VolunteersMasterShellProps) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<EaseFilter>("needs_people");
  const [focusIndex, setFocusIndex] = useState(0);

  const searchedEvents = useMemo(
    () =>
      data.events.filter((event) =>
        eventMatchesVolunteersSearch(event, search),
      ),
    [data.events, search],
  );

  const pulseCounts = useMemo(() => {
    return {
      needs_people: searchedEvents.filter(eventMatchesNeedsPeopleFilter)
        .length,
      upcoming: searchedEvents.filter((event) => event.isUpcoming60).length,
      covered: searchedEvents.filter((event) => event.isCovered).length,
      all: searchedEvents.length,
    };
  }, [searchedEvents]);

  const filteredEvents = useMemo(
    () =>
      filterVolunteersMasterEvents(data.events, {
        filter: filter as VolunteersMasterFilter,
        search,
      }),
    [data.events, filter, search],
  );

  useEffect(() => {
    setFocusIndex(0);
  }, [filter, search]);

  const showFocus = filter === "needs_people";
  const focusEvent =
    showFocus && filteredEvents.length > 0
      ? filteredEvents[
          Math.min(focusIndex, Math.max(filteredEvents.length - 1, 0))
        ]!
      : null;
  const queueEvents =
    showFocus && focusEvent
      ? filteredEvents.filter((event) => event.id !== focusEvent.id)
      : filteredEvents;

  const emptyCopy: Record<EaseFilter, { title: string; body: string }> = {
    needs_people: {
      title: data.events.some(eventMatchesNeedsPeopleFilter)
        ? "No matches in this search"
        : "Everyone looks covered",
      body: data.events.some(eventMatchesNeedsPeopleFilter)
        ? "Try a different search, or switch to Upcoming to scan all events."
        : "When a role still needs people, the soonest shortfall shows up here with a signup link.",
    },
    upcoming: {
      title: "No upcoming volunteer events",
      body: "Events in the next 60 days with a SignUpGenius page or volunteer signup link appear here.",
    },
    covered: {
      title: "Nothing fully covered yet",
      body: "Events at 100% fill with no open roles land in Covered.",
    },
    all: {
      title: data.events.length > 0 ? "No matches" : "No volunteer events yet",
      body:
        data.events.length > 0
          ? "Try a different search."
          : "Connect a SignUpGenius page or add a volunteer signup link on an event to see it here.",
    },
  };

  const healthParts: string[] = [];
  if (data.kpis.overallFillRatePercent !== null) {
    healthParts.push(`Fill ${data.kpis.overallFillRatePercent}%`);
  }
  if (data.kpis.underfilledRoleCount > 0) {
    healthParts.push(
      `${data.kpis.underfilledRoleCount} open role${
        data.kpis.underfilledRoleCount === 1 ? "" : "s"
      }`,
    );
  } else if (data.kpis.totalVolunteers > 0) {
    healthParts.push(`${data.kpis.totalVolunteers} volunteers signed up`);
  }

  return (
    <div className="studio-page relative space-y-8 pb-12 before:pointer-events-none before:absolute before:top-0 before:left-[-2rem] before:h-60 before:w-60 before:rounded-full before:bg-[radial-gradient(circle,rgba(107,129,113,0.12),transparent_70%)] before:content-[''] after:pointer-events-none after:absolute after:top-10 after:right-0 after:h-52 after:w-52 after:rounded-full after:bg-[radial-gradient(circle,rgba(196,146,46,0.1),transparent_70%)] after:content-['']">
      <header className="relative space-y-6">
        <div>
          <h1 className="font-display text-4xl tracking-[-0.02em] text-cos-text sm:text-5xl">
            Volunteers
          </h1>
          <p className="mt-3 max-w-xl text-base leading-relaxed text-cos-muted">
            See which events still need people — then share the signup. Role
            counts only; no names or contact details.
          </p>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div
            className="flex flex-wrap items-center gap-2"
            role="tablist"
            aria-label="Volunteer filters"
          >
            {PULSE_TABS.map((tab) => {
              const active = filter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setFilter(tab.id)}
                  className={cn(
                    "rounded-full px-3.5 py-2 text-[13px] font-bold transition",
                    active
                      ? "bg-cos-card text-cos-text shadow-[0_8px_28px_rgba(28,36,48,0.06)] ring-1 ring-cos-border"
                      : "text-cos-muted hover:bg-[rgba(255,252,247,0.7)] hover:text-cos-text",
                    active && tab.id === "needs_people"
                      ? "shadow-[0_0_0_3px_rgba(47,74,60,0.12)]"
                      : null,
                  )}
                >
                  {tab.label}
                  <span
                    className={cn(
                      "ml-1.5 inline-block min-w-[1.25em] tabular-nums",
                      active ? "text-[#2f4a3c]" : "text-cos-muted",
                    )}
                  >
                    {pulseCounts[tab.id]}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
            {healthParts.length > 0 ? (
              <span className="px-1 text-[13px] font-semibold text-cos-muted">
                {healthParts.map((part, index) => (
                  <span key={part}>
                    {index > 0 ? " · " : null}
                    <strong className="font-semibold text-cos-muted tabular-nums">
                      {part}
                    </strong>
                  </span>
                ))}
              </span>
            ) : null}
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-cos-muted" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search events or roles…"
                className="h-9 w-full min-w-[180px] rounded-full border border-cos-border bg-cos-card pr-3 pl-9 text-[13px] text-cos-text outline-none focus:border-cos-dark sm:w-[240px]"
                aria-label="Search events or roles"
              />
            </div>
          </div>
        </div>
      </header>

      {filteredEvents.length === 0 ? (
        <section className="rounded-[22px] border border-cos-border bg-[rgba(255,252,247,0.55)]">
          <VolunteersEmptyEase
            title={emptyCopy[filter].title}
            body={emptyCopy[filter].body}
          />
          {data.events.length === 0 ? (
            <div className="pb-8 text-center">
              <Link
                href="/events"
                className="text-sm font-bold text-cos-text hover:underline"
              >
                Go to Events →
              </Link>
            </div>
          ) : null}
        </section>
      ) : (
        <div className="space-y-9">
          {focusEvent ? (
            <section className="space-y-3">
              <p className="text-[11px] font-extrabold tracking-[0.08em] text-cos-muted uppercase">
                Needs you next
              </p>
              <VolunteersFocusCard
                key={focusEvent.id}
                event={focusEvent}
                hasNext={filteredEvents.length > 1}
                onNext={() =>
                  setFocusIndex((current) =>
                    (current + 1) % filteredEvents.length,
                  )
                }
              />
            </section>
          ) : null}

          {queueEvents.length > 0 ? (
            <section className="space-y-3">
              <p className="text-[11px] font-extrabold tracking-[0.08em] text-cos-muted uppercase">
                {showFocus
                  ? `Also needs people · ${queueEvents.length} more`
                  : filter === "upcoming"
                    ? "Upcoming · next 60 days"
                    : filter === "covered"
                      ? "Covered"
                      : "All volunteer events"}
              </p>
              <div className="flex flex-col gap-2">
                {queueEvents.map((event) => (
                  <VolunteersQueueRow key={event.id} event={event} />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      )}

      <footer className="flex items-center justify-center gap-2 pt-2 text-center text-xs text-cos-muted">
        <RefreshCw className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <p>
          Numbers come from SignUpGenius
          {data.lastSuccessfulSyncAt
            ? `. Last update: ${formatDateTime(data.lastSuccessfulSyncAt)}.`
            : "."}{" "}
          Connect and refresh on each event&apos;s Volunteers tab.
        </p>
      </footer>
    </div>
  );
}
