"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowDown,
  Building2,
  CalendarDays,
  LayoutList,
  Network,
  Search,
  UserRound,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { cn } from "@/lib/utils/cn";
import type { OrganizationCommittee, OrganizationRole } from "@/types/organization-workspace";
import type { UnifiedTeamMember } from "@/components/settings-v2/team-access/team-access-utils";
import {
  buildOrganizationStructureModel,
  filterOrganizationStructureModel,
  responsibilityLabelForRole,
  sortCommitteeCards,
  type CommitteeStructureCard,
  type LeadershipStructureCard,
  type OpenPositionItem,
  type OrgStructureAssignment,
  type OrgStructureEventOption,
  type OrgStructurePersonRef,
  type OrgStructureViewMode,
} from "@/components/settings-v2/team-access/organization-structure-utils";
import type { OrganizationWorkspaceData } from "@/types/organization-workspace";

interface TeamAccessOrganizationStructureProps {
  workspace: OrganizationWorkspaceData;
  members: UnifiedTeamMember[];
  assignments: OrgStructureAssignment[];
  events: OrgStructureEventOption[];
  canManage: boolean;
  onAddLeadershipRole: () => void;
  onCreateCommittee: (parentRoleId?: string) => void;
  onAddRosterPerson: () => void;
  onEditRole: (role: OrganizationRole) => void;
  onEditCommittee: (committee: OrganizationCommittee) => void;
  onManageTeam: (committeeId: string) => void;
  onOpenPerson: (memberId: string) => void;
  onAssignOpenPosition: (item: OpenPositionItem) => void;
}

function SummaryStat({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-cos-border bg-cos-card px-5 py-4 shadow-sm">
      <p className="text-xs font-medium tracking-[0.12em] text-cos-muted uppercase">
        {label}
      </p>
      <p className="mt-2 font-display text-3xl text-cos-text">{value}</p>
    </div>
  );
}

function PersonAvatar({ person }: { person: OrgStructurePersonRef }) {
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-cos-border bg-cos-bg text-xs font-semibold text-cos-text">
      {person.initials}
    </div>
  );
}

