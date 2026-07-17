"use client";

import {
  ArrowLeft,
  Calendar,
  Link2,
  Lock,
  Mail,
  MoreVertical,
  Pencil,
  Phone,
  Search,
  User,
} from "lucide-react";
import Link from "next/link";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { EventArtworkPreview } from "@/components/events/EventArtworkPreview";
import { resolveMemberEditContext } from "@/components/settings-v2/team-access/member-edit-utils";
import {
  accessBadgeVariant,
  buildPersonEventInvolvements,
  canResendTeamInvite,
  formatMemberEmail,
  formatMemberPhone,
  resendTeamInviteLabel,
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
  /** @deprecated Legacy deep-link only — redirected to events. */
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
  onSaveAccessLevel?: (campaignRole: CampaignRole | string) => Promise<string | null>;
  onSaveEventAssignments?: (eventIds: string[]) => Promise<string | null>;
  /** Link a team/role to a real Event ID (fixes “No event linked”). */
  onLinkCommitteeEvent?: (
    committeeId: string,
    eventId: string,
  ) => Promise<string | null>;
  /** Remove Event ID tie and/or team role for this involvement. */
  onRemoveEventInvolvement?: (input: {
    eventId: string | null;
    committeeId: string | null;
  }) => Promise<string | null>;
  events?: TeamAccessEventOption[];
  canManage: boolean;
  /** Org-custom access template display names. */
  accessLabels?: Partial<Record<string, string>> | null;
  accessTemplates?: import("@/lib/access-templates/types").AccessTemplate[];
}

const TABS: { id: Exclude<PersonProfileTab, "responsibilities">; label: string }[] =
  [
    { id: "overview", label: "Overview" },
    { id: "events", label: "Events" },
    { id: "access", label: "Access" },
    { id: "activity", label: "Activity" },
  ];

function loginStatusLabel(member: UnifiedTeamMember): string {
  switch (member.status) {
    case "active":
      return "Login enabled";
    case "invited":
      return "Invited";
    case "deactivated":
      return "Inactive";
    case "roster":
      return "Not Invited";
  }
}

function heroSubtitle(member: UnifiedTeamMember, _primaryRole: string): string {
  const roleBit = member.accessLabel;
  const loginBit = member.isRosterOnly
    ? "Not invited to login yet"
    : member.status === "invited"
      ? "Invite pending"
      : member.status === "deactivated"
        ? "Login inactive"
        : "Login enabled";
  return `${roleBit} · ${loginBit}`;
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

/** Searchable event picker — always shows title + date for year-to-year duplicates. */
function EventSearchPicker({
  events,
  excludeIds = [],
  placeholder,
  emptyLabel,
  disabled,
  onSelect,
}: {
  events: TeamAccessEventOption[];
  excludeIds?: string[];
  placeholder: string;
  emptyLabel: string;
  disabled?: boolean;
  onSelect: (eventId: string) => void;
}) {
  const [query, setQuery] = useState("");
  const exclude = useMemo(() => new Set(excludeIds), [excludeIds]);
  const search = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!search) {
      return [];
    }
    return events
      .filter((event) => !exclude.has(event.id))
      .filter((event) => {
        const haystack = `${event.title} ${formatEventDate(event.date)}`.toLowerCase();
        return haystack.includes(search);
      })
      .slice(0, 12);
  }, [events, exclude, search]);

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-cos-muted" />
        <Input
          value={query}
          disabled={disabled}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={placeholder}
          className="h-10 pl-9"
          aria-label={placeholder}
        />
      </div>
      {search ? (
        <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-cos-border bg-cos-card p-1">
          {filtered.length === 0 ? (
            <p className="px-2 py-2 text-xs text-cos-muted">{emptyLabel}</p>
          ) : (
            filtered.map((event) => (
              <button
                key={event.id}
                type="button"
                disabled={disabled}
                // onMouseDown + preventDefault avoids click-through onto Remove
                // when this list unmounts under the cursor.
                onMouseDown={(mouseEvent) => {
                  mouseEvent.preventDefault();
                  mouseEvent.stopPropagation();
                  if (disabled) {
                    return;
                  }
                  onSelect(event.id);
                  setQuery("");
                }}
                className="flex w-full flex-col rounded-md px-2.5 py-2 text-left transition-colors hover:bg-cos-bg disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="truncate text-sm font-medium text-cos-text">
                  {event.title}
                </span>
                <span className="text-xs text-cos-muted">
                  {formatEventDate(event.date)}
                </span>
              </button>
            ))
          )}
        </div>
      ) : (
        <p className="text-xs text-cos-muted">
          Type a name or date to find the matching event.
        </p>
      )}
    </div>
  );
}

