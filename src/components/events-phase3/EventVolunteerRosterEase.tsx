"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Users } from "lucide-react";
import {
  EaseBtnPrimary,
  EaseBtnSecondary,
  EaseBox,
  EaseChip,
  EaseKpi,
  EaseSectionLabel,
  EaseSoftActions,
} from "@/components/events-phase3/EventDetailEaseUi";
import { EventContextFileUpload } from "@/components/campaign-files/EventContextFileUpload";
import { formatSyncTime } from "@/lib/event-volunteers/ai-summary";
import {
  formatParticipantShiftTime,
  filterParticipantsByRole,
  filterParticipantsBySearch,
  paginateList,
  volunteerInitials,
} from "@/lib/event-volunteers/participant-list";
import {
  buildVolunteerRosterSections,
  rosterProgressTone,
  rosterSectionBadgeLabel,
  type RosterProgressTone,
  type VolunteerRosterRoleCard,
} from "@/lib/event-volunteers/roster-groups";
import {
  getVolunteerFillRateBand,
  VOLUNTEER_FILL_RATE_LABELS,
} from "@/lib/event-volunteers/org-master-shared";
import type {
  VolunteerAssignmentView,
  VolunteerParticipantView,
  VolunteerSnapshotRecord,
  VolunteerSourceRecord,
} from "@/lib/event-volunteers/types";
import { cn } from "@/lib/utils/cn";

const PAGE_SIZE = 10;
const AVATAR_STACK_MAX = 4;

const PROGRESS_BAR_CLASS: Record<RosterProgressTone, string> = {
  emerald: "bg-emerald-500",
  gold: "bg-[#c4922e]",
  rose: "bg-rose-500",
  muted: "bg-[rgba(42,38,34,0.22)]",
};

type RosterView = "list" | "grouped";

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

function Avatar({
  name,
  size = "md",
}: {
  name: string;
  size?: "sm" | "md";
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-[rgba(47,74,60,0.14)] font-extrabold tracking-wide text-[#2f4a3c]",
        size === "sm"
          ? "h-7 w-7 text-[10px]"
          : "h-9 w-9 text-[11px]",
      )}
      aria-hidden
    >
      {volunteerInitials(name)}
    </span>
  );
}

function AvatarStack({ people }: { people: VolunteerParticipantView[] }) {
  if (people.length === 0) return null;
  const visible = people.slice(0, AVATAR_STACK_MAX);
  const overflow = people.length - visible.length;
  return (
    <div className="flex items-center" aria-hidden>
      {visible.map((person, index) => (
        <span
          key={`${person.assignmentExternalKey}:${person.participantKey}`}
          className={cn(
            "inline-flex h-7 w-7 items-center justify-center rounded-full border-2 border-cos-card bg-[rgba(47,74,60,0.14)] text-[10px] font-extrabold tracking-wide text-[#2f4a3c]",
            index > 0 && "-ml-2",
          )}
        >
          {volunteerInitials(person.name)}
        </span>
      ))}
      {overflow > 0 ? (
        <span className="-ml-2 inline-flex h-7 min-w-7 items-center justify-center rounded-full border-2 border-cos-card bg-[rgba(42,38,34,0.08)] px-1.5 text-[10px] font-extrabold text-cos-muted">
          +{overflow}
        </span>
      ) : null}
    </div>
  );
}

