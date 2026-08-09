"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { Search } from "lucide-react";
import {
  CreateEventModal,
  type CreateEventPlaybookOption,
} from "@/components/events/CreateEventModal";
import { EventsAlsoAheadList } from "@/components/events-phase3/EventsAlsoAheadList";
import {
  EventsEaseEmpty,
  EventsEaseSuiteStrip,
  type EventsEaseLens,
  type EventsHomeResponsiblePerson,
} from "@/components/events-phase3/EventsEaseList";
import type { EventDetailHeroStats } from "@/components/events-phase3/EventDetailHeroStatsStrip";
import {
  EventWorkspaceOverviewPanel,
  type OverviewJumpTab,
} from "@/components/events-phase3/EventWorkspaceOverviewPanel";
import { InviteEventMemberDrawer } from "@/components/events-phase3/InviteEventMemberDrawer";
import { filterEventsHomeBySearch } from "@/lib/events/events-home-search";
import {
  EVENTS_ALSO_AHEAD_COLLAPSED_COUNT,
  eventsHomeAlsoAheadEvents,
  resolveSelectedEventsHomeEvent,
  sliceAlsoAheadEvents,
} from "@/lib/events/events-home-selection";
import {
  countEventsHomeSummary,
  filterEventsHomeByLens,
  matchesEventsHomeMonth,
  shouldApplyEventsHomeLensFilter,
} from "@/lib/events/events-home-summary";
import type { EventsHomeLayout } from "@/lib/events/events-home-layout";
import type { EventResponsibilityPerson } from "@/lib/events/event-responsibility";
import { createWithAiHref } from "@/lib/events/event-responsibility";
import type { HeroArtworkSelection } from "@/lib/event-workspace/select-hero-artwork";
import { refreshEventDetailHeroStatsAction } from "@/lib/events-phase3/actions";
import type { EventInviteCollaboratorPreview } from "@/lib/events-phase3/invite-event-member";
import type { InviteEventMemberAddedResult } from "@/lib/events-phase3/invite-event-member";
import type { Event } from "@/types";
import { cn } from "@/lib/utils/cn";

export type { EventsHomeResponsiblePerson };

const EMPTY_STATS: EventDetailHeroStats = {
  milestones: 0,
  pendingApprovals: 0,
  scheduledPosts: 0,
  tasks: 0,
  filledSpots: 0,
  totalSpots: null,
  openSpots: null,
};

interface EventsHomeContentProps {
  events: Event[];
  archivedEvents?: Event[];
  today: string;
  artworkByEventId: Record<string, HeroArtworkSelection | null>;
  responsibleByEventId: Record<string, EventsHomeResponsiblePerson>;
  playbookNameByEventId?: Record<string, string | null>;
  playbookOptions?: CreateEventPlaybookOption[];
  schoolYears?: Array<{ id: string; label: string }>;
  activeSchoolYearId?: string | null;
  /** Kept for page compatibility; KPI card layout is unused in ease UI. */
  initialSummaryLayout: EventsHomeLayout;
  /** Untrusted URL `?event=` — only applied when present in accessible lists. */
  initialEventId?: string | null;
  /** Hero stats for the server-resolved initial selection (one event only). */
  initialSelectedStats?: EventDetailHeroStats | null;
  canManagePeople?: boolean;
}

const PULSE_TABS: Array<{ id: EventsEaseLens; label: string }> = [
  { id: "upcoming", label: "Upcoming" },
  { id: "next_month", label: "Next month" },
  { id: "all", label: "All" },
  { id: "archived", label: "Archived" },
];

function overviewTabHref(eventId: string, tab: OverviewJumpTab): string {
  if (tab === "create-with-ai") {
    return createWithAiHref(eventId);
  }
  return `/events/${encodeURIComponent(eventId)}?tab=${encodeURIComponent(tab)}`;
}

function leadAsResponsibilities(
  person: EventsHomeResponsiblePerson | undefined,
): EventResponsibilityPerson[] {
  if (!person?.displayName?.trim()) {
    return [];
  }
  return [
    {
      responsibility: "Event Lead",
      displayName: person.displayName,
      organizationTitle: person.organizationTitle,
      committeeName: null,
      memberId: null,
      campaignRole: null,
      active: true,
      source: "routing",
    },
  ];
}

