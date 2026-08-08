"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  Check,
  ExternalLink,
  PartyPopper,
  RefreshCw,
  Users,
} from "lucide-react";
import {
  ew,
  ewCard,
} from "@/components/events-phase3/event-workspace-tokens";
import { formatSyncTime } from "@/lib/event-volunteers/ai-summary";
import {
  listEventVolunteerOpsAction,
  toggleEventVolunteerOpAction,
} from "@/lib/event-volunteers/actions";
import {
  formatParticipantShiftTime,
  volunteerInitials,
} from "@/lib/event-volunteers/participant-list";
import {
  buildVolunteerRosterSections,
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
  return `${filled}/${requested ?? "?"}`;
}

function isFullyStaffed(snapshot: VolunteerSnapshotRecord): boolean {
  const { totalSpots, openSpots, filledSpots, quantitiesComplete } =
    snapshot.summary;
  if (!quantitiesComplete) return false;
  if (totalSpots == null || totalSpots <= 0) return false;
  return (openSpots ?? 0) === 0 && (filledSpots ?? 0) >= totalSpots;
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
  const syncLabel = source.lastSuccessfulSyncAt
    ? `Synced ${formatSyncTime(source.lastSuccessfulSyncAt)}`
    : "Not synced yet";

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className={cn("font-display text-2xl", ew.ink)} data-testid="event-detail-tab-volunteers">
            Volunteers
          </h2>
          <p className={cn("mt-1 text-sm", ew.inksoft)}>
            <span className={cn("font-semibold tabular-nums", ew.ink)}>
              {filled}
            </span>
            {total != null ? (
              <>
                {" "}
                of{" "}
                <span className="tabular-nums">{total}</span> spots filled
              </>
            ) : (
              " filled spots"
            )}
            <span className="mx-2 text-[#e6dfd5]">·</span>
            {syncLabel}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={onRefresh}
            className={cn(
              "inline-flex items-center gap-2 rounded-full border border-[#e6dfd5] bg-white px-3.5 py-2 text-sm font-medium",
              ew.ink,
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
                "inline-flex items-center gap-2 rounded-full border border-[#e6dfd5] bg-white px-3.5 py-2 text-sm font-medium",
                ew.ink,
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
              className={cn("text-sm font-medium underline-offset-2 hover:underline", ew.inksoft)}
            >
              Replace link
            </button>
          ) : null}
        </div>
      </header>

      {error || opsError ? (
        <p className="text-sm text-[#a65a3a]" role="alert">
          {error ?? opsError}
        </p>
      ) : null}

      {fullyStaffed ? (
        <div
          className={cn(
            ewCard,
            "flex flex-wrap items-center gap-4 bg-[#e6efe9] px-6 py-5",
          )}
        >
          <PartyPopper className={cn("h-8 w-8", ew.sageDeep)} aria-hidden />
          <div>
            <p className={cn("font-display text-xl", ew.ink)}>
              Volunteers Fully Staffed
            </p>
            <p className={cn("text-sm", ew.inksoft)}>
              {total != null
                ? `All ${total} positions filled`
                : "Operational goal reached"}
            </p>
          </div>
        </div>
      ) : null}

      <div
        className="inline-flex rounded-full border border-[#e6dfd5] bg-white p-1"
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
              "rounded-full px-4 py-1.5 text-sm font-semibold transition",
              view === id
                ? "bg-[#1c352d] text-white"
                : "text-[#5e6b65] hover:text-[#1c352d]",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {view === "coverage" ? (
        <CoverageView
          roles={roles}
          signupUrl={source.sourceUrl}
        />
      ) : null}

      {view === "people" ? (
        <PeopleView
          people={people}
          markSet={markSet}
          canManage={canManage}
          pending={opsPending}
          onToggle={(key, marked) =>
            toggleMark("participant", key, marked)
          }
        />
      ) : null}

      {view === "items" ? (
        <ItemsView
          assignments={assignments}
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
  signupUrl,
}: {
  roles: VolunteerRosterRoleCard[];
  signupUrl: string | null;
}) {
  if (roles.length === 0) {
    return (
      <p className={cn("text-sm", ew.inksoft)}>
        No roles in the latest signup snapshot.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      {roles.map((role) => {
        const pct = fillPercent(role);
        const underfilled = pct < 100;
        const shift = formatParticipantShiftTime(
          role.assignment.startTime,
          role.assignment.endTime,
        );
        return (
          <article
            key={role.assignment.externalKey}
            className={cn(ewCard, "flex flex-col gap-5 p-6")}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className={cn("font-display text-xl", ew.ink)}>
                  {role.assignment.name}
                </h3>
                <p className={cn("mt-1 text-sm tabular-nums", ew.inksoft)}>
                  {roleSlotsLabel(role)} filled
                  {shift !== "—" ? ` · ${shift}` : null}
                </p>
              </div>
              {!underfilled ? (
                <span className="rounded-full bg-[#e6efe9] px-2.5 py-1 text-[11px] font-bold text-[#5a7568]">
                  Fully Staffed
                </span>
              ) : (
                <span className="rounded-full bg-[#f4f0ea] px-2.5 py-1 text-[11px] font-bold text-[#1c352d]">
                  Still Needed
                </span>
              )}
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-[#f4f0ea]">
              <div
                className={cn(
                  "h-full rounded-full",
                  underfilled ? "bg-[#c5a880]" : "bg-[#8ea89d]",
                )}
                style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
              />
            </div>
            {role.people.length > 0 ? (
              <ul className="space-y-2">
                {role.people.map((person) => (
                  <li
                    key={`${person.assignmentExternalKey}:${person.participantKey}`}
                    className="flex items-center gap-2 text-sm"
                  >
                    <span
                      className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#e6efe9] text-[10px] font-extrabold text-[#1c352d]"
                      aria-hidden
                    >
                      {volunteerInitials(person.name)}
                    </span>
                    <span className={ew.ink}>{person.name}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={cn("text-sm", ew.inksoft)}>
                {(role.assignment.quantityFilled ?? 0) > 0
                  ? "Names not shared publicly yet."
                  : "No volunteers assigned yet."}
              </p>
            )}
            {underfilled && signupUrl ? (
              <a
                href={signupUrl}
                target="_blank"
                rel="noreferrer"
                className={cn(
                  "mt-auto inline-flex items-center gap-2 text-sm font-semibold",
                  ew.sageDeep,
                )}
              >
                <Users className="h-4 w-4" aria-hidden />
                Open signup to fill
              </a>
            ) : null}
          </article>
        );
      })}
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
        No named volunteers yet. Refresh after SignUpGenius shares participant
        names.
      </p>
    );
  }

  return (
    <div className={cn(ewCard, "overflow-hidden")}>
      <div className="hidden grid-cols-[1.2fr_1fr_auto] gap-4 border-b border-[#e6dfd5] px-5 py-3 text-xs font-bold tracking-wide text-[#5e6b65] uppercase sm:grid">
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
              className="grid grid-cols-1 items-center gap-3 border-b border-[#e6dfd5] px-5 py-4 last:border-0 sm:grid-cols-[1.2fr_1fr_auto]"
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
        No signup items in the latest snapshot.
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
