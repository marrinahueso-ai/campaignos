"use client";

import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  KeyRound,
  Lock,
  Mail,
  MoreVertical,
  Pencil,
  Phone,
  UserX,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { EventArtworkPreview } from "@/components/events/EventArtworkPreview";
import { resolveMemberEditContext } from "@/components/settings-v2/team-access/member-edit-utils";
import {
  accessBadgeVariant,
  formatCount,
  formatMemberEmail,
  formatMemberPhone,
  formatRelativeDate,
  type UnifiedTeamMember,
} from "@/components/settings-v2/team-access/team-access-utils";
import {
  CAMPAIGN_ROLES,
  campaignRoleLabel,
  type CampaignRole,
} from "@/lib/auth/campaign-roles";
import { hasDisplayableArtwork } from "@/lib/event-workspace/has-displayable-artwork";
import type { HeroArtworkSelection } from "@/lib/event-workspace/select-hero-artwork";
import type { OrganizationWorkspaceData } from "@/types/organization-workspace";
import { cn } from "@/lib/utils/cn";

export type PersonProfileTab =
  | "overview"
  | "events"
  | "responsibilities"
  | "access"
  | "activity";

export type TeamAccessEventOption = {
  id: string;
  title: string;
  date?: string | null;
  status?: string | null;
  /** From getEventArtworkMap(eventId) — never resolved by title. */
  artwork?: HeroArtworkSelection | null;
};

export function teamAccessPersonProfilePath(memberId: string): string {
  return `/settings/team-access/people/${encodeURIComponent(memberId)}`;
}

interface TeamAccessPersonProfileProps {
  member: UnifiedTeamMember;
  activeTab: PersonProfileTab;
  onTabChange: (tab: PersonProfileTab) => void;
  workspace: OrganizationWorkspaceData;
  onEdit: () => void;
  onInvite: () => void;
  onResendInvite: () => void;
  onCancelInvite: () => void;
  onSendMessage: () => void;
  onDeactivate: () => void;
  onArchive: () => void;
  onRemove: () => void;
  onViewTasks: () => void;
  onSelectCommittee: (committeeId: string) => void;
  onSaveAccessLevel?: (campaignRole: CampaignRole) => Promise<string | null>;
  onSaveEventAssignments?: (eventIds: string[]) => Promise<string | null>;
  events?: TeamAccessEventOption[];
  canManage: boolean;
}

const TABS: { id: PersonProfileTab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "events", label: "Events" },
  { id: "responsibilities", label: "Responsibilities" },
  { id: "access", label: "Access & Settings" },
  { id: "activity", label: "Activity" },
];

function statusBadge(status: UnifiedTeamMember["status"]) {
  switch (status) {
    case "active":
      return <Badge variant="success">Active</Badge>;
    case "invited":
      return <Badge variant="warning">Invited</Badge>;
    case "deactivated":
      return <Badge variant="default">Inactive</Badge>;
    case "roster":
      return (
        <Badge variant="default" className="bg-[#ece8e1] text-cos-muted">
          Roster Only
        </Badge>
      );
  }
}

function loginStatusLabel(member: UnifiedTeamMember): string {
  switch (member.status) {
    case "active":
      return "Login enabled";
    case "invited":
      return "Invited";
    case "deactivated":
      return "Inactive";
    case "roster":
      return "Roster Only";
  }
}

function resolvePrimaryTeam(member: UnifiedTeamMember): string {
  const direct = member.committees.find(
    (assignment) => assignment.roleOnCommittee !== "vp",
  );
  if (direct) {
    return direct.committee.name;
  }
  if (member.vpPortfolio) {
    return member.vpPortfolio;
  }
  if (member.committees[0]) {
    return member.committees[0].committee.name;
  }
  return "—";
}

function reportsToLabel(member: UnifiedTeamMember): string {
  return member.reportsTo?.trim() || "Not assigned";
}

