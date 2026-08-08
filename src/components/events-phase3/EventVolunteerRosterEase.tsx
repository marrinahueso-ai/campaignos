"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
  Check,
  ExternalLink,
  Funnel,
  Package,
  PartyPopper,
  RefreshCw,
  Search,
  Sparkles,
  UserPlus,
} from "lucide-react";
import {
  ew,
  ewCard,
} from "@/components/events-phase3/event-workspace-tokens";
import { campaignBuilderCreatePostHref } from "@/lib/campaign-builder-v2/navigation";
import { formatSyncTime } from "@/lib/event-volunteers/ai-summary";
import {
  listEventVolunteerOpsAction,
  toggleEventVolunteerOpAction,
} from "@/lib/event-volunteers/actions";
import type { AssignmentSortId } from "@/lib/event-volunteers/assignment-list";
import {
  filterAndSortAssignments,
} from "@/lib/event-volunteers/assignment-list";
import {
  getVolunteerFillRateBand,
  type VolunteerFillRateBand,
} from "@/lib/event-volunteers/org-master-shared";
import {
  formatParticipantShiftTime,
  volunteerInitials,
} from "@/lib/event-volunteers/participant-list";
import {
  buildVolunteerRosterSections,
  sortRosterRoles,
  type VolunteerRosterRoleCard,
} from "@/lib/event-volunteers/roster-groups";
import {
  participantOpsKey,
  type VolunteerOpsMark,
} from "@/lib/event-volunteers/ops-shared";
import type {
  VolunteerAssignmentView,
  VolunteerParticipantView,
  VolunteerSnapshotRecord,
  VolunteerSourceRecord,
} from "@/lib/event-volunteers/types";
import { cn } from "@/lib/utils/cn";

type RosterView = "coverage" | "people" | "items";

type RosterFilter =
  | "all"
  | "needs_people"
  | "covered"
  | "arrived"
  | "not_arrived"
  | "received"
  | "not_received";

type Props = {
  eventId: string;
  source: VolunteerSourceRecord;
  snapshot: VolunteerSnapshotRecord;
  canManage: boolean;
  pending: boolean;
  error: string | null;
  onRefresh: () => void;
  onReplaceConnect?: () => void;
};

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

const SORT_OPTIONS: Array<{ id: AssignmentSortId; label: string }> = [
  { id: "most_needed", label: "Most needed" },
  { id: "least_filled", label: "Least filled" },
  { id: "most_filled", label: "Most filled" },
  { id: "name", label: "Name" },
  { id: "date", label: "Date" },
];

function fillPercent(role: VolunteerRosterRoleCard): number {
  if (role.fillPercent != null) return role.fillPercent;
  const requested = role.assignment.quantityRequested;
  const filled = role.assignment.quantityFilled ?? 0;
  if (!requested || requested <= 0) return 0;
  return Math.min(100, Math.round((filled / requested) * 100));
}

function roleSlotsLabel(role: VolunteerRosterRoleCard): string {
  const filled = role.assignment.quantityFilled ?? 0;
  const requested = role.assignment.quantityRequested;
  return `${filled} of ${requested ?? "?"} filled`;
}

function roleOpenSpots(role: VolunteerRosterRoleCard): number {
  if (typeof role.openSlots === "number") return Math.max(0, role.openSlots);
  const requested = role.assignment.quantityRequested;
  const filled = role.assignment.quantityFilled ?? 0;
  if (typeof requested !== "number") return 0;
  return Math.max(0, requested - filled);
}

function isRoleCovered(role: VolunteerRosterRoleCard): boolean {
  const requested = role.assignment.quantityRequested;
  const filled = role.assignment.quantityFilled ?? 0;
  if (typeof requested !== "number" || requested <= 0) {
    return role.openSlots === 0 && filled > 0;
  }
  return filled >= requested;
}

function isFullyStaffed(snapshot: VolunteerSnapshotRecord): boolean {
  const { totalSpots, openSpots, filledSpots, quantitiesComplete } =
    snapshot.summary;
  if (!quantitiesComplete) return false;
  if (totalSpots == null || totalSpots <= 0) return false;
  return (openSpots ?? 0) === 0 && (filledSpots ?? 0) >= totalSpots;
}