function RoleProgressBar({ fillPercent }: { fillPercent: number | null }) {
  const tone = rosterProgressTone(fillPercent);
  const width = Math.min(100, Math.max(0, fillPercent ?? 0));
  return (
    <div className="mt-1.5 h-1 w-full max-w-[200px] overflow-hidden rounded-full bg-[rgba(42,38,34,0.08)]">
      <i
        className={cn("block h-full rounded-full", PROGRESS_BAR_CLASS[tone])}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}

function participantStatusLabel(status: VolunteerParticipantView["status"]) {
  return status === "confirmed" ? "Confirmed" : "Unknown";
}

function criticalRoleCount(assignments: VolunteerAssignmentView[]): number {
  return assignments.filter(
    (role) =>
      role.availabilityStatus === "high_need" ||
      role.availabilityStatus === "needs_help",
  ).length;
}

function roleSlotsLabel(role: VolunteerRosterRoleCard): string {
  const filled = role.assignment.quantityFilled ?? 0;
  const requested = role.assignment.quantityRequested;
  return `${filled}/${requested ?? "?"}`;
}

function GroupedRoleLine({
  role,
  expanded,
  signupUrl,
  onToggle,
}: {
  role: VolunteerRosterRoleCard;
  expanded: boolean;
  signupUrl: string | null;
  onToggle: () => void;
}) {
  const panelId = `volunteer-role-${role.assignment.externalKey}`;
  const shiftLabel = formatParticipantShiftTime(
    role.assignment.startTime,
    role.assignment.endTime,
  );
  const location = role.assignment.location?.trim() || "";
  const subtitle = [shiftLabel !== "—" ? shiftLabel : null, location || null]
    .filter(Boolean)
    .join(" · ");
  const hasPeople = role.people.length > 0;
  const filledWithoutNames =
    !hasPeople && (role.assignment.quantityFilled ?? 0) > 0;

  return (
    <div className="border-b border-[rgba(42,38,34,0.08)] last:border-0">
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-1 py-3 text-left transition hover:bg-[rgba(255,252,247,0.55)]"
      >
        <span
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[rgba(47,74,60,0.1)] text-[#2f4a3c]"
          aria-hidden
        >
          <Users className="h-4 w-4" strokeWidth={1.75} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="text-sm font-bold text-cos-text">
              {role.assignment.name}
            </span>
            <span className="text-xs font-semibold tabular-nums text-cos-muted">
              {roleSlotsLabel(role)}
            </span>
          </div>
          <RoleProgressBar fillPercent={role.fillPercent} />
        </div>
        <AvatarStack people={role.people} />
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-cos-muted transition-transform duration-200",
            expanded && "rotate-180",
          )}
          aria-hidden
        />
      </button>

      {expanded ? (
        <div id={panelId} className="pb-3 pl-[3.25rem] pr-1">
          {hasPeople ? (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {role.people.map((person) => {
                const personShift = formatParticipantShiftTime(
                  person.startTime,
                  person.endTime,
                );
                const personSub = [
                  personShift !== "—" ? personShift : null,
                  person.location?.trim() || null,
                ]
                  .filter(Boolean)
                  .join(" · ");
                return (
                  <div
                    key={`${person.assignmentExternalKey}:${person.participantKey}`}
                    className="flex items-center gap-2.5 rounded-xl border border-cos-border bg-[rgba(255,252,247,0.55)] px-3 py-2.5"
                  >
                    <Avatar name={person.name} size="sm" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-cos-text">
                        {person.name}
                      </p>
                      {personSub || subtitle ? (
                        <p className="truncate text-xs text-cos-muted">
                          {personSub || subtitle}
                        </p>
                      ) : null}
                    </div>
                  </div>
                );
              })}
              {Array.from({ length: role.openSlots }).map((_, index) => (
                <a
                  key={`open-${role.assignment.externalKey}-${index}`}
                  href={signupUrl ?? undefined}
                  className={cn(
                    "flex items-center justify-center rounded-xl border border-dashed border-cos-border px-3 py-2.5 text-sm font-semibold",
                    signupUrl
                      ? "text-[#2f4a3c] hover:bg-[rgba(47,74,60,0.06)]"
                      : "pointer-events-none text-cos-muted",
                  )}
                >
                  {signupUrl
                    ? "Assign Open Slot"
                    : "Open slot · connect signup to recruit"}
                </a>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-cos-border px-4 py-4">
              <p className="text-sm text-cos-muted">
                {filledWithoutNames
                  ? "Names aren’t shared for this role yet. Fill counts still update above."
                  : "No volunteers assigned yet."}
              </p>
              {signupUrl ? (
                <a
                  href={signupUrl}
                  className="mt-2 inline-flex text-xs font-bold text-[#2f4a3c] underline-offset-2 hover:underline"
                >
                  {filledWithoutNames ? "Open signup" : "Recruit"}
                </a>
              ) : null}
              {!filledWithoutNames && role.openSlots > 0 ? (
                <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {Array.from({
                    length: Math.min(role.openSlots, 6),
                  }).map((_, index) => (
                    <a
                      key={`empty-open-${role.assignment.externalKey}-${index}`}
                      href={signupUrl ?? undefined}
                      className={cn(
                        "flex items-center justify-center rounded-xl border border-dashed border-cos-border px-3 py-2.5 text-sm font-semibold",
                        signupUrl
                          ? "text-[#2f4a3c] hover:bg-[rgba(47,74,60,0.06)]"
                          : "pointer-events-none text-cos-muted",
                      )}
                    >
                      Assign Open Slot
                    </a>
                  ))}
                </div>
              ) : null}
            </div>
          )}
        </div>
      ) : null}
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
  const [view, setView] = useState<RosterView>("list");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [importOpen, setImportOpen] = useState(false);
  const [expandedRoles, setExpandedRoles] = useState<Record<string, boolean>>(
    {},
  );

  // Clear client filter state when switching events.
  useEffect(() => {
    setView("list");
    setSearch("");
    setRoleFilter(null);
    setPage(1);
    setImportOpen(false);
    setExpandedRoles({});
  }, [eventId]);

  const participants = snapshot.participants ?? [];
  const assignments = snapshot.assignments ?? [];
  const summary = snapshot.summary;
  const fill = summary.overallFilledPercent;
  const criticalRoles = criticalRoleCount(assignments);
  const signupUrl = source.sourceUrl;
  const hasNamedRoster = participants.length > 0;
  const filledSpots = summary.filledSpots ?? 0;

  const roleOptions = useMemo(() => {
    const names = new Set<string>();
    for (const assignment of assignments) names.add(assignment.name);
    for (const person of participants) names.add(person.roleName);
    return [...names].sort((a, b) => a.localeCompare(b));
  }, [assignments, participants]);

  const filteredPeople = useMemo(() => {
    let list = filterParticipantsBySearch(participants, search);
    list = filterParticipantsByRole(list, roleFilter);
    return list;
  }, [participants, search, roleFilter]);

  const paged = useMemo(
    () => paginateList(filteredPeople, page, PAGE_SIZE),
    [filteredPeople, page],
  );

  useEffect(() => {
    setPage(1);
  }, [search, roleFilter]);

  const groupedSections = useMemo(
    () => buildVolunteerRosterSections(assignments, participants),
    [assignments, participants],
  );

  const selectedRoleFill = useMemo(() => {
    if (!roleFilter) return null;
    const role = assignments.find((a) => a.name === roleFilter);
    if (!role) return null;
    if (
      typeof role.quantityRequested !== "number" ||
      role.quantityRequested <= 0 ||
      typeof role.quantityFilled !== "number"
    ) {
      return null;
    }
    return Math.round((role.quantityFilled / role.quantityRequested) * 100);
  }, [assignments, roleFilter]);

  const band = getVolunteerFillRateBand(roleFilter ? selectedRoleFill : fill);
  const healthLabel = band ? VOLUNTEER_FILL_RATE_LABELS[band] : "—";
  const healthValue =
    roleFilter && selectedRoleFill !== null
      ? `${selectedRoleFill}%`
      : fill !== null
        ? `${fill}%`
        : "—";

  const activeFilterCount = roleFilter ? 1 : 0;
  const updatedLabel = source.lastSuccessfulSyncAt
    ? formatSyncTime(source.lastSuccessfulSyncAt)
    : "not yet";

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <EaseSectionLabel hint={`Updated ${updatedLabel} · names when public`}>
          Volunteers
        </EaseSectionLabel>
        <div className="flex flex-wrap items-center gap-2">
          <EventContextFileUpload
            eventId={eventId}
            uploadContext="volunteers"
            disabled={pending}
          />
          <EaseBtnSecondary disabled={pending || !canManage} onClick={onRefresh}>
            Refresh
          </EaseBtnSecondary>
          <div className="relative">
            <EaseBtnPrimary
              disabled={pending}
              onClick={() => setImportOpen((open) => !open)}
            >
              Add / Import
            </EaseBtnPrimary>
            {importOpen ? (
              <div className="absolute right-0 z-20 mt-2 min-w-[220px] rounded-2xl border border-cos-border bg-cos-card p-2 shadow-[0_12px_32px_rgba(28,36,48,0.12)]">
                {signupUrl ? (
                  <a
                    href={signupUrl}
                    className="block rounded-xl px-3 py-2.5 text-sm font-bold text-cos-text hover:bg-[rgba(255,252,247,0.8)]"
                    onClick={() => setImportOpen(false)}
                  >
                    Connect Signup
                  </a>
                ) : null}
                {onReplaceConnect ? (
                  <button
                    type="button"
                    className="block w-full rounded-xl px-3 py-2.5 text-left text-sm font-bold text-cos-text hover:bg-[rgba(255,252,247,0.8)]"
                    onClick={() => {
                      setImportOpen(false);
                      onReplaceConnect();
                    }}
                  >
                    Replace signup link
                  </button>
                ) : null}
                {signupUrl ? (
                  <a
                    href={signupUrl}
                    className="block rounded-xl px-3 py-2.5 text-sm font-semibold text-cos-muted hover:bg-[rgba(255,252,247,0.8)]"
                    onClick={() => setImportOpen(false)}
                  >
                    Add Volunteer
                    <span className="mt-0.5 block text-xs font-normal">
                      Opens signup — no in-app create
                    </span>
                  </a>
                ) : (
                  <p className="px-3 py-2.5 text-xs text-cos-muted">
                    Add Volunteer isn’t available without a signup link.
                  </p>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {error ? (
        <p className="mb-3 text-sm text-[#a65a3a]">{error}</p>
      ) : null}

      <div className="mb-4 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        <EaseKpi value={healthValue} label={`Overall Health · ${healthLabel}`} />
        <EaseKpi
          value={summary.filledSpots != null ? String(summary.filledSpots) : "—"}
          label="Filled Slots"
        />
        <EaseKpi
          value={String(criticalRoles)}
          label="Unfilled / Critical roles"
        />
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div
          className="inline-flex rounded-full border border-cos-border bg-[rgba(255,252,247,0.65)] p-1"
          role="tablist"
          aria-label="Volunteer roster view"
        >
          {(
            [
              ["list", "List View"],
              ["grouped", "Grouped View"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={view === id}
              onClick={() => setView(id)}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-xs font-bold transition",
                view === id
                  ? "bg-cos-card text-cos-text shadow-[0_4px_14px_rgba(28,36,48,0.08)]"
                  : "text-cos-muted hover:text-cos-text",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or role"
          className="min-w-[200px] flex-1 rounded-full border border-cos-border bg-cos-card px-3.5 py-2 text-sm text-cos-text"
        />

        <label className="flex items-center gap-2 text-xs font-semibold text-cos-muted">
          <span>Filter</span>
          <select
            value={roleFilter ?? ""}
            onChange={(e) => setRoleFilter(e.target.value || null)}
            className="rounded-full border border-cos-border bg-cos-card px-3 py-1.5 text-xs font-bold text-cos-text"
          >
            <option value="">All roles</option>
            {roleOptions.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </label>
      </div>

      {roleFilter ? (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <EaseChip tone="forest">Role: {roleFilter}</EaseChip>
          <span className="text-xs font-semibold text-cos-muted">
            {activeFilterCount} Filter Active
          </span>
          <button
            type="button"
            className="text-xs font-bold text-cos-text underline-offset-2 hover:underline"
            onClick={() => setRoleFilter(null)}
          >
            Clear
          </button>
        </div>
      ) : null}

      {!hasNamedRoster ? (
        <EaseBox className="mb-4">
          <p className="text-sm text-cos-muted">
            {filledSpots > 0
              ? "Names aren’t shared on this public signup. Role fill health still updates below."
              : "No named volunteers yet. When SignUpGenius shares participant names, they’ll appear here."}
          </p>
          {signupUrl ? (
            <EaseSoftActions>
              <EaseBtnPrimary href={signupUrl}>Open signup</EaseBtnPrimary>
            </EaseSoftActions>
          ) : null}
        </EaseBox>
      ) : null}

      {view === "list" ? (
        <EaseBox className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-cos-border text-[11px] font-extrabold tracking-[0.06em] text-cos-muted uppercase">
                  <th className="px-4 py-3">Volunteer</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Shift Time</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {paged.pageItems.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-8 text-center text-sm text-cos-muted"
                    >
                      {hasNamedRoster
                        ? "No volunteers match this search or filter."
                        : "Named roster is empty for this event."}
                    </td>
                  </tr>
                ) : (
                  paged.pageItems.map((person) => (
                    <tr
                      key={`${person.assignmentExternalKey}:${person.participantKey}`}
                      className="border-b border-[rgba(42,38,34,0.06)] last:border-0"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar name={person.name} />
                          <span className="font-bold text-cos-text">
                            {person.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-cos-text">{person.roleName}</td>
                      <td className="px-4 py-3 text-cos-muted">
                        {formatParticipantShiftTime(
                          person.startTime,
                          person.endTime,
                        )}
                      </td>
                      <td className="px-4 py-3 text-cos-muted">
                        {person.location || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <EaseChip tone="forest">
                          {participantStatusLabel(person.status)}
                        </EaseChip>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {paged.total > PAGE_SIZE ? (
            <div className="flex items-center justify-between gap-3 border-t border-cos-border px-4 py-3 text-xs font-semibold text-cos-muted">
              <span>
                Page {paged.page} of {paged.pageCount} · {paged.total} volunteers
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={paged.page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="rounded-full border border-cos-border px-3 py-1 font-bold text-cos-text disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={paged.page >= paged.pageCount}
                  onClick={() =>
                    setPage((p) => Math.min(paged.pageCount, p + 1))
                  }
                  className="rounded-full border border-cos-border px-3 py-1 font-bold text-cos-text disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          ) : null}
        </EaseBox>
      ) : (
        <div className="flex flex-col gap-5">
          {groupedSections.map((section) => {
            const sectionRoles = section.roles.filter(
              (role) => !roleFilter || role.assignment.name === roleFilter,
            );
            if (sectionRoles.length === 0) return null;
            return (
              <div key={section.id}>
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <h3 className="font-display text-lg font-semibold text-cos-text">
                    {section.title}
                  </h3>
                  <div
                    className="mx-1 h-px min-w-[2rem] flex-1 bg-[rgba(42,38,34,0.12)]"
                    aria-hidden
                  />
                  <EaseChip
                    tone={
                      section.badge === "needs_attention" ? "warn" : "forest"
                    }
                  >
                    {rosterSectionBadgeLabel(section.badge)}
                  </EaseChip>
                  <span className="text-xs font-semibold tabular-nums text-cos-muted">
                    {section.filledSpots != null && section.totalSpots != null
                      ? `${section.filledSpots}/${section.totalSpots} Filled`
                      : "Fill n/a"}
                  </span>
                </div>
                <EaseBox className="overflow-hidden p-2 sm:p-3">
                  {sectionRoles.map((role) => (
                    <GroupedRoleLine
                      key={role.assignment.externalKey}
                      role={role}
                      expanded={Boolean(
                        expandedRoles[role.assignment.externalKey],
                      )}
                      signupUrl={signupUrl}
                      onToggle={() =>
                        setExpandedRoles((current) => ({
                          ...current,
                          [role.assignment.externalKey]:
                            !current[role.assignment.externalKey],
                        }))
                      }
                    />
                  ))}
                </EaseBox>
              </div>
            );
          })}
          {groupedSections.every(
            (section) =>
              section.roles.filter(
                (role) => !roleFilter || role.assignment.name === roleFilter,
              ).length === 0,
          ) ? (
            <EaseBox>
              <p className="text-sm text-cos-muted">
                No roles match this filter.
              </p>
            </EaseBox>
          ) : null}
        </div>
      )}

      {assignments.length > 0 ? (
        <div className="mt-5">
          <EaseSectionLabel>Role breakdown</EaseSectionLabel>
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {assignments.map((role) => {
              const roleFill =
                typeof role.quantityRequested === "number" &&
                role.quantityRequested > 0 &&
                typeof role.quantityFilled === "number"
                  ? Math.round(
                      (role.quantityFilled / role.quantityRequested) * 100,
                    )
                  : null;
              const selected = roleFilter === role.name;
              return (
                <button
                  key={role.externalKey}
                  type="button"
                  onClick={() =>
                    setRoleFilter((current) =>
                      current === role.name ? null : role.name,
                    )
                  }
                  className={cn(
                    "rounded-2xl border px-3.5 py-3 text-left transition",
                    selected
                      ? "border-[#2f4a3c] bg-[rgba(47,74,60,0.08)]"
                      : "border-cos-border bg-cos-card hover:border-[rgba(47,74,60,0.35)]",
                  )}
                >
                  <strong className="block text-sm font-bold text-cos-text">
                    {role.name}
                  </strong>
                  <span className="mt-1 block text-xs text-cos-muted">
                    {role.quantityFilled ?? 0} / {role.quantityRequested ?? "?"}{" "}
                    filled
                    {roleFill != null ? ` · ${roleFill}%` : ""}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </section>
  );
}