function PersonChip({
  person,
  emptyLabel = "Not Assigned",
  onOpenPerson,
}: {
  person: OrgStructurePersonRef | null;
  emptyLabel?: string;
  onOpenPerson: (memberId: string) => void;
}) {
  if (!person) {
    return (
      <span className="text-sm text-cos-muted italic">{emptyLabel}</span>
    );
  }

  return (
    <div className="flex min-w-0 items-center gap-3">
      <PersonAvatar person={person} />
      <div className="min-w-0">
        {person.memberId ? (
          <button
            type="button"
            onClick={() => onOpenPerson(person.memberId!)}
            className="truncate text-sm font-medium text-cos-text hover:underline"
          >
            {person.displayName}
          </button>
        ) : (
          <p className="truncate text-sm font-medium text-cos-text">
            {person.displayName}
          </p>
        )}
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <Badge variant="default">{person.accessBadge}</Badge>
          {person.email ? (
            <span className="truncate text-xs text-cos-muted">{person.email}</span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function HierarchyArrow() {
  return (
    <div className="flex justify-center py-1 text-cos-muted">
      <ArrowDown className="h-4 w-4" strokeWidth={1.5} />
    </div>
  );
}

function LeadershipCard({
  card,
  canManage,
  onOpenPerson,
  onEditRole,
}: {
  card: LeadershipStructureCard;
  canManage: boolean;
  onOpenPerson: (memberId: string) => void;
  onEditRole: (role: OrganizationRole) => void;
}) {
  return (
    <article className="rounded-2xl border border-cos-border bg-cos-card p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium tracking-[0.12em] text-cos-muted uppercase">
            Leadership role
          </p>
          <h3 className="mt-1 font-display text-2xl text-cos-text">
            {card.role.name}
          </h3>
        </div>
        {card.isOpen ? (
          <Badge variant="warning">Open Position</Badge>
        ) : (
          <Badge variant="info">Assigned</Badge>
        )}
      </div>

      <div className="mt-4 space-y-3">
        <PersonChip
          person={card.person}
          emptyLabel="Open Position"
          onOpenPerson={onOpenPerson}
        />
        <p className="text-sm text-cos-muted">
          Reports to:{" "}
          <span className="text-cos-text">
            {card.reportsTo ?? "Not Assigned"}
          </span>
        </p>
        <p className="text-sm text-cos-muted">
          Teams supervised:{" "}
          <span className="text-cos-text">
            {card.supervisedCommittees.length > 0
              ? card.supervisedCommittees.map((c) => c.name).join(", ")
              : "None"}
          </span>
        </p>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {card.person?.memberId ? (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => onOpenPerson(card.person!.memberId!)}
          >
            Open Person
          </Button>
        ) : null}
        {canManage ? (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => onEditRole(card.role)}
          >
            Edit Assignment
          </Button>
        ) : null}
      </div>
    </article>
  );
}

function CommitteeCard({
  card,
  canManage,
  onOpenPerson,
  onEditCommittee,
  onManageTeam,
}: {
  card: CommitteeStructureCard;
  canManage: boolean;
  onOpenPerson: (memberId: string) => void;
  onEditCommittee: (committee: OrganizationCommittee) => void;
  onManageTeam: (committeeId: string) => void;
}) {
  return (
    <article className="rounded-2xl border border-cos-border bg-cos-card p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium tracking-[0.12em] text-cos-muted uppercase">
            Committee / Team
          </p>
          <h3 className="mt-1 font-display text-2xl text-cos-text">
            {card.committee.name}
          </h3>
        </div>
        <Badge variant="default">{card.memberCount} members</Badge>
      </div>

      <dl className="mt-4 space-y-3 text-sm">
        <div>
          <dt className="text-xs tracking-[0.1em] text-cos-muted uppercase">
            {responsibilityLabelForRole("supervising_vp")}
          </dt>
          <dd className="mt-1">
            <PersonChip person={card.supervisor} onOpenPerson={onOpenPerson} />
          </dd>
        </div>
        <div>
          <dt className="text-xs tracking-[0.1em] text-cos-muted uppercase">
            {responsibilityLabelForRole("chair")}
          </dt>
          <dd className="mt-1">
            <PersonChip person={card.eventLead} onOpenPerson={onOpenPerson} />
          </dd>
        </div>
        <div>
          <dt className="text-xs tracking-[0.1em] text-cos-muted uppercase">
            {responsibilityLabelForRole("co_chair")}
          </dt>
          <dd className="mt-1">
            <PersonChip
              person={card.assistantLead}
              onOpenPerson={onOpenPerson}
            />
          </dd>
        </div>
        <div>
          <dt className="text-xs tracking-[0.1em] text-cos-muted uppercase">
            Assigned Event
          </dt>
          <dd className="mt-1">
            {card.assignedEvent ? (
              <Link
                href={`/events/${card.assignedEvent.id}`}
                className="inline-flex items-center gap-1.5 font-medium text-cos-text hover:underline"
              >
                <CalendarDays className="h-3.5 w-3.5" strokeWidth={1.5} />
                {card.assignedEvent.title}
              </Link>
            ) : (
              <span className="text-cos-muted italic">Not Assigned</span>
            )}
          </dd>
        </div>
      </dl>

      <div className="mt-5 flex flex-wrap gap-2">
        {card.assignedEvent ? (
          <Button
            size="sm"
            variant="secondary"
            href={`/events/${card.assignedEvent.id}`}
          >
            Open Event
          </Button>
        ) : null}
        {canManage ? (
          <>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => onManageTeam(card.committee.id)}
            >
              Manage Team
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => onEditCommittee(card.committee)}
            >
              Edit
            </Button>
          </>
        ) : null}
      </div>
    </article>
  );
}