export function EventsHomeContent({
  events,
  archivedEvents = [],
  today,
  artworkByEventId,
  responsibleByEventId,
  playbookOptions = [],
  schoolYears = [],
  activeSchoolYearId = null,
  initialEventId = null,
  initialSelectedStats = null,
  canManagePeople = false,
}: EventsHomeContentProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState("");
  const [lens, setLens] = useState<EventsEaseLens>(() => {
    if (
      initialEventId &&
      archivedEvents.some((event) => event.id === initialEventId)
    ) {
      return "archived";
    }
    return "upcoming";
  });
  const [schoolYearFilter, setSchoolYearFilter] = useState<string>(
    activeSchoolYearId ?? "all",
  );
  const [createOpen, setCreateOpen] = useState(false);
  const [alsoAheadExpanded, setAlsoAheadExpanded] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteCollaborators, setInviteCollaborators] = useState<
    EventInviteCollaboratorPreview[]
  >([]);
  const [statsByEventId, setStatsByEventId] = useState<
    Record<string, EventDetailHeroStats>
  >(() =>
    initialEventId && initialSelectedStats
      ? { [initialEventId]: initialSelectedStats }
      : {},
  );
  const [statsPendingId, setStatsPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const urlEventId = searchParams.get("event")?.trim() || null;
  const searchQuery = searchParams.toString();
  const selectedEventIdRef = useRef<string | null>(null);
  const statsByEventIdRef = useRef(statsByEventId);
  statsByEventIdRef.current = statsByEventId;

  const eventsForCounts = useMemo(() => {
    if (schoolYearFilter === "all") return events;
    return events.filter((event) => event.schoolYearId === schoolYearFilter);
  }, [events, schoolYearFilter]);

  const archivedForCounts = useMemo(() => {
    if (schoolYearFilter === "all") return archivedEvents;
    return archivedEvents.filter(
      (event) => event.schoolYearId === schoolYearFilter,
    );
  }, [archivedEvents, schoolYearFilter]);

  const sourceEvents = lens === "archived" ? archivedForCounts : eventsForCounts;

  const summaryCounts = useMemo(
    () => countEventsHomeSummary(eventsForCounts, today),
    [eventsForCounts, today],
  );

  const nextMonthCount = useMemo(
    () =>
      eventsForCounts.filter((event) =>
        matchesEventsHomeMonth(event, "next_month", today),
      ).length,
    [eventsForCounts, today],
  );

  const schoolYearLabelById = useMemo(() => {
    const map = new Map<string, string>();
    for (const year of schoolYears) {
      map.set(year.id, year.label);
    }
    return map;
  }, [schoolYears]);

  const applyLensFilter = shouldApplyEventsHomeLensFilter(search);
  const hasSearch = !applyLensFilter;

  const searched = useMemo(
    () =>
      filterEventsHomeBySearch(sourceEvents, search, (event) => ({
        today,
        responsible: responsibleByEventId[event.id],
        schoolYearLabel: event.schoolYearId
          ? (schoolYearLabelById.get(event.schoolYearId) ?? null)
          : null,
      })),
    [
      sourceEvents,
      search,
      responsibleByEventId,
      today,
      schoolYearLabelById,
    ],
  );

  const lensEvents = useMemo(
    () =>
      filterEventsHomeByLens(searched, lens, today, {
        applyLens: applyLensFilter,
      }),
    [searched, lens, today, applyLensFilter],
  );

  const selectedEvent = useMemo(
    () =>
      resolveSelectedEventsHomeEvent({
        accessibleEvents: lensEvents,
        requestedEventId: urlEventId,
        preferredEventId: selectedEventIdRef.current,
      }),
    [lensEvents, urlEventId],
  );

  selectedEventIdRef.current = selectedEvent?.id ?? null;
  const selectedId = selectedEvent?.id ?? null;

  const alsoAheadAll = useMemo(
    () => eventsHomeAlsoAheadEvents(lensEvents, selectedId),
    [lensEvents, selectedId],
  );
  const alsoAheadVisible = useMemo(
    () => sliceAlsoAheadEvents(alsoAheadAll, alsoAheadExpanded),
    [alsoAheadAll, alsoAheadExpanded],
  );

  useEffect(() => {
    setAlsoAheadExpanded(false);
    setInviteOpen(false);
  }, [lens, search, schoolYearFilter]);

  useEffect(() => {
    setInviteCollaborators([]);
  }, [selectedId]);

  // Keep ?event= in sync with the resolved selection (replace, no remount).
  useEffect(() => {
    if (!selectedId) {
      if (!urlEventId) return;
      const params = new URLSearchParams(searchQuery);
      params.delete("event");
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
      return;
    }
    if (urlEventId === selectedId) return;
    const params = new URLSearchParams(searchQuery);
    params.set("event", selectedId);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [selectedId, urlEventId, pathname, router, searchQuery]);

  // Load selected-event stats; ignore stale responses after rapid switches.
  useEffect(() => {
    if (!selectedId) return;
    if (statsByEventIdRef.current[selectedId]) return;

    const requestEventId = selectedId;
    setStatsPendingId(requestEventId);
    let cancelled = false;

    startTransition(async () => {
      const result = await refreshEventDetailHeroStatsAction(requestEventId);
      if (cancelled) return;
      // Same identity check as EventDetailPhase3Client / EventDetailShell.
      if (requestEventId !== selectedEventIdRef.current) {
        return;
      }
      if (result.success) {
        setStatsByEventId((current) => ({
          ...current,
          [requestEventId]: result.data,
        }));
      }
      setStatsPendingId((current) =>
        current === requestEventId ? null : current,
      );
    });

    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  const pulseCounts: Record<EventsEaseLens, number> = {
    upcoming: summaryCounts.next_60_days,
    next_month: nextMonthCount,
    all: eventsForCounts.length,
    archived: archivedForCounts.length,
  };

  const emptyCopy: Record<
    EventsEaseLens,
    { title: string; body: string }
  > = {
    upcoming: {
      title: "Nothing in the next 60 days",
      body: "When you add or schedule events ahead, they show up here so you can see what’s coming.",
    },
    next_month: {
      title: "Nothing next month",
      body: "Events dated in the next calendar month show up here.",
    },
    all: {
      title: events.length === 0 ? "No events yet" : "No matches",
      body:
        events.length === 0
          ? "Create an event, or start from Create with AI."
          : "Try a different search.",
    },
    archived: {
      title:
        archivedEvents.length === 0 ? "No archived events" : "No matches",
      body:
        archivedEvents.length === 0
          ? "When you archive a past event, it appears here for reference."
          : "Try a different search.",
    },
  };

  function selectEvent(eventId: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("event", eventId);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  function handleSelectTab(tab: OverviewJumpTab) {
    if (!selectedEvent) return;
    const href = overviewTabHref(selectedEvent.id, tab);
    if (tab === "create-with-ai") {
      window.location.assign(href);
      return;
    }
    router.push(href);
  }

  function handleMemberAdded(result: InviteEventMemberAddedResult) {
    const preview: EventInviteCollaboratorPreview = {
      id: `${result.kind}-${result.email ?? result.displayName}-${Date.now()}`,
      displayName: result.displayName,
      roleLabel: result.roleLabel,
      status: result.kind === "invited" ? "pending" : "active",
    };
    setInviteCollaborators((current) => {
      const withoutDup = current.filter(
        (row) =>
          row.displayName.trim().toLowerCase() !==
          preview.displayName.trim().toLowerCase(),
      );
      return [preview, ...withoutDup];
    });
  }

  const alsoAheadHeading =
    lens === "upcoming" && !hasSearch
      ? "Also Ahead · Next 60 Days"
      : hasSearch
        ? "Also in results"
        : lens === "next_month"
          ? "Also Ahead · Next Month"
          : lens === "archived"
            ? "Also Archived"
            : "Also Ahead";

  const selectedStats =
    (selectedEvent ? statsByEventId[selectedEvent.id] : null) ?? EMPTY_STATS;
  const statsPending = Boolean(
    selectedEvent && statsPendingId === selectedEvent.id,
  );

  return (
    <div className="studio-page relative space-y-8 pb-12 before:pointer-events-none before:absolute before:top-0 before:left-[-2rem] before:h-60 before:w-60 before:rounded-full before:bg-[radial-gradient(circle,rgba(107,129,113,0.12),transparent_70%)] before:content-[''] after:pointer-events-none after:absolute after:top-10 after:right-0 after:h-52 after:w-52 after:rounded-full after:bg-[radial-gradient(circle,rgba(196,146,46,0.1),transparent_70%)] after:content-['']">
      <header className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-4xl tracking-[-0.02em] text-cos-text sm:text-5xl">
            Events
          </h1>
          <p className="mt-3 max-w-xl text-base leading-relaxed text-cos-muted">
            Manage your active PTA initiatives and volunteer cycles.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/create-with-ai"
            className="inline-flex items-center rounded-full bg-[#2f4a3c] px-[18px] py-[11px] text-[13px] font-bold text-[#f6f2eb] shadow-[0_0_0_3px_rgba(47,74,60,0.12)] transition hover:-translate-y-px hover:bg-[#243c30]"
          >
            Create with AI
          </Link>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center rounded-full border-[1.5px] border-cos-border bg-cos-card px-[18px] py-[11px] text-[13px] font-bold text-cos-text transition hover:-translate-y-px"
          >
            New event
          </button>
        </div>
      </header>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div
          className="flex flex-wrap items-center gap-2"
          role="tablist"
          aria-label="Event filters"
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
          {schoolYears.length > 1 ? (
            <select
              value={schoolYearFilter}
              onChange={(event) => setSchoolYearFilter(event.target.value)}
              aria-label="Organization year"
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
              placeholder="Search events, people, dates…"
              className="h-9 w-full min-w-[180px] rounded-full border border-cos-border bg-cos-card pr-3 pl-9 text-[13px] text-cos-text outline-none focus:border-cos-dark sm:w-[220px]"
              aria-label="Search events, people, and dates"
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

      {lensEvents.length === 0 || !selectedEvent ? (
        <EventsEaseEmpty
          title={hasSearch ? "No matches" : emptyCopy[lens].title}
          body={hasSearch ? "Try a different search." : emptyCopy[lens].body}
          onNewEvent={() => setCreateOpen(true)}
        />
      ) : (
        <EventWorkspaceOverviewPanel
          variant="home"
          event={selectedEvent}
          artwork={artworkByEventId[selectedEvent.id] ?? null}
          stats={selectedStats}
          statsPending={statsPending}
          responsibilities={leadAsResponsibilities(
            responsibleByEventId[selectedEvent.id],
          )}
          inviteCollaborators={inviteCollaborators}
          onSelectTab={handleSelectTab}
          onInviteTeamMember={
            canManagePeople ? () => setInviteOpen(true) : undefined
          }
          showWhatsNext={false}
          attentionTitle="Attention Needed"
          showOperationalSummary
          manageEntityNoun="event"
          afterHeroSlot={
            <EventsAlsoAheadList
              events={alsoAheadVisible}
              today={today}
              artworkByEventId={artworkByEventId}
              responsibleByEventId={responsibleByEventId}
              heading={alsoAheadHeading}
              expanded={alsoAheadExpanded}
              canExpand={alsoAheadAll.length > EVENTS_ALSO_AHEAD_COLLAPSED_COUNT}
              onToggleExpand={() => setAlsoAheadExpanded((value) => !value)}
              onSelect={selectEvent}
            />
          }
        />
      )}

      <EventsEaseSuiteStrip />

      <CreateEventModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        playbookOptions={playbookOptions}
      />

      {canManagePeople && selectedEvent ? (
        <InviteEventMemberDrawer
          open={inviteOpen}
          onOpenChange={setInviteOpen}
          event={{
            id: selectedEvent.id,
            title: selectedEvent.title,
            date: selectedEvent.date,
            imageUrl: artworkByEventId[selectedEvent.id]?.imageUrl ?? null,
          }}
          onMemberAdded={handleMemberAdded}
        />
      ) : null}
    </div>
  );
}