function committeeStatusBadge(status: string) {
  switch (status) {
    case "on_track":
      return <Badge variant="success">On track</Badge>;
    case "needs_attention":
      return <Badge variant="warning">Needs attention</Badge>;
    case "open_role":
      return <Badge variant="info">Open role</Badge>;
    default:
      return <Badge variant="default">{status}</Badge>;
  }
}

function eventStatusBadge(status: string | null | undefined) {
  if (!status) {
    return null;
  }
  switch (status) {
    case "published":
      return <Badge variant="success">Active</Badge>;
    case "scheduled":
      return <Badge variant="info">Upcoming</Badge>;
    case "draft":
      return <Badge variant="default">Draft</Badge>;
    case "archived":
      return <Badge variant="default">Archived</Badge>;
    default:
      return <Badge variant="default">{status}</Badge>;
  }
}

function formatEventDate(date: string | null | undefined): string {
  if (!date) {
    return "—";
  }
  const parsed = new Date(`${date}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return date;
  }
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function roleOnCommitteeLabel(
  role: string,
  member: UnifiedTeamMember,
): string {
  switch (role) {
    case "vp":
      if (member.isPresident) {
        return "President portfolio";
      }
      if (member.isVp) {
        return "VP oversight";
      }
      return member.organizationRoleName
        ? `${member.organizationRoleName} portfolio`
        : "Role portfolio";
    case "chair":
      return "Committee Chair";
    case "co_chair":
      return "Committee Co-Chair";
    case "member":
      return "Committee Member";
    case "supervising_vp":
      return "Supervising VP";
    default:
      return role.replace("_", " ");
  }
}

function formatCommitteeLeaders(
  assignment: UnifiedTeamMember["committees"][number],
): string {
  if (assignment.memberNames.length === 0) {
    return "Open role";
  }
  return assignment.memberNames.join(", ");
}

function SummaryCard({
  label,
  value,
  badge,
  supporting,
}: {
  label: string;
  value: string;
  badge?: ReactNode;
  supporting?: string;
}) {
  return (
    <div className="rounded-xl border border-cos-border bg-cos-card p-4 shadow-sm">
      <p className="text-[11px] font-medium uppercase tracking-wide text-cos-muted">
        {label}
      </p>
      <p className="mt-2 text-base font-semibold text-cos-text">{value}</p>
      {supporting ? (
        <p className="mt-1 text-xs text-cos-muted">{supporting}</p>
      ) : null}
      {badge ? <div className="mt-2.5">{badge}</div> : null}
    </div>
  );
}

function QuickActionRow({
  icon: Icon,
  label,
  description,
  onClick,
  danger,
}: {
  icon: LucideIcon;
  label: string;
  description: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors hover:bg-cos-bg"
    >
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
          danger ? "bg-red-50 text-red-600" : "bg-cos-bg text-cos-muted",
        )}
      >
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "text-sm font-medium leading-snug",
            danger ? "text-red-600" : "text-cos-text",
          )}
        >
          {label}
        </p>
        <p className="mt-0.5 text-[11px] leading-snug text-cos-muted">
          {description}
        </p>
      </div>
      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-cos-muted" />
    </button>
  );
}

function EventAssignmentList({
  assignedEvents,
  emptyLabel,
  showOpenAction,
}: {
  assignedEvents: TeamAccessEventOption[];
  emptyLabel: string;
  showOpenAction?: boolean;
}) {
  if (assignedEvents.length === 0) {
    return <p className="text-sm text-cos-muted">{emptyLabel}</p>;
  }

  return (
    <div className="space-y-2">
      {assignedEvents.map((event) => {
        const showThumb = hasDisplayableArtwork(event.artwork ?? null);
        return (
          <div
            key={event.id}
            className="flex items-center gap-3 rounded-xl border border-cos-border px-3 py-2.5"
          >
            {showThumb ? (
              <EventArtworkPreview
                artwork={event.artwork ?? null}
                eventTitle={event.title}
                variant="thumbnail"
                className="shrink-0"
              />
            ) : (
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-cos-border bg-cos-bg">
                <Calendar className="h-5 w-5 text-cos-muted" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-cos-text">
                {event.title}
              </p>
              <p className="mt-0.5 text-xs text-cos-muted">
                {formatEventDate(event.date)}
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <Badge variant="default" className="bg-[#ece8e1] text-cos-muted">
                  Assigned
                </Badge>
                {eventStatusBadge(event.status)}
              </div>
            </div>
            {showOpenAction !== false ? (
              <Button
                href={`/events/${event.id}`}
                variant="secondary"
                size="sm"
                className="shrink-0"
              >
                Open Event
              </Button>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export function TeamAccessPersonProfile({
  member,
  activeTab,
  onTabChange,
  workspace,
  onEdit,
  onInvite,
  onResendInvite,
  onCancelInvite,
  onSendMessage,
  onDeactivate,
  onArchive,
  onRemove,
  onViewTasks,
  onSelectCommittee,
  onSaveAccessLevel,
  onSaveEventAssignments,
  events = [],
  canManage,
}: TeamAccessPersonProfileProps) {
  const [draftAccessLevel, setDraftAccessLevel] =
    useState<CampaignRole>("view_only");
  const [accessError, setAccessError] = useState<string | null>(null);
  const [isSavingAccess, startSaveAccess] = useTransition();
  const [draftEventIds, setDraftEventIds] = useState<string[]>([]);
  const [eventError, setEventError] = useState<string | null>(null);
  const [isSavingEvents, startSaveEvents] = useTransition();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  const editContext = useMemo(
    () => (member ? resolveMemberEditContext(member, workspace) : null),
    [member, workspace],
  );
  const canEditAccess = Boolean(
    canManage &&
      editContext?.canEditAccess &&
      onSaveAccessLevel &&
      !member.isRosterOnly,
  );
  const canEditEvents = Boolean(
    canManage &&
      onSaveEventAssignments &&
      (member.organizationMemberId || member.raw),
  );

  useEffect(() => {
    setDraftAccessLevel(member.accessLevel);
    setAccessError(null);
    setDraftEventIds(member.assignedEventIds ?? member.raw?.assignedEventIds ?? []);
    setEventError(null);
    setMoreOpen(false);
  }, [member]);

  useEffect(() => {
    if (!moreOpen) {
      return;
    }
    function handleClickOutside(event: MouseEvent) {
      if (
        moreMenuRef.current &&
        !moreMenuRef.current.contains(event.target as Node)
      ) {
        setMoreOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [moreOpen]);

  const primaryTeam = resolvePrimaryTeam(member);
  const reportsTo = reportsToLabel(member);
  const eventTabCount = member.assignedEventIds.length;
  const responsibilityCount = member.committees.length;
  const eventsById = new Map(events.map((event) => [event.id, event]));
  const assignedEvents = member.assignedEventIds
    .map(
      (id) =>
        eventsById.get(id) ?? {
          id,
          title: "Assigned event",
          date: null,
          status: null,
        },
    )
    .filter(Boolean);
  const overviewEventPreview = assignedEvents.slice(0, 4);

  const accessLevelDirty = draftAccessLevel !== member.accessLevel;
  const showGiveAppAccess =
    canManage && (member.isRosterOnly || member.emailMissing);
  const showResendInvite =
    canManage && member.status === "invited" && Boolean(member.raw);
  const showDeactivate = canManage && Boolean(member.raw);

  function handleSaveAccessLevel() {
    if (!onSaveAccessLevel || !accessLevelDirty) {
      return;
    }

    startSaveAccess(async () => {
      const error = await onSaveAccessLevel(draftAccessLevel);
      if (error) {
        setAccessError(error);
        return;
      }
      setAccessError(null);
    });
  }

  function handleSaveEventAssignments() {
    if (!onSaveEventAssignments) {
      return;
    }
    startSaveEvents(async () => {
      const error = await onSaveEventAssignments(draftEventIds);
      if (error) {
        setEventError(error);
        return;
      }
      setEventError(null);
    });
  }

  const moreItems = [
    ...(canManage
      ? [{ id: "edit", label: "Edit Profile", onClick: onEdit }]
      : []),
    ...(canEditAccess
      ? [
          {
            id: "change-access",
            label: "Change Access",
            onClick: () => onTabChange("access"),
          },
        ]
      : []),
    {
      id: "responsibilities",
      label: "View responsibilities",
      onClick: () => onTabChange("responsibilities"),
    },
    { id: "tasks", label: "View tasks", onClick: onViewTasks },
    {
      id: "message",
      label: "Send message",
      onClick: onSendMessage,
      disabled: member.emailMissing,
    },
    ...(showGiveAppAccess
      ? [{ id: "invite", label: "Give App Access", onClick: onInvite }]
      : []),
    ...(showResendInvite
      ? [
          { id: "resend", label: "Resend Invite", onClick: onResendInvite },
          { id: "cancel", label: "Cancel invite", onClick: onCancelInvite },
        ]
      : []),
    ...(showDeactivate
      ? [{ id: "deactivate", label: "Deactivate Access", onClick: onDeactivate }]
      : []),
    ...(canManage
      ? [{ id: "archive", label: "Archive", onClick: onArchive }]
      : []),
    ...(canManage && member.raw
      ? [{ id: "remove", label: "Remove", onClick: onRemove, danger: true }]
      : []),
  ];

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/settings/team-access"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-cos-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to People
        </Link>

        <div className="mt-5 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 flex-1 items-start gap-5">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border border-cos-border bg-cos-bg text-lg font-semibold text-cos-text shadow-sm">
              {member.initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="font-display text-3xl leading-tight text-cos-text sm:text-4xl">
                  {member.displayName}
                </h1>
                {statusBadge(member.status)}
              </div>
              <p className="mt-2 text-base font-medium text-cos-text">
                {member.orgRoleLabel}
              </p>
              {primaryTeam !== "—" && primaryTeam !== member.orgRoleLabel ? (
                <p className="mt-0.5 text-sm text-cos-muted">{primaryTeam}</p>
              ) : null}
              {member.isRosterOnly ? (
                <p className="mt-1.5 text-sm text-cos-muted">No app access yet.</p>
              ) : null}
              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-cos-muted">
                <span className="inline-flex items-center gap-1.5">
                  <Mail className="h-4 w-4 shrink-0" />
                  {formatMemberEmail(member)}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Phone className="h-4 w-4 shrink-0" />
                  {formatMemberPhone(member)}
                </span>
              </div>
            </div>
          </div>

          {canManage ? (
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <Button type="button" variant="secondary" size="md" onClick={onEdit}>
                <Pencil className="h-4 w-4" />
                Edit Profile
              </Button>
              {showGiveAppAccess ? (
                <Button type="button" size="md" onClick={onInvite}>
                  <Lock className="h-4 w-4" />
                  Give App Access
                </Button>
              ) : null}
              <div className="relative" ref={moreMenuRef}>
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  aria-label="More actions"
                  onClick={() => setMoreOpen((current) => !current)}
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
                {moreOpen ? (
                  <div className="absolute right-0 z-20 mt-1 min-w-[220px] rounded-xl border border-cos-border bg-cos-card py-1 shadow-lg">
                    {moreItems.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        disabled={"disabled" in item ? item.disabled : false}
                        onClick={() => {
                          item.onClick();
                          setMoreOpen(false);
                        }}
                        className={cn(
                          "block w-full px-4 py-2.5 text-left text-sm transition-colors hover:bg-cos-bg disabled:cursor-not-allowed disabled:opacity-50",
                          "danger" in item && item.danger
                            ? "text-red-600"
                            : "text-cos-text",
                        )}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <SummaryCard
              label="Organization Role"
              value={member.orgRoleLabel}
              badge={
                member.vpPortfolio ? (
                  <Badge variant="info">{member.vpPortfolio}</Badge>
                ) : undefined
              }
            />
            <SummaryCard
              label="App Access"
              value={member.isRosterOnly ? "Roster Only" : member.accessLabel}
              supporting={member.isRosterOnly ? "No app access yet." : undefined}
              badge={
                <Badge
                  variant={
                    member.isRosterOnly
                      ? "default"
                      : member.status === "active"
                        ? "success"
                        : member.status === "invited"
                          ? "warning"
                          : "default"
                  }
                  className={
                    member.isRosterOnly ? "bg-[#ece8e1] text-cos-muted" : undefined
                  }
                >
                  {loginStatusLabel(member)}
                </Badge>
              }
            />
            <SummaryCard
              label="Primary Team"
              value={primaryTeam}
              badge={
                primaryTeam !== "—" ? (
                  <Badge variant="warning">Primary Team</Badge>
                ) : undefined
              }
            />
            <SummaryCard
              label="Member Since"
              value={formatRelativeDate(member.joinedAt)}
            />
            <SummaryCard label="Reports To" value={reportsTo} />
        </div>

        <div className="mt-8 flex flex-wrap gap-1 border-b border-cos-border">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange(tab.id)}
                className={cn(
                  "shrink-0 border-b-2 px-4 py-3 text-sm font-medium transition-colors",
                  activeTab === tab.id
                    ? "border-cos-primary text-cos-text"
                    : "border-transparent text-cos-muted hover:text-cos-text",
                )}
              >
                {tab.label}
                {tab.id === "events" && eventTabCount > 0
                  ? ` (${eventTabCount})`
                  : ""}
                {tab.id === "responsibilities" && responsibilityCount > 0
                  ? ` (${responsibilityCount})`
                  : ""}
              </button>
            ))}
        </div>
      </div>

      <div>
          {activeTab === "overview" && (
            <div className="space-y-5">
              {member.isRosterOnly ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3.5 text-sm text-amber-950">
                  <p className="font-semibold">Roster Only</p>
                  <p className="mt-1 text-amber-900">No app access yet.</p>
                </div>
              ) : null}

              <div className="grid gap-5 lg:grid-cols-2">
                <section className="rounded-xl border border-cos-border p-5 shadow-sm">
                  <h3 className="font-display text-xl text-cos-text">
                    About This Person
                  </h3>
                  <dl className="mt-3 space-y-2.5 text-sm">
                    <div className="flex justify-between gap-3">
                      <dt className="text-cos-muted">Organization title</dt>
                      <dd className="text-right font-medium text-cos-text">
                        {member.orgRoleLabel}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-cos-muted">Reports to</dt>
                      <dd className="text-right text-cos-text">{reportsTo}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-cos-muted">Primary team</dt>
                      <dd className="text-right text-cos-text">{primaryTeam}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-cos-muted">Email</dt>
                      <dd className="text-right text-cos-text">
                        {formatMemberEmail(member)}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-cos-muted">Phone</dt>
                      <dd className="text-right text-cos-text">
                        {formatMemberPhone(member)}
                      </dd>
                    </div>
                  </dl>
                </section>

                <section className="rounded-xl border border-cos-border p-5 shadow-sm">
                  <h3 className="font-display text-xl text-cos-text">
                    App Access & Login
                  </h3>
                  <dl className="mt-3 space-y-2.5 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-cos-muted">App access level</dt>
                      <dd>
                        {member.isRosterOnly ? (
                          <Badge
                            variant="default"
                            className="bg-[#ece8e1] text-cos-muted"
                          >
                            Roster Only
                          </Badge>
                        ) : (
                          <Badge variant={accessBadgeVariant(member.accessLevel)}>
                            {member.accessLabel}
                          </Badge>
                        )}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-cos-muted">Login status</dt>
                      <dd>
                        <Badge
                          variant={
                            member.status === "active"
                              ? "success"
                              : member.status === "invited"
                                ? "warning"
                                : "default"
                          }
                          className={
                            member.isRosterOnly
                              ? "bg-[#ece8e1] text-cos-muted"
                              : undefined
                          }
                        >
                          {loginStatusLabel(member)}
                        </Badge>
                      </dd>
                    </div>
                    {member.isRosterOnly ? (
                      <p className="text-xs text-cos-muted">No app access yet.</p>
                    ) : null}
                  </dl>
                  {canManage ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {canEditAccess ? (
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => onTabChange("access")}
                        >
                          Change Access
                        </Button>
                      ) : null}
                      {showGiveAppAccess ? (
                        <Button type="button" size="sm" onClick={onInvite}>
                          Give App Access
                        </Button>
                      ) : null}
                      {showResendInvite ? (
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={onResendInvite}
                        >
                          Resend Invite
                        </Button>
                      ) : null}
                      {showDeactivate ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={onDeactivate}
                        >
                          Deactivate Access
                        </Button>
                      ) : null}
                    </div>
                  ) : null}
                </section>
              </div>

              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
                <div className="space-y-4">
                  <section className="rounded-xl border border-cos-border p-4 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="font-display text-lg text-cos-text">
                        Event Responsibilities
                      </h3>
                      {canEditEvents ? (
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => onTabChange("events")}
                        >
                          Manage Event Assignments
                        </Button>
                      ) : null}
                    </div>
                    <div className="mt-3">
                      <EventAssignmentList
                        assignedEvents={overviewEventPreview}
                        emptyLabel="No event assignments yet."
                      />
                    </div>
                    {assignedEvents.length > overviewEventPreview.length ? (
                      <button
                        type="button"
                        onClick={() => onTabChange("events")}
                        className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-cos-primary hover:underline"
                      >
                        View all {assignedEvents.length} events
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    ) : null}
                  </section>

                  <section className="rounded-xl border border-cos-border p-4 shadow-sm">
                    <h3 className="font-display text-lg text-cos-text">
                      Recent Activity
                    </h3>
                    <p className="mt-3 text-sm text-cos-muted">
                      No activity has been recorded for this person yet.
                    </p>
                  </section>
                </div>

                {canManage ? (
                  <section className="h-fit rounded-xl border border-cos-border p-3 shadow-sm lg:sticky lg:top-4">
                    <h3 className="px-2 font-display text-base text-cos-text">
                      Quick Actions
                    </h3>
                    <div className="mt-2 space-y-0.5">
                      <QuickActionRow
                        icon={Pencil}
                        label="Edit Profile"
                        description="Name, title, contact, team"
                        onClick={onEdit}
                      />
                      {canEditEvents ? (
                        <QuickActionRow
                          icon={Calendar}
                          label="Manage Event Assignments"
                          description="Assign or remove events"
                          onClick={() => onTabChange("events")}
                        />
                      ) : null}
                      {showGiveAppAccess ? (
                        <QuickActionRow
                          icon={KeyRound}
                          label="Give App Access"
                          description="Create a login invite"
                          onClick={onInvite}
                        />
                      ) : canEditAccess ? (
                        <QuickActionRow
                          icon={Lock}
                          label="Change Access"
                          description="Update app access level"
                          onClick={() => onTabChange("access")}
                        />
                      ) : null}
                      {showResendInvite ? (
                        <QuickActionRow
                          icon={Mail}
                          label="Resend Invite"
                          description="Refresh invite link"
                          onClick={onResendInvite}
                        />
                      ) : null}
                      {showDeactivate ? (
                        <QuickActionRow
                          icon={UserX}
                          label="Deactivate Access"
                          description="Remove login access"
                          onClick={onDeactivate}
                          danger
                        />
                      ) : null}
                    </div>
                  </section>
                ) : null}
              </div>
            </div>
          )}

          {activeTab === "events" && (
            <div className="space-y-5">
              <div>
                <h3 className="font-display text-lg text-cos-text">
                  Assigned Events
                </h3>
                <p className="mt-1 text-sm text-cos-muted">
                  Events this person currently works on.
                </p>
                <div className="mt-3">
                  <EventAssignmentList
                    assignedEvents={assignedEvents}
                    emptyLabel="No event assignments yet."
                    showOpenAction
                  />
                </div>
              </div>

              {canEditEvents ? (
                <div className="rounded-xl border border-cos-border bg-cos-bg/50 p-4">
                  <p className="text-xs font-medium tracking-[0.12em] text-cos-muted uppercase">
                    Manage Event Assignments
                  </p>
                  <div className="mt-2 max-h-56 space-y-2 overflow-y-auto">
                    {events.length === 0 ? (
                      <p className="text-xs text-cos-muted">No events available.</p>
                    ) : (
                      events.map((event) => (
                        <label
                          key={event.id}
                          className="flex items-center gap-2 text-sm text-cos-text"
                        >
                          <input
                            type="checkbox"
                            checked={draftEventIds.includes(event.id)}
                            onChange={() => {
                              setDraftEventIds((current) =>
                                current.includes(event.id)
                                  ? current.filter((id) => id !== event.id)
                                  : [...current, event.id],
                              );
                              setEventError(null);
                            }}
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block">{event.title}</span>
                            <span className="block text-xs text-cos-muted">
                              {formatEventDate(event.date)}
                            </span>
                          </span>
                        </label>
                      ))
                    )}
                  </div>
                  {eventError ? (
                    <p className="mt-2 text-xs text-red-600">{eventError}</p>
                  ) : null}
                  <Button
                    type="button"
                    size="sm"
                    className="mt-3"
                    disabled={isSavingEvents}
                    onClick={handleSaveEventAssignments}
                  >
                    {isSavingEvents ? "Saving…" : "Save event assignments"}
                  </Button>
                </div>
              ) : null}
            </div>
          )}

          {activeTab === "responsibilities" && (
            <div className="space-y-5">
              <div>
                <h3 className="font-display text-lg text-cos-text">
                  Responsibilities
                </h3>
                <p className="mt-1 text-sm text-cos-muted">
                  {member.hasRoleOversight
                    ? `Committees under ${member.organizationRoleName ?? member.displayName}`
                    : "Committee and oversight assignments"}
                </p>
              </div>
              {member.committees.length === 0 ? (
                <p className="text-sm text-cos-muted">No committee assignments.</p>
              ) : (
                member.committees.map((assignment) => (
                  <button
                    key={assignment.committee.id}
                    type="button"
                    onClick={() => onSelectCommittee(assignment.committee.id)}
                    className="w-full rounded-xl border border-cos-border p-4 text-left transition-colors hover:border-cos-primary/40 hover:bg-cos-bg"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-cos-text">
                          {assignment.committee.name}
                        </p>
                        <p className="mt-1 text-sm text-cos-muted">
                          {roleOnCommitteeLabel(assignment.roleOnCommittee, member)}
                        </p>
                        {assignment.roleOnCommittee === "vp" ? (
                          <p className="mt-1 text-xs text-cos-muted">
                            {formatCommitteeLeaders(assignment)}
                          </p>
                        ) : null}
                        {assignment.committee.parentRoleName ? (
                          <p className="mt-1 text-sm text-cos-muted">
                            Portfolio: {assignment.committee.parentRoleName}
                          </p>
                        ) : null}
                      </div>
                      {committeeStatusBadge(assignment.status)}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-cos-muted">
                      {assignment.roleOnCommittee === "vp" ? (
                        <span>Members: {assignment.memberCount || "—"}</span>
                      ) : null}
                      <span>Open tasks: {formatCount(assignment.openTasks)}</span>
                      <span>Campaigns: {formatCount(assignment.campaigns)}</span>
                      <span>Approvals: {formatCount(assignment.approvals)}</span>
                    </div>
                  </button>
                ))
              )}

              <div>
                <h4 className="text-sm font-semibold text-cos-text">
                  Assigned events
                </h4>
                <div className="mt-2">
                  <EventAssignmentList
                    assignedEvents={assignedEvents}
                    emptyLabel="No event assignments yet."
                    showOpenAction
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === "access" && (
            <div className="space-y-4 text-sm">
              <section className="rounded-xl border border-cos-border p-4 shadow-sm">
                <h3 className="font-display text-lg text-cos-text">
                  Access & Settings
                </h3>
                <dl className="mt-3 space-y-2.5">
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-cos-muted">Roster status</dt>
                    <dd>
                      <Badge
                        variant={
                          member.status === "active"
                            ? "success"
                            : member.status === "invited"
                              ? "warning"
                              : "default"
                        }
                        className={
                          member.isRosterOnly
                            ? "bg-[#ece8e1] text-cos-muted"
                            : undefined
                        }
                      >
                        {member.isRosterOnly
                          ? "Roster Only"
                          : loginStatusLabel(member)}
                      </Badge>
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-cos-muted">Login status</dt>
                    <dd>
                      <Badge
                        variant={
                          member.status === "active"
                            ? "success"
                            : member.status === "invited"
                              ? "warning"
                              : "default"
                        }
                        className={
                          member.isRosterOnly
                            ? "bg-[#ece8e1] text-cos-muted"
                            : undefined
                        }
                      >
                        {loginStatusLabel(member)}
                      </Badge>
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-cos-muted">App access level</dt>
                    <dd>
                      {member.isRosterOnly ? (
                        <Badge
                          variant="default"
                          className="bg-[#ece8e1] text-cos-muted"
                        >
                          Roster Only
                        </Badge>
                      ) : (
                        <Badge variant={accessBadgeVariant(member.accessLevel)}>
                          {member.accessLabel}
                        </Badge>
                      )}
                    </dd>
                  </div>
                </dl>
                {member.isRosterOnly ? (
                  <p className="mt-3 text-xs text-cos-muted">No app access yet.</p>
                ) : null}

                {canManage ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={onEdit}
                    >
                      <Pencil className="h-4 w-4" />
                      Edit Profile
                    </Button>
                    {showGiveAppAccess ? (
                      <Button type="button" size="sm" onClick={onInvite}>
                        Give App Access
                      </Button>
                    ) : null}
                    {showResendInvite ? (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={onResendInvite}
                      >
                        Resend Invite
                      </Button>
                    ) : null}
                    {showDeactivate ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={onDeactivate}
                      >
                        Deactivate Access
                      </Button>
                    ) : null}
                    {canEditEvents ? (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => onTabChange("events")}
                      >
                        Manage Event Assignments
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </section>

              {canEditAccess ? (
                <div className="rounded-xl border border-cos-border bg-cos-bg/50 p-4">
                  <Select
                    label="Change Access"
                    value={draftAccessLevel}
                    disabled={isSavingAccess}
                    onChange={(event) => {
                      setDraftAccessLevel(event.target.value as CampaignRole);
                      setAccessError(null);
                    }}
                  >
                    {CAMPAIGN_ROLES.map((role) => (
                      <option key={role} value={role}>
                        {campaignRoleLabel(role)}
                      </option>
                    ))}
                  </Select>
                  <p className="mt-2 text-xs text-cos-muted">
                    Access level controls what this member can do in Hey Ralli.
                  </p>
                  {accessError ? (
                    <p className="mt-2 text-xs text-red-600">{accessError}</p>
                  ) : null}
                  {accessLevelDirty ? (
                    <Button
                      type="button"
                      size="sm"
                      className="mt-3"
                      disabled={isSavingAccess}
                      onClick={handleSaveAccessLevel}
                    >
                      {isSavingAccess ? "Saving…" : "Save access level"}
                    </Button>
                  ) : null}
                </div>
              ) : member.isRosterOnly ? (
                <p className="text-cos-muted">
                  No app access yet. Use Give App Access to create a login invite.
                </p>
              ) : canManage && !canEditAccess ? (
                <p className="text-cos-muted">
                  Access level cannot be changed for this member.
                </p>
              ) : null}
            </div>
          )}

          {activeTab === "activity" && (
            <div className="rounded-xl border border-cos-border p-10 text-center shadow-sm">
              <h3 className="font-display text-xl text-cos-text">Activity</h3>
              <p className="mt-2 text-sm text-cos-muted">
                No activity has been recorded for this person yet.
              </p>
            </div>
          )}
      </div>
    </div>
  );
}