function overallFillPercent(
  filled: number,
  total: number | null | undefined,
): number | null {
  if (total == null || total <= 0) return null;
  return Math.min(100, Math.round((filled / total) * 100));
}

function ProgressBar({
  percent,
  className,
  trackClassName,
}: {
  percent: number | null;
  className?: string;
  trackClassName?: string;
}) {
  const band = getVolunteerFillRateBand(percent);
  const width = Math.min(100, Math.max(0, percent ?? 0));
  return (
    <div
      className={cn(
        "h-1.5 overflow-hidden rounded-full bg-[#f4f0ea]",
        trackClassName,
      )}
    >
      <div
        className={cn(
          "h-full rounded-full transition-[width]",
          band ? FILL_RATE_BAND_STYLES[band].bar : "bg-[#c5a880]",
          className,
        )}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}

export function EventVolunteerRosterEase({
  eventId,
  source,
  snapshot,
  canManage,
  pending,
  error,
  onRefresh,
  onReplaceConnect,
}: Props) {
  const [view, setView] = useState<RosterView>("coverage");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<RosterFilter>("all");
  const [sort, setSort] = useState<AssignmentSortId>("most_needed");
  const [marks, setMarks] = useState<VolunteerOpsMark[]>([]);
  const [opsError, setOpsError] = useState<string | null>(null);
  const [opsPending, startOps] = useTransition();

  const people = useMemo(
    () => snapshot.participants ?? [],
    [snapshot.participants],
  );
  const assignments = useMemo(
    () => snapshot.assignments as VolunteerAssignmentView[],
    [snapshot.assignments],
  );
  const sections = useMemo(
    () => buildVolunteerRosterSections(assignments, people),
    [assignments, people],
  );
  const roles = useMemo(
    () => sections.flatMap((section) => section.roles),
    [sections],
  );

  const markSet = useMemo(() => {
    const set = new Set<string>();
    for (const mark of marks) {
      set.add(`${mark.subjectType}:${mark.subjectKey}`);
    }
    return set;
  }, [marks]);

  const createVolunteerPostHref = campaignBuilderCreatePostHref(
    eventId,
    "volunteer",
  );
  const thankYouHref = campaignBuilderCreatePostHref(eventId, "thank_you");

  function reloadOps() {
    startOps(async () => {
      const result = await listEventVolunteerOpsAction(eventId);
      if (!result.success) {
        setOpsError(result.error ?? "Unable to load arrival marks.");
        return;
      }
      setMarks(result.marks);
      setOpsError(null);
    });
  }

  useEffect(() => {
    reloadOps();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per event
  }, [eventId]);

  function toggleMark(
    subjectType: "participant" | "item",
    subjectKey: string,
    currentlyMarked: boolean,
  ) {
    if (!canManage) return;
    startOps(async () => {
      const result = await toggleEventVolunteerOpAction({
        eventId,
        subjectType,
        subjectKey,
        marked: !currentlyMarked,
      });
      if (!result.success) {
        setOpsError(result.error ?? "Unable to save that mark.");
        return;
      }
      reloadOps();
    });
  }

  const summary = snapshot.summary;
  const filled = summary.filledSpots ?? 0;
  const total = summary.totalSpots;
  const fullyStaffed = isFullyStaffed(snapshot);
  const overallPct = overallFillPercent(filled, total);
  const overallBand = getVolunteerFillRateBand(overallPct);
  const syncLabel = source.lastSuccessfulSyncAt
    ? `Synced ${formatSyncTime(source.lastSuccessfulSyncAt)}`
    : "Not synced yet";

  const coverageRoles = useMemo(() => {
    const sortedAssignments = filterAndSortAssignments(assignments, {
      filter: "all",
      dateFilter: "all",
      sort,
    });
    const byKey = new Map(
      roles.map((role) => [role.assignment.externalKey, role] as const),
    );
    let next = sortedAssignments
      .map((assignment) => byKey.get(assignment.externalKey))
      .filter((role): role is VolunteerRosterRoleCard => Boolean(role));

    if (filter === "needs_people") {
      next = next.filter((role) => !isRoleCovered(role));
    } else if (filter === "covered") {
      next = next.filter((role) => isRoleCovered(role));
    }

    const q = search.trim().toLowerCase();
    if (q) {
      next = next.filter((role) => {
        const hay = [
          role.assignment.name,
          role.assignment.location ?? "",
          ...role.people.map((person) => person.name),
        ]
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      });
    }
    return next;
  }, [assignments, roles, sort, filter, search]);

  const peopleRows = useMemo(() => {
    let next = [...people];
    const q = search.trim().toLowerCase();
    if (q) {
      next = next.filter((person) => {
        const hay = [person.name, person.roleName].join(" ").toLowerCase();
        return hay.includes(q);
      });
    }
    if (filter === "arrived") {
      next = next.filter((person) =>
        markSet.has(
          `participant:${participantOpsKey(
            person.assignmentExternalKey,
            person.participantKey,
          )}`,
        ),
      );
    } else if (filter === "not_arrived") {
      next = next.filter(
        (person) =>
          !markSet.has(
            `participant:${participantOpsKey(
              person.assignmentExternalKey,
              person.participantKey,
            )}`,
          ),
      );
    }
    next.sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
    );
    return next;
  }, [people, search, filter, markSet]);

  const itemRows = useMemo(() => {
    let next = [...assignments];
    const q = search.trim().toLowerCase();
    if (q) {
      next = next.filter((assignment) =>
        assignment.name.toLowerCase().includes(q),
      );
    }
    if (filter === "received") {
      next = next.filter((assignment) =>
        markSet.has(`item:${assignment.externalKey}`),
      );
    } else if (filter === "not_received") {
      next = next.filter(
        (assignment) => !markSet.has(`item:${assignment.externalKey}`),
      );
    }
    return sortRosterRoles(
      next.map((assignment) => ({
        assignment,
        people: people.filter(
          (person) => person.assignmentExternalKey === assignment.externalKey,
        ),
        openSlots: Math.max(0, assignment.quantityOpen ?? 0),
        fillPercent: null,
      })),
      sort === "name" ? "role" : sort === "most_filled" ? "fill" : "role",
    ).map((role) => role.assignment);
  }, [assignments, people, search, filter, markSet, sort]);

  const receivedItemCount = useMemo(
    () =>
      assignments.filter((assignment) =>
        markSet.has(`item:${assignment.externalKey}`),
      ).length,
    [assignments, markSet],
  );

  const filterOptions = useMemo(() => {
    if (view === "people") {
      return [
        { id: "all" as const, label: "All people" },
        { id: "arrived" as const, label: "Arrived" },
        { id: "not_arrived" as const, label: "Not arrived" },
      ];
    }
    if (view === "items") {
      return [
        { id: "all" as const, label: "All items" },
        { id: "received" as const, label: "Received" },
        { id: "not_received" as const, label: "Not received" },
      ];
    }
    return [
      { id: "all" as const, label: "All roles" },
      { id: "needs_people" as const, label: "Still needed" },
      { id: "covered" as const, label: "Covered" },
    ];
  }, [view]);

  useEffect(() => {
    const allowed = new Set(filterOptions.map((option) => option.id));
    if (!allowed.has(filter)) {
      setFilter("all");
    }
  }, [filter, filterOptions]);

  return (
    <section className="space-y-8">
      {fullyStaffed ? (
        <div
          className={cn(
            "flex flex-col gap-6 rounded-2xl border border-[#8ea89d]/30 bg-[#e6efe9]/50 p-6 sm:flex-row sm:items-end sm:justify-between sm:p-8",
          )}
        >
          <div>
            <p className="mb-1 text-xs font-bold tracking-[0.2em] text-[#5a7568] uppercase">
              Operational Goal Reached
            </p>
            <h2
              className={cn("font-display text-3xl sm:text-4xl", ew.ink)}
              data-testid="event-detail-tab-volunteers"
            >
              Volunteers Fully Staffed
            </h2>
            <div className="mt-3 flex flex-wrap items-center gap-4">
              <p className={cn("flex items-center gap-2 text-sm font-semibold", ew.sageDeep)}>
                <PartyPopper className="h-4 w-4" aria-hidden />
                {total != null
                  ? `All ${total} positions filled`
                  : "Operational goal reached"}
              </p>
              <ProgressBar percent={100} trackClassName="w-32" />
            </div>
          </div>
          <Link
            href={thankYouHref}
            className="inline-flex items-center gap-2 rounded-full border border-[#8ea89d]/30 bg-white px-6 py-3 text-xs font-semibold text-[#1c352d] shadow-sm transition hover:bg-[#e6efe9]"
          >
            <Sparkles className={cn("h-4 w-4", ew.sageDeep)} aria-hidden />
            Send Thank You Note
          </Link>
        </div>
      ) : (
        <header className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <h2
              className={cn("font-display text-3xl sm:text-4xl", ew.ink)}
              data-testid="event-detail-tab-volunteers"
            >
              Volunteers
            </h2>
            <div className="mt-3 flex flex-wrap items-center gap-4">
              <p className={cn("text-sm font-medium", ew.ink)}>
                <span className="tabular-nums">{filled}</span>{" "}
                <span className={cn("font-normal", ew.inksoft)}>
                  of{" "}
                  <span className="tabular-nums">
                    {total != null ? total : "?"}
                  </span>{" "}
                  spots filled
                </span>
              </p>
              {overallPct != null ? (
                <ProgressBar percent={overallPct} trackClassName="w-24" />
              ) : null}
              {overallBand ? (
                <span
                  className={cn(
                    "text-xs font-semibold",
                    FILL_RATE_BAND_STYLES[overallBand].text,
                  )}
                >
                  {overallPct}%
                </span>
              ) : null}
              <span
                className={cn(
                  "flex items-center gap-1 border-l border-[#e6dfd5] pl-4 text-xs italic",
                  ew.inksoft,
                )}
              >
                <RefreshCw className="h-3 w-3" aria-hidden />
                {syncLabel}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={onRefresh}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border border-[#e6dfd5] bg-white px-5 py-2.5 text-xs font-semibold",
                ew.inksoft,
              )}
            >
              <RefreshCw
                className={cn("h-4 w-4", pending && "animate-spin")}
                aria-hidden
              />
              Refresh
            </button>
            {source.sourceUrl ? (
              <a
                href={source.sourceUrl}
                target="_blank"
                rel="noreferrer"
                title="Open signup"
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border border-[#e6dfd5] bg-white px-5 py-2.5 text-xs font-semibold",
                  ew.inksoft,
                )}
              >
                <ExternalLink className="h-4 w-4" aria-hidden />
                Open signup
              </a>
            ) : null}
            {canManage && onReplaceConnect ? (
              <button
                type="button"
                onClick={onReplaceConnect}
                className={cn(
                  "text-xs font-semibold underline-offset-2 hover:underline",
                  ew.inksoft,
                )}
              >
                Replace link
              </button>
            ) : null}
          </div>
        </header>
      )}

      {error || opsError ? (
        <p className="text-sm text-[#a65a3a]" role="alert">
          {error ?? opsError}
        </p>
      ) : null}

      <section className="flex flex-col gap-4 border-b border-[#e6dfd5] pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div
          className="inline-flex rounded-full border border-[#e6dfd5] bg-[#e6dfd5]/20 p-1"
          role="tablist"
          aria-label="Volunteer views"
        >
          {(
            [
              ["coverage", "Coverage"],
              ["people", "People"],
              ["items", "Items"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={view === id}
              onClick={() => setView(id)}
              className={cn(
                "rounded-full px-6 py-2 text-xs font-semibold transition",
                view === id
                  ? "bg-[#1c352d] text-white"
                  : "text-[#5e6b65] hover:text-[#1c352d]",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
          <label className="relative block min-w-[12rem] flex-1 sm:flex-none">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-[#5e6b65]"
              aria-hidden
            />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={
                view === "people"
                  ? "Search volunteers..."
                  : view === "items"
                    ? "Search items..."
                    : "Search roles or people..."
              }
              className="w-full rounded-full border border-[#e6dfd5] bg-white py-2 pr-4 pl-9 text-xs text-[#1c352d] outline-none focus:border-[#c5a880]"
              aria-label="Search volunteers"
            />
          </label>

          <label className="inline-flex items-center gap-2 text-xs font-semibold text-[#5e6b65]">
            <Funnel className="h-3.5 w-3.5" aria-hidden />
            <span className="sr-only">Filter</span>
            <select
              value={filter}
              onChange={(event) =>
                setFilter(event.target.value as RosterFilter)
              }
              className="rounded-full border border-[#e6dfd5] bg-white px-3 py-2 text-xs font-semibold text-[#1c352d]"
              aria-label="Filter volunteers"
            >
              {filterOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="inline-flex items-center gap-2 text-xs font-semibold text-[#5e6b65]">
            <span>Sort</span>
            <select
              value={sort}
              onChange={(event) =>
                setSort(event.target.value as AssignmentSortId)
              }
              className="rounded-full border border-[#e6dfd5] bg-white px-3 py-2 text-xs font-semibold text-[#1c352d]"
              aria-label="Sort coverage"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {view === "coverage" ? (
        fullyStaffed && filter === "all" && !search.trim() ? (
          <FullyStaffedCoverage
            roles={coverageRoles}
            receivedItemCount={receivedItemCount}
            totalItems={assignments.length}
            onViewItems={() => setView("items")}
          />
        ) : (
          <CoverageView
            roles={coverageRoles}
            createVolunteerPostHref={createVolunteerPostHref}
          />
        )
      ) : null}

      {view === "people" ? (
        <PeopleView
          people={peopleRows}
          markSet={markSet}
          canManage={canManage}
          pending={opsPending}
          onToggle={(key, marked) => toggleMark("participant", key, marked)}
        />
      ) : null}

      {view === "items" ? (
        <ItemsView
          assignments={itemRows}
          people={people}
          markSet={markSet}
          canManage={canManage}
          pending={opsPending}
          onToggle={(key, marked) => toggleMark("item", key, marked)}
        />
      ) : null}
    </section>
  );
}

function CoverageView({
  roles,
  createVolunteerPostHref,
}: {
  roles: VolunteerRosterRoleCard[];
  createVolunteerPostHref: string;
}) {
  if (roles.length === 0) {
    return (
      <p className={cn("text-sm", ew.inksoft)}>
        No roles match this search or filter.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {roles.map((role) => {
        const pct = fillPercent(role);
        const covered = isRoleCovered(role);
        const open = roleOpenSpots(role);
        const shift = formatParticipantShiftTime(
          role.assignment.startTime,
          role.assignment.endTime,
        );
        const band = getVolunteerFillRateBand(pct);
        return (
          <article
            key={role.assignment.externalKey}
            className={cn(ewCard, "flex flex-col gap-6 p-6 sm:p-8")}
            data-filled={role.assignment.quantityFilled ?? 0}
            data-total={role.assignment.quantityRequested ?? 0}
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1">
                <h3 className={cn("font-display text-2xl", ew.ink)}>
                  {role.assignment.name}
                </h3>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <span className={cn("text-sm font-medium tabular-nums", ew.ink)}>
                    {roleSlotsLabel(role)}
                  </span>
                  <ProgressBar percent={pct} trackClassName="w-32" />
                  {covered ? (
                    <span
                      className={cn(
                        "flex items-center gap-1 text-xs font-semibold",
                        ew.sageDeep,
                      )}
                    >
                      <Check className="h-3.5 w-3.5" aria-hidden />
                      Fully Staffed
                    </span>
                  ) : band ? (
                    <span
                      className={cn(
                        "text-xs font-semibold",
                        FILL_RATE_BAND_STYLES[band].text,
                      )}
                    >
                      Still Needed
                    </span>
                  ) : null}
                </div>
              </div>
              {!covered ? (
                <Link
                  href={createVolunteerPostHref}
                  className="inline-flex shrink-0 items-center gap-2 rounded-full bg-[#1c352d] px-5 py-2.5 text-[11px] font-bold tracking-wider text-white uppercase"
                >
                  <Sparkles className="h-3.5 w-3.5" aria-hidden />
                  Create Volunteer Post
                </Link>
              ) : null}
            </div>

            <div className="border-t border-[#e6dfd5] pt-4">
              {shift !== "—" ? (
                <p className="mb-3 text-[10px] font-bold tracking-widest text-[#5e6b65] uppercase">
                  {shift}
                </p>
              ) : null}
              <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                {role.people.length > 0 ? (
                  role.people.map((person) => (
                    <div
                      key={`${person.assignmentExternalKey}:${person.participantKey}`}
                      className="flex items-center gap-3 text-sm text-[#1c352d]"
                    >
                      <span
                        className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#e6efe9] text-[10px] font-extrabold text-[#1c352d]"
                        aria-hidden
                      >
                        {volunteerInitials(person.name)}
                      </span>
                      <span>{person.name}</span>
                    </div>
                  ))
                ) : (
                  <p className={cn("text-sm", ew.inksoft)}>
                    {(role.assignment.quantityFilled ?? 0) > 0
                      ? "Names not shared publicly yet."
                      : "No volunteers assigned yet."}
                  </p>
                )}
                {open > 0 ? (
                  <div className="flex items-center gap-2 text-sm font-medium text-[#c5a880] italic">
                    <UserPlus className="h-4 w-4" aria-hidden />
                    {open} spot{open === 1 ? "" : "s"} still needed
                  </div>
                ) : null}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function FullyStaffedCoverage({
  roles,
  receivedItemCount,
  totalItems,
  onViewItems,
}: {
  roles: VolunteerRosterRoleCard[];
  receivedItemCount: number;
  totalItems: number;
  onViewItems: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {roles.map((role) => {
          const filled = role.assignment.quantityFilled ?? role.people.length;
          const requested = role.assignment.quantityRequested ?? filled;
          const overflow = Math.max(0, role.people.length - 3);
          return (
            <article
              key={role.assignment.externalKey}
              className={cn(ewCard, "flex flex-col gap-4 p-6")}
            >
              <div className="flex items-center justify-between gap-3">
                <h3 className={cn("font-display text-xl", ew.ink)}>
                  {role.assignment.name}
                </h3>
                <span className="rounded bg-[#e6efe9] px-2 py-1 text-xs font-semibold text-[#5a7568]">
                  {filled}/{requested}
                </span>
              </div>
              <ProgressBar percent={100} />
              <div className="flex -space-x-2 pt-2">
                {role.people.slice(0, 3).map((person) => (
                  <span
                    key={`${person.assignmentExternalKey}:${person.participantKey}`}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-[#e6efe9] text-[10px] font-bold text-[#1c352d]"
                    title={person.name}
                  >
                    {volunteerInitials(person.name)}
                  </span>
                ))}
                {overflow > 0 ? (
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-[#faf8f5] text-[10px] font-bold text-[#5e6b65]">
                    +{overflow}
                  </span>
                ) : null}
                {role.people.length === 0 ? (
                  <span className={cn("text-sm", ew.inksoft)}>Covered</span>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>

      {totalItems > 0 ? (
        <div
          className={cn(
            ewCard,
            "flex flex-col items-center justify-between gap-6 p-8 sm:flex-row",
          )}
        >
          <div className="flex items-center gap-6">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#e6efe9] text-[#5a7568]">
              <Package className="h-6 w-6" aria-hidden />
            </div>
            <div>
              <h4 className={cn("font-display text-xl", ew.ink)}>
                Items & Donations
              </h4>
              <p className={cn("text-sm", ew.inksoft)}>
                {receivedItemCount >= totalItems && totalItems > 0
                  ? `All ${totalItems} promised items have been received at the venue.`
                  : `${receivedItemCount} of ${totalItems} items marked received.`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onViewItems}
            className={cn(
              "inline-flex items-center gap-2 text-xs font-semibold transition hover:text-[#1c352d]",
              ew.inksoft,
            )}
          >
            View History
          </button>
        </div>
      ) : null}
    </div>
  );
}

function PeopleView({
  people,
  markSet,
  canManage,
  pending,
  onToggle,
}: {
  people: VolunteerParticipantView[];
  markSet: Set<string>;
  canManage: boolean;
  pending: boolean;
  onToggle: (subjectKey: string, marked: boolean) => void;
}) {
  if (people.length === 0) {
    return (
      <p className={cn("text-sm", ew.inksoft)}>
        No volunteers match this search or filter.
      </p>
    );
  }

  return (
    <div className={cn(ewCard, "overflow-hidden")}>
      <div className="hidden grid-cols-[1.2fr_1fr_auto] gap-4 border-b border-[#e6dfd5] bg-[#faf8f5]/50 px-8 py-4 text-[10px] font-bold tracking-widest text-[#5e6b65] uppercase sm:grid">
        <span>Volunteer</span>
        <span>Role & Shift</span>
        <span>Status</span>
      </div>
      <ul>
        {people.map((person) => {
          const key = participantOpsKey(
            person.assignmentExternalKey,
            person.participantKey,
          );
          const arrived = markSet.has(`participant:${key}`);
          const shift = formatParticipantShiftTime(
            person.startTime,
            person.endTime,
          );
          return (
            <li
              key={key}
              className="grid grid-cols-1 items-center gap-3 border-b border-[#e6dfd5] px-5 py-4 last:border-0 sm:grid-cols-[1.2fr_1fr_auto] sm:px-8"
            >
              <div className="flex items-center gap-3">
                <span
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#e6efe9] text-[11px] font-extrabold text-[#1c352d]"
                  aria-hidden
                >
                  {volunteerInitials(person.name)}
                </span>
                <span className={cn("font-medium", ew.ink)}>{person.name}</span>
              </div>
              <div className={cn("text-sm", ew.inksoft)}>
                <p>{person.roleName}</p>
                {shift !== "—" ? <p>{shift}</p> : null}
              </div>
              <button
                type="button"
                disabled={!canManage || pending}
                onClick={() => onToggle(key, arrived)}
                className={cn(
                  "inline-flex items-center justify-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold transition",
                  arrived
                    ? "border-[#8ea89d] bg-[#e6efe9] text-[#5a7568]"
                    : "border-[#e6dfd5] bg-white text-[#1c352d]",
                )}
              >
                {arrived ? (
                  <>
                    <Check className="h-4 w-4" aria-hidden />
                    Arrived
                  </>
                ) : (
                  "Mark Arrived"
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ItemsView({
  assignments,
  people,
  markSet,
  canManage,
  pending,
  onToggle,
}: {
  assignments: VolunteerAssignmentView[];
  people: VolunteerParticipantView[];
  markSet: Set<string>;
  canManage: boolean;
  pending: boolean;
  onToggle: (subjectKey: string, marked: boolean) => void;
}) {
  if (assignments.length === 0) {
    return (
      <p className={cn("text-sm", ew.inksoft)}>
        No items match this search or filter.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {assignments.map((assignment) => {
        const key = assignment.externalKey;
        const received = markSet.has(`item:${key}`);
        const helpers = people
          .filter((p) => p.assignmentExternalKey === key)
          .map((p) => p.name)
          .slice(0, 2);
        const qty =
          assignment.quantityFilled != null
            ? `${assignment.quantityFilled}${
                assignment.quantityRequested != null
                  ? ` / ${assignment.quantityRequested}`
                  : ""
              }`
            : null;
        return (
          <article
            key={key}
            className={cn(ewCard, "flex items-start justify-between gap-3 p-5")}
          >
            <div>
              <h3 className={cn("font-display text-lg", ew.ink)}>
                {assignment.name}
              </h3>
              <p className={cn("mt-1 text-sm", ew.inksoft)}>
                {[qty, helpers.join(", ")].filter(Boolean).join(" · ") ||
                  "Signup item"}
              </p>
            </div>
            <button
              type="button"
              disabled={!canManage || pending}
              onClick={() => onToggle(key, received)}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold",
                received
                  ? "border-[#8ea89d] bg-[#e6efe9] text-[#5a7568]"
                  : "border-[#e6dfd5] bg-white text-[#1c352d]",
              )}
            >
              {received ? (
                <>
                  <Check className="h-4 w-4" aria-hidden />
                  Received
                </>
              ) : (
                "Mark Received"
              )}
            </button>
          </article>
        );
      })}
    </div>
  );
}