function StructureView({
  leadership,
  committees,
  canManage,
  onOpenPerson,
  onEditRole,
  onEditCommittee,
  onManageTeam,
}: {
  leadership: LeadershipStructureCard[];
  committees: CommitteeStructureCard[];
  canManage: boolean;
  onOpenPerson: (memberId: string) => void;
  onEditRole: (role: OrganizationRole) => void;
  onEditCommittee: (committee: OrganizationCommittee) => void;
  onManageTeam: (committeeId: string) => void;
}) {
  if (leadership.length === 0 && committees.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-cos-border bg-cos-card px-6 py-10 text-center">
        <Building2 className="mx-auto h-8 w-8 text-cos-muted" strokeWidth={1.25} />
        <p className="mt-3 font-display text-xl text-cos-text">
          No organization structure yet
        </p>
        <p className="mt-1 text-sm text-cos-muted">
          Add a leadership role or create a committee to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {leadership.map((leader) => {
        const nested = committees.filter(
          (card) => card.committee.parentRoleId === leader.role.id,
        );
        return (
          <section key={leader.role.id} className="space-y-3">
            <LeadershipCard
              card={leader}
              canManage={canManage}
              onOpenPerson={onOpenPerson}
              onEditRole={onEditRole}
            />
            {nested.map((team) => (
              <div key={team.committee.id} className="pl-0 sm:pl-6">
                <HierarchyArrow />
                <div className="rounded-2xl border border-cos-border/80 bg-cos-bg/40 p-4 sm:p-5">
                  <p className="text-xs font-medium tracking-[0.12em] text-cos-muted uppercase">
                    Supervisor → Committee / Team
                  </p>
                  <h4 className="mt-1 font-display text-xl text-cos-text">
                    {team.committee.name}
                  </h4>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <div className="rounded-xl border border-cos-border bg-cos-card p-4">
                      <p className="text-xs tracking-[0.1em] text-cos-muted uppercase">
                        {responsibilityLabelForRole("chair")}
                      </p>
                      <div className="mt-2">
                        <PersonChip
                          person={team.eventLead}
                          onOpenPerson={onOpenPerson}
                        />
                      </div>
                    </div>
                    <div className="rounded-xl border border-cos-border bg-cos-card p-4">
                      <p className="text-xs tracking-[0.1em] text-cos-muted uppercase">
                        {responsibilityLabelForRole("co_chair")}
                      </p>
                      <div className="mt-2">
                        <PersonChip
                          person={team.assistantLead}
                          onOpenPerson={onOpenPerson}
                        />
                      </div>
                    </div>
                    <div className="rounded-xl border border-cos-border bg-cos-card p-4 md:col-span-2">
                      <p className="text-xs tracking-[0.1em] text-cos-muted uppercase">
                        {responsibilityLabelForRole("member")}s
                      </p>
                      <div className="mt-2 space-y-2">
                        {team.members.length > 0 ? (
                          team.members.map((member) => (
                            <PersonChip
                              key={`${team.committee.id}-${member.organizationMemberId ?? member.displayName}`}
                              person={member}
                              onOpenPerson={onOpenPerson}
                            />
                          ))
                        ) : (
                          <span className="text-sm text-cos-muted italic">
                            Not Assigned
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="rounded-xl border border-cos-border bg-cos-card p-4 md:col-span-2">
                      <p className="text-xs tracking-[0.1em] text-cos-muted uppercase">
                        Assigned Event
                      </p>
                      <div className="mt-2">
                        {team.assignedEvent ? (
                          <Link
                            href={`/events/${team.assignedEvent.id}`}
                            className="font-medium text-cos-text hover:underline"
                          >
                            {team.assignedEvent.title}
                          </Link>
                        ) : (
                          <span className="text-sm text-cos-muted italic">
                            Not Assigned
                          </span>
                        )}
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {team.assignedEvent ? (
                          <Button
                            size="sm"
                            variant="secondary"
                            href={`/events/${team.assignedEvent.id}`}
                          >
                            Open Event
                          </Button>
                        ) : null}
                        {canManage ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            onClick={() => onManageTeam(team.committee.id)}
                          >
                            Manage Team
                          </Button>
                        ) : null}
                        {canManage ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            onClick={() => onEditCommittee(team.committee)}
                          >
                            Edit
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </section>
        );
      })}

      {committees.filter((card) => !card.committee.parentRoleId).length > 0 ? (
        <section className="space-y-3">
          <h3 className="font-display text-xl text-cos-text">
            Unassigned committees
          </h3>
          <div className="grid gap-4 xl:grid-cols-2">
            {committees
              .filter((card) => !card.committee.parentRoleId)
              .map((card) => (
                <CommitteeCard
                  key={card.committee.id}
                  card={card}
                  canManage={canManage}
                  onOpenPerson={onOpenPerson}
                  onEditCommittee={onEditCommittee}
                  onManageTeam={onManageTeam}
                />
              ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

export function TeamAccessOrganizationStructure({
  workspace,
  members,
  assignments,
  events,
  canManage,
  onAddLeadershipRole,
  onCreateCommittee,
  onAddRosterPerson,
  onEditRole,
  onEditCommittee,
  onManageTeam,
  onOpenPerson,
  onAssignOpenPosition,
}: TeamAccessOrganizationStructureProps) {
  const [viewMode, setViewMode] = useState<OrgStructureViewMode>("structure");
  const [search, setSearch] = useState("");
  const [supervisorRoleId, setSupervisorRoleId] = useState("");
  const [committeeId, setCommitteeId] = useState("");
  const [openPositionsOnly, setOpenPositionsOnly] = useState(false);
  const [appAccess, setAppAccess] = useState("");
  const [sort, setSort] = useState<"name" | "supervisor" | "members" | "open">(
    "name",
  );

  const model = useMemo(
    () =>
      buildOrganizationStructureModel({
        workspace,
        members,
        assignments,
        events,
      }),
    [workspace, members, assignments, events],
  );

  const filtered = useMemo(
    () =>
      filterOrganizationStructureModel(model, {
        search,
        supervisorRoleId,
        committeeId,
        openPositionsOnly,
        appAccess,
      }),
    [
      model,
      search,
      supervisorRoleId,
      committeeId,
      openPositionsOnly,
      appAccess,
    ],
  );

  const sortedCommittees = useMemo(
    () => sortCommitteeCards(filtered.committees, sort),
    [filtered.committees, sort],
  );

  const supervisorOptions = model.leadership.map((card) => card.role);
  const committeeOptions = model.committees.map((card) => card.committee);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="font-display text-3xl text-cos-text">
            Organization Structure
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-cos-muted">
            Manage leadership, committees, teams, and responsibilities across
            your organization.
          </p>
        </div>
        {canManage ? (
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="md" onClick={onAddLeadershipRole}>
              + Add Leadership Role
            </Button>
            <Button
              type="button"
              size="md"
              variant="secondary"
              onClick={() => onCreateCommittee()}
            >
              + Create Committee / Team
            </Button>
            <Button
              type="button"
              size="md"
              variant="secondary"
              onClick={onAddRosterPerson}
            >
              + Add Roster Person
            </Button>
          </div>
        ) : null}
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <SummaryStat
          label="Leadership Roles"
          value={model.summary.leadershipRoles}
        />
        <SummaryStat
          label="Teams / Committees"
          value={model.summary.teamsCommittees}
        />
        <SummaryStat
          label="Roster Members"
          value={model.summary.rosterMembers}
        />
        <SummaryStat
          label="Open Positions"
          value={model.summary.openPositions}
        />
        <SummaryStat
          label="People with App Access"
          value={model.summary.peopleWithAppAccess}
        />
      </div>

      <div className="rounded-2xl border border-cos-border bg-cos-card p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 z-10 h-4 w-4 -translate-y-1/2 text-cos-muted" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search person, role, committee, or event"
              className="pl-9"
              aria-label="Search organization structure"
            />
          </div>
          <Select
            value={supervisorRoleId}
            onChange={(event) => setSupervisorRoleId(event.target.value)}
            className="lg:w-48"
          >
            <option value="">All supervisors</option>
            {supervisorOptions.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </Select>
          <Select
            value={committeeId}
            onChange={(event) => setCommitteeId(event.target.value)}
            className="lg:w-48"
          >
            <option value="">All committees</option>
            {committeeOptions.map((committee) => (
              <option key={committee.id} value={committee.id}>
                {committee.name}
              </option>
            ))}
          </Select>
          <Select
            value={appAccess}
            onChange={(event) => setAppAccess(event.target.value)}
            className="lg:w-44"
          >
            <option value="">All app access</option>
            <option value="Roster Only">Roster Only</option>
            <option value="Invited">Invited</option>
            <option value="Active">Active</option>
            <option value="View Only">View Only</option>
            <option value="Contributor">Contributor</option>
            <option value="Tester">Tester</option>
            <option value="Developer">Developer</option>
            <option value="Admin">Admin</option>
            <option value="President">President</option>
          </Select>
          <label className="inline-flex items-center gap-2 text-sm text-cos-text">
            <input
              type="checkbox"
              checked={openPositionsOnly}
              onChange={(event) => setOpenPositionsOnly(event.target.checked)}
              className="rounded border-cos-border"
            />
            Open Positions
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex rounded-xl border border-cos-border bg-cos-bg p-1">
            <button
              type="button"
              onClick={() => setViewMode("structure")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm",
                viewMode === "structure"
                  ? "bg-cos-card text-cos-text shadow-sm"
                  : "text-cos-muted",
              )}
            >
              <Network className="h-3.5 w-3.5" />
              Structure View
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm",
                viewMode === "list"
                  ? "bg-cos-card text-cos-text shadow-sm"
                  : "text-cos-muted",
              )}
            >
              <LayoutList className="h-3.5 w-3.5" />
              List View
            </button>
          </div>
          {viewMode === "list" ? (
            <Select
              value={sort}
              onChange={(event) =>
                setSort(
                  event.target.value as
                    | "name"
                    | "supervisor"
                    | "members"
                    | "open",
                )
              }
              className="w-44"
            >
              <option value="name">Sort by name</option>
              <option value="supervisor">Sort by supervisor</option>
              <option value="members">Sort by members</option>
              <option value="open">Sort by open roles</option>
            </Select>
          ) : null}
        </div>
      </div>

      {viewMode === "structure" ? (
        <StructureView
          leadership={filtered.leadership}
          committees={filtered.committees}
          canManage={canManage}
          onOpenPerson={onOpenPerson}
          onEditRole={onEditRole}
          onEditCommittee={onEditCommittee}
          onManageTeam={onManageTeam}
        />
      ) : (
        <div className="space-y-6">
          <section className="space-y-3">
            <h3 className="inline-flex items-center gap-2 font-display text-xl text-cos-text">
              <UserRound className="h-5 w-5" strokeWidth={1.5} />
              Leadership
            </h3>
            {filtered.leadership.length === 0 ? (
              <p className="text-sm text-cos-muted">No leadership roles match.</p>
            ) : (
              <div className="grid gap-4 xl:grid-cols-2">
                {filtered.leadership.map((card) => (
                  <LeadershipCard
                    key={card.role.id}
                    card={card}
                    canManage={canManage}
                    onOpenPerson={onOpenPerson}
                    onEditRole={onEditRole}
                  />
                ))}
              </div>
            )}
          </section>

          <section className="space-y-3">
            <h3 className="inline-flex items-center gap-2 font-display text-xl text-cos-text">
              <Users className="h-5 w-5" strokeWidth={1.5} />
              Committees / Teams
            </h3>
            {sortedCommittees.length === 0 ? (
              <p className="text-sm text-cos-muted">No committees match.</p>
            ) : (
              <div className="grid gap-4 xl:grid-cols-2">
                {sortedCommittees.map((card) => (
                  <CommitteeCard
                    key={card.committee.id}
                    card={card}
                    canManage={canManage}
                    onOpenPerson={onOpenPerson}
                    onEditCommittee={onEditCommittee}
                    onManageTeam={onManageTeam}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="font-display text-xl text-cos-text">Open Positions</h3>
            <p className="mt-1 text-sm text-cos-muted">
              Roles and teams that still need people or an assigned event.
            </p>
          </div>
          <Badge variant="warning">
            {filtered.openPositions.length} open
          </Badge>
        </div>

        {filtered.openPositions.length === 0 ? (
          <div className="rounded-2xl border border-cos-border bg-cos-card px-5 py-8 text-sm text-cos-muted">
            No open positions right now.
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.openPositions.map((item) => (
              <div
                key={item.id}
                className="flex flex-col gap-3 rounded-2xl border border-dashed border-cos-border bg-cos-card px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium text-cos-text">{item.label}</p>
                  <p className="mt-0.5 text-sm text-cos-muted">{item.detail}</p>
                </div>
                {canManage ? (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => onAssignOpenPosition(item)}
                    >
                      Assign Person
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={onAddRosterPerson}
                    >
                      Add Roster Person
                    </Button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