function StatusChip({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof User;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2.5 px-4 py-3">
      <Icon className="h-4 w-4 shrink-0 text-cos-muted" aria-hidden />
      <p className="truncate text-sm text-cos-text">
        <span className="text-cos-muted">{label}:</span>{" "}
        <span className="font-medium">{value}</span>
      </p>
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
  onSaveAccessLevel,
  onSaveEventAssignments,
  onLinkCommitteeEvent,
  onRemoveEventInvolvement,
  events = [],
  canManage,
  accessLabels = null,
  accessTemplates = [],
}: TeamAccessPersonProfileProps) {
  const [linkingCommitteeId, setLinkingCommitteeId] = useState<string | null>(
    null,
  );
  /** Which unlinked card has the search picker open (keeps rows compact). */
  const [linkPickerCommitteeId, setLinkPickerCommitteeId] = useState<
    string | null
  >(null);
  const [draftAccessLevel, setDraftAccessLevel] = useState("view_only");
  const [accessError, setAccessError] = useState<string | null>(null);
  const [isSavingAccess, startSaveAccess] = useTransition();
  const [draftEventIds, setDraftEventIds] = useState<string[]>([]);
  const [eventError, setEventError] = useState<string | null>(null);
  const [removingEventId, setRemovingEventId] = useState<string | null>(null);
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
  const canRemoveInvolvements = Boolean(
    canManage &&
      onRemoveEventInvolvement &&
      (member.organizationMemberId || member.raw),
  );

  useEffect(() => {
    setDraftAccessLevel(member.accessTemplateId ?? member.accessLevel);
    setAccessError(null);
    setDraftEventIds(member.assignedEventIds ?? member.raw?.assignedEventIds ?? []);
    setEventError(null);
    setRemovingEventId(null);
    setLinkPickerCommitteeId(null);
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
  const eventsById = new Map(events.map((event) => [event.id, event]));
  const eventTitlesById = useMemo(
    () => new Map(events.map((event) => [event.id, event.title] as const)),
    [events],
  );
  const eventInvolvements = useMemo(
    () => buildPersonEventInvolvements(member, eventTitlesById),
    [member, eventTitlesById],
  );
  const eventTabCount = eventInvolvements.length;
  const overviewInvolvements = eventInvolvements.slice(0, 4);
  const primaryRoleLabel =
    eventInvolvements[0]?.roleLabel ||
    (primaryTeam !== "—" ? primaryTeam : member.orgRoleLabel);
  const highlightEventTitle = eventInvolvements[0]?.title ?? null;
  const firstName = member.displayName.trim().split(/\s+/)[0] || member.displayName;
  const accessChipValue = member.isRosterOnly ? "—" : member.accessLabel;

  const currentAccessKey = member.accessTemplateId ?? member.accessLevel;
  const accessLevelDirty = draftAccessLevel !== currentAccessKey;
  const accessSelectOptions =
    accessTemplates.length > 0
      ? accessTemplates.map((template) => ({
          id: template.id,
          label: template.displayName,
        }))
      : CAMPAIGN_ROLES.map((role) => ({
          id: role,
          label: accessLabels?.[role] ?? campaignRoleLabel(role),
        }));
  const showGiveAppAccess =
    canManage && (member.isRosterOnly || member.emailMissing);
  const showResendInvite = canResendTeamInvite(member, canManage);
  const resendInviteLabel = resendTeamInviteLabel(member);
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

  function handleRemoveEventInvolvement(input: {
    eventId: string | null;
    committeeId: string | null;
  }) {
    if (!onRemoveEventInvolvement) {
      return;
    }
    const previousIds = draftEventIds;
    const pendingKey = input.eventId
      ? input.eventId
      : input.committeeId
        ? `committee:${input.committeeId}`
        : null;
    if (!pendingKey) {
      return;
    }
    if (input.eventId) {
      setDraftEventIds((current) =>
        current.filter((id) => id !== input.eventId),
      );
    }
    setRemovingEventId(pendingKey);
    setEventError(null);
    startSaveEvents(async () => {
      try {
        const error = await onRemoveEventInvolvement(input);
        if (error) {
          setEventError(error);
          setDraftEventIds(previousIds);
          return;
        }
        setEventError(null);
      } catch {
        setEventError("Unable to remove this event role. Try again.");
        setDraftEventIds(previousIds);
      } finally {
        setRemovingEventId(null);
      }
    });
  }

  function handleAddEventAssignment(eventId: string) {
    if (!onSaveEventAssignments || draftEventIds.includes(eventId)) {
      return;
    }
    const previousIds = draftEventIds;
    const nextIds = [...previousIds, eventId];
    setDraftEventIds(nextIds);
    setEventError(null);
    startSaveEvents(async () => {
      const error = await onSaveEventAssignments(nextIds);
      if (error) {
        setEventError(error);
        setDraftEventIds(previousIds);
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
      id: "events",
      label: "View events",
      onClick: () => onTabChange("events"),
    },
    { id: "tasks", label: "View tasks", onClick: onViewTasks },
    {
      id: "message",
      label: "Send message",
      onClick: onSendMessage,
      disabled: member.emailMissing,
    },
    ...(showGiveAppAccess
      ? [{ id: "invite", label: "Invite to Login", onClick: onInvite }]
      : []),
    ...(showResendInvite
      ? [
          { id: "resend", label: resendInviteLabel, onClick: onResendInvite },
          ...(member.status === "invited"
            ? [
                {
                  id: "cancel",
                  label: "Cancel invite",
                  onClick: onCancelInvite,
                },
              ]
            : []),
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
          className="inline-flex items-center gap-1.5 text-sm text-cos-muted transition-colors hover:text-cos-text"
        >
          <ArrowLeft className="h-4 w-4" />
          People
        </Link>

        <div className="mt-5 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 flex-1 items-start gap-5">
            <div className="flex h-[5.25rem] w-[5.25rem] shrink-0 items-center justify-center rounded-full bg-[#e7eee6] font-display text-2xl text-cos-text">
              {member.initials}
            </div>
            <div className="min-w-0 flex-1 pt-1">
              <h1 className="font-display text-3xl leading-tight text-cos-text sm:text-[2.5rem]">
                {member.displayName}
              </h1>
              <p className="mt-2 text-sm text-cos-muted sm:text-base">
                {heroSubtitle(member, primaryRoleLabel)}
              </p>
            </div>
          </div>

          {canManage ? (
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {showGiveAppAccess ? (
                <Button type="button" size="md" onClick={onInvite}>
                  Invite to Login
                </Button>
              ) : null}
              <Button type="button" variant="secondary" size="md" onClick={onEdit}>
                Edit
              </Button>
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

        <div className="mt-7 grid overflow-hidden rounded-2xl border border-cos-border bg-cos-card sm:grid-cols-3">
          <StatusChip
            icon={User}
            label="Login"
            value={loginStatusLabel(member)}
          />
          <div className="border-t border-cos-border sm:border-t-0 sm:border-l">
            <StatusChip icon={Lock} label="Access" value={accessChipValue} />
          </div>
          <div className="border-t border-cos-border sm:border-t-0 sm:border-l">
            <StatusChip
              icon={Calendar}
              label="Events"
              value={String(eventTabCount)}
            />
          </div>
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
                  ? "border-[#5c6b4f] text-cos-text"
                  : "border-transparent text-cos-muted hover:text-cos-text",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div>
          {activeTab === "overview" && (
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
              <section>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-display text-xl text-cos-text">
                    Assigned Events
                  </h3>
                  {canEditEvents ? (
                    <button
                      type="button"
                      onClick={() => onTabChange("events")}
                      className="text-sm font-medium text-cos-muted transition-colors hover:text-cos-text"
                    >
                      Manage
                    </button>
                  ) : null}
                </div>
                <div className="mt-4 space-y-3">
                  {overviewInvolvements.length === 0 ? (
                    <p className="rounded-2xl border border-dashed border-cos-border px-4 py-8 text-center text-sm text-cos-muted">
                      No event assignments yet.
                    </p>
                  ) : (
                    overviewInvolvements.map((involvement) => {
                      const event = involvement.eventId
                        ? (eventsById.get(involvement.eventId) ?? null)
                        : null;
                      const showThumb = hasDisplayableArtwork(
                        event?.artwork ?? null,
                      );
                      const rowKey =
                        involvement.eventId ??
                        involvement.committeeId ??
                        involvement.title;
                      return (
                        <div
                          key={rowKey}
                          className="flex items-start gap-3 rounded-2xl border border-cos-border bg-cos-card p-3 shadow-sm"
                        >
                          {involvement.eventId && showThumb ? (
                            <EventArtworkPreview
                              artwork={event?.artwork ?? null}
                              eventTitle={involvement.title}
                              variant="thumbnail"
                              className="shrink-0"
                            />
                          ) : (
                            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-cos-border bg-cos-bg">
                              <Calendar className="h-5 w-5 text-cos-muted" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            {involvement.eventId ? (
                              <Link
                                href={`/events/${involvement.eventId}`}
                                className="font-display text-lg text-cos-text hover:underline"
                              >
                                {involvement.title}
                              </Link>
                            ) : (
                              <p className="font-display text-lg text-cos-text">
                                {involvement.title}
                              </p>
                            )}
                            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-cos-muted">
                              <span className="inline-flex items-center gap-1.5">
                                <Calendar className="h-3.5 w-3.5" />
                                {involvement.eventId
                                  ? formatEventDate(event?.date)
                                  : "Needs Event ID"}
                              </span>
                              <span className="inline-flex items-center gap-1.5">
                                <User className="h-3.5 w-3.5" />
                                {involvement.roleLabel}
                              </span>
                            </div>
                            <div className="mt-2">
                              {involvement.needsEventLink ? (
                                <Badge variant="warning">Needs event link</Badge>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-full bg-[#e7eee6] px-2.5 py-0.5 text-xs font-medium text-[#3f5240]">
                                  <Link2 className="h-3 w-3" />
                                  Linked
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
                {eventTabCount > overviewInvolvements.length ? (
                  <button
                    type="button"
                    onClick={() => onTabChange("events")}
                    className="mt-3 text-sm font-medium text-cos-muted transition-colors hover:text-cos-text"
                  >
                    View all {eventTabCount} events
                  </button>
                ) : null}
              </section>

              <aside className="space-y-4">
                <section className="rounded-2xl border border-cos-border bg-cos-card p-5 shadow-sm">
                  <h3 className="font-display text-xl text-cos-text">
                    Contact & reporting
                  </h3>
                  <ul className="mt-4 space-y-3 text-sm text-cos-text">
                    <li className="flex items-start gap-2.5">
                      <Mail className="mt-0.5 h-4 w-4 shrink-0 text-cos-muted" />
                      <span className="min-w-0 break-words">
                        {formatMemberEmail(member)}
                      </span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <Phone className="mt-0.5 h-4 w-4 shrink-0 text-cos-muted" />
                      <span>{formatMemberPhone(member)}</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <User className="mt-0.5 h-4 w-4 shrink-0 text-cos-muted" />
                      <span>
                        <span className="text-cos-muted">Reports to:</span>{" "}
                        {reportsTo}
                        {member.vpPortfolio ? (
                          <span className="mt-0.5 block text-xs text-cos-muted">
                            {member.vpPortfolio}
                          </span>
                        ) : null}
                      </span>
                    </li>
                  </ul>
                </section>

                {showGiveAppAccess ? (
                  <section className="rounded-2xl border border-cos-border border-l-[3px] border-l-[#5c6b4f] bg-[#eef2ec] p-5">
                    <h3 className="font-display text-xl text-cos-text">
                      Ready when you are
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-cos-muted">
                      Invite {firstName} so they can draft and submit
                      {highlightEventTitle
                        ? ` for ${highlightEventTitle}`
                        : ""}
                      .
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      className="mt-4 bg-[#5c6b4f] hover:bg-[#4d5a43]"
                      onClick={onInvite}
                    >
                      Invite to Login
                    </Button>
                  </section>
                ) : null}
              </aside>
            </div>
          )}

          {(activeTab === "events" || activeTab === "responsibilities") && (
            <div className="space-y-8">
              <div>
                <h3 className="font-display text-xl text-cos-text">
                  Assigned Events
                </h3>
                <p className="mt-1 text-sm text-cos-muted">
                  Events this person is on, with their role. Link a missing Event
                  ID or add another event below.
                </p>
                <div className="mt-4 space-y-3">
                  {eventInvolvements.length === 0 ? (
                    <p className="rounded-2xl border border-dashed border-cos-border bg-cos-card px-4 py-8 text-center text-sm text-cos-muted shadow-sm">
                      Not tied to any events yet.
                    </p>
                  ) : (
                    eventInvolvements.map((involvement) => {
                      const event = involvement.eventId
                        ? (eventsById.get(involvement.eventId) ?? null)
                        : null;
                      const showThumb = hasDisplayableArtwork(
                        event?.artwork ?? null,
                      );
                      const rowKey =
                        involvement.eventId ??
                        involvement.committeeId ??
                        involvement.title;

                      const isLinkingThis =
                        linkingCommitteeId === involvement.committeeId;
                      const showLinkPicker =
                        involvement.needsEventLink &&
                        canManage &&
                        onLinkCommitteeEvent &&
                        involvement.committeeId &&
                        linkPickerCommitteeId === involvement.committeeId;
                      // Do not compare null === null (unlinked rows all looked "Removing…").
                      const isRemovingThis =
                        removingEventId !== null &&
                        (removingEventId === involvement.eventId ||
                          (involvement.committeeId !== null &&
                            removingEventId ===
                              `committee:${involvement.committeeId}`));

                      return (
                        <div
                          key={rowKey}
                          className="rounded-2xl border border-cos-border bg-cos-card p-3 shadow-sm"
                        >
                          <div className="flex items-start gap-3">
                            {involvement.eventId && showThumb ? (
                              <EventArtworkPreview
                                artwork={event?.artwork ?? null}
                                eventTitle={involvement.title}
                                variant="thumbnail"
                                className="shrink-0"
                              />
                            ) : (
                              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-cos-border bg-[#e7eee6]">
                                <Calendar className="h-5 w-5 text-[#3f5240]" />
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              {involvement.eventId ? (
                                <Link
                                  href={`/events/${involvement.eventId}`}
                                  className="font-display text-lg text-cos-text hover:underline"
                                >
                                  {involvement.title}
                                </Link>
                              ) : (
                                <p className="font-display text-lg text-cos-text">
                                  {involvement.title}
                                </p>
                              )}
                              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-cos-muted">
                                <span className="inline-flex items-center gap-1.5">
                                  <Calendar className="h-3.5 w-3.5" />
                                  {involvement.eventId
                                    ? formatEventDate(event?.date)
                                    : "Needs Event ID"}
                                </span>
                                <span className="inline-flex items-center gap-1.5">
                                  <User className="h-3.5 w-3.5" />
                                  {involvement.roleLabel}
                                </span>
                              </div>
                              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                {involvement.needsEventLink ? (
                                  <Badge variant="warning">
                                    Needs event link
                                  </Badge>
                                ) : (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-[#e7eee6] px-2.5 py-0.5 text-xs font-medium text-[#3f5240]">
                                    <Link2 className="h-3 w-3" />
                                    Linked
                                  </span>
                                )}
                                {!involvement.needsEventLink
                                  ? eventStatusBadge(event?.status)
                                  : null}
                              </div>
                            </div>
                            <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                              {involvement.eventId ? (
                                <Button
                                  href={`/events/${involvement.eventId}`}
                                  variant="secondary"
                                  size="sm"
                                >
                                  Open Event
                                </Button>
                              ) : canManage &&
                                onLinkCommitteeEvent &&
                                involvement.committeeId ? (
                                <Button
                                  type="button"
                                  variant="secondary"
                                  size="sm"
                                  disabled={isLinkingThis}
                                  onClick={() =>
                                    setLinkPickerCommitteeId((current) =>
                                      current === involvement.committeeId
                                        ? null
                                        : involvement.committeeId,
                                    )
                                  }
                                >
                                  {showLinkPicker ? "Cancel" : "Link event"}
                                </Button>
                              ) : null}
                              {canRemoveInvolvements ? (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  disabled={
                                    Boolean(removingEventId) || isLinkingThis
                                  }
                                  onClick={() =>
                                    handleRemoveEventInvolvement({
                                      eventId: involvement.eventId,
                                      committeeId: involvement.committeeId,
                                    })
                                  }
                                >
                                  {isRemovingThis ? "Removing…" : "Remove"}
                                </Button>
                              ) : null}
                            </div>
                          </div>
                          {showLinkPicker ? (
                            <div className="mt-3 max-w-lg rounded-xl border border-cos-border bg-[#f6f2eb] p-3">
                              <p className="mb-1.5 text-xs font-medium text-cos-muted">
                                Search by name or date
                                {isLinkingThis ? " — linking…" : ""}
                              </p>
                              <EventSearchPicker
                                events={events}
                                disabled={isLinkingThis}
                                placeholder="Search by event name or date…"
                                emptyLabel="No matching events. Try another name or year."
                                onSelect={(eventId) => {
                                  const committeeId = involvement.committeeId;
                                  if (!committeeId) {
                                    return;
                                  }
                                  setLinkingCommitteeId(committeeId);
                                  setEventError(null);
                                  void onLinkCommitteeEvent(committeeId, eventId)
                                    .then((error) => {
                                      if (error) {
                                        setEventError(error);
                                        return;
                                      }
                                      setLinkPickerCommitteeId(null);
                                    })
                                    .catch(() => {
                                      setEventError(
                                        "Unable to link this event. Try again.",
                                      );
                                    })
                                    .finally(() => {
                                      setLinkingCommitteeId(null);
                                    });
                                }}
                              />
                            </div>
                          ) : null}
                        </div>
                      );
                    })
                  )}
                </div>
                {eventError ? (
                  <p className="mt-2 text-xs text-red-600">{eventError}</p>
                ) : null}
              </div>

              {canEditEvents ? (
                <div className="rounded-2xl border border-cos-border bg-cos-card p-5 shadow-sm">
                  <p className="text-xs font-medium tracking-[0.12em] text-cos-muted uppercase">
                    Add another event
                  </p>
                  <p className="mt-1 text-sm text-cos-muted">
                    Type a name or date, then pick the right year.
                  </p>
                  <div className="mt-3 max-w-lg">
                    {events.length === 0 ? (
                      <p className="text-xs text-cos-muted">No events available.</p>
                    ) : (
                      <EventSearchPicker
                        events={events}
                        excludeIds={draftEventIds}
                        disabled={isSavingEvents}
                        placeholder="Search by event name or date…"
                        emptyLabel="No matching events. Try another name or year."
                        onSelect={handleAddEventAssignment}
                      />
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {activeTab === "access" && (
            <div className="space-y-4 text-sm">
              <section className="rounded-xl border border-cos-border p-4 shadow-sm">
                <h3 className="font-display text-lg text-cos-text">
                  Login & Access
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
                          ? "Not Invited"
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
                    <dt className="text-cos-muted">Access level</dt>
                    <dd>
                      {member.isRosterOnly ? (
                        <Badge
                          variant="default"
                          className="bg-[#ece8e1] text-cos-muted"
                        >
                          Not Invited
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
                  <p className="mt-3 text-xs text-cos-muted">No login yet.</p>
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
                        Invite to Login
                      </Button>
                    ) : null}
                    {showResendInvite ? (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={onResendInvite}
                      >
                        {resendInviteLabel}
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
                    label="Role"
                    value={draftAccessLevel}
                    disabled={isSavingAccess}
                    onChange={(event) => {
                      setDraftAccessLevel(event.target.value);
                      setAccessError(null);
                    }}
                  >
                    {accessSelectOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                  <p className="mt-2 text-xs text-cos-muted">
                    From Access templates — this assigns their login permissions.
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
                      {isSavingAccess ? "Saving…" : "Save role"}
                    </Button>
                  ) : null}
                </div>
              ) : member.isRosterOnly ? (
                <p className="text-cos-muted">
                  No login yet. Use Invite to Login to create a login invite.
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
