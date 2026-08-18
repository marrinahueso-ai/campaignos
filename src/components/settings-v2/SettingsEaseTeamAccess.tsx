"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Plus, Search, Shield } from "lucide-react";
import { TeamAccessEditMemberModal } from "@/components/settings-v2/team-access/TeamAccessEditMemberModal";
import { TeamAccessPilotAddMemberModal } from "@/components/settings-v2/team-access/TeamAccessPilotAddMemberModal";
import {
  TeamAccessPilotConfirmDialog,
  type PilotConfirmKind,
} from "@/components/settings-v2/team-access/TeamAccessPilotConfirmDialog";
import { TeamAccessPilotMemberDrawer } from "@/components/settings-v2/team-access/TeamAccessPilotMemberDrawer";
import {
  AVATAR_TONES,
  pilotBtnGhost,
  pilotBtnPrimary,
  pilotSerif,
} from "@/components/settings-v2/team-access/team-access-pilot-theme";
import {
  accessLevelLabel,
  buildUnifiedTeamMembers,
  canResendTeamInvite,
  isCurrentUserTeamMember,
  memberMatchesPeopleSearch,
  peopleLoginStatus,
  peopleRelatedEventIds,
  type UnifiedTeamMember,
} from "@/components/settings-v2/team-access/team-access-utils";
import {
  cancelTeamInviteAction,
  removeTeamMemberAction,
  replaceMemberEventAssignmentsAction,
  resetUsernameLoginAction,
  resendTeamInviteAction,
  setOrganizationUserEventAssignmentsAction,
  updateTeamMemberAction,
} from "@/lib/auth/actions";
import { isInviteExpired } from "@/lib/auth/invite-constants";
import type { CampaignRole } from "@/lib/auth/campaign-roles";
import { accessTemplateLabelMap } from "@/lib/access-templates/merge";
import type { AccessTemplate } from "@/lib/access-templates/types";
import type { TeamAccessWorkloadIndex } from "@/lib/organization-workspace/team-access-workload";
import type { OrganizationUser } from "@/types/auth";
import type { OrganizationWorkspaceData } from "@/types/organization-workspace";
import { copyToClipboard } from "@/lib/utils/clipboard";

type PeopleTab = "all" | "active" | "pending" | "inactive";

interface SettingsEaseTeamAccessProps {
  members: OrganizationUser[];
  workspace: OrganizationWorkspaceData;
  workload: TeamAccessWorkloadIndex;
  lastSignInAtByUserId?: Record<string, string | null>;
  canManage: boolean;
  canEditAccessTemplates?: boolean;
  accessTemplates: AccessTemplate[];
  showClaimBanner: boolean;
  currentUserEmail: string | null;
  canProvisionAccounts: boolean;
  events: Array<{
    id: string;
    title: string;
    date?: string | null;
    status?: string | null;
  }>;
  seatLimit: number | null;
  planLabel: string;
}

function inviteExpiryLabel(
  member: UnifiedTeamMember,
  nowMs = Date.now(),
): string | null {
  if (peopleLoginStatus(member) !== "invited") return null;
  const expiresAt = member.raw?.inviteExpiresAt;
  if (!expiresAt) return null;
  if (isInviteExpired(expiresAt)) return "Expired";
  const ms = Date.parse(expiresAt) - nowMs;
  if (Number.isNaN(ms) || ms <= 0) return "Expired";
  const days = Math.ceil(ms / (1000 * 60 * 60 * 24));
  if (days <= 1) return "Expires today";
  return `Expires in ${days}d`;
}

function rowStatus(member: UnifiedTeamMember): {
  label: string;
  className: string;
  pendingStyle: boolean;
  pausedStyle: boolean;
} {
  const login = peopleLoginStatus(member);
  if (login === "invited") {
    const expired = isInviteExpired(member.raw?.inviteExpiresAt);
    return {
      label: expired ? "Invite expired" : "Pending",
      className: expired
        ? "bg-[#f9f2f0] text-[#c07a67]"
        : "bg-yellow-50 text-[#d4af37]",
      pendingStyle: true,
      pausedStyle: false,
    };
  }
  if (login === "inactive") {
    return {
      label: "Paused",
      className: "bg-[#f9f2f0] text-[#c07a67]",
      pendingStyle: false,
      pausedStyle: true,
    };
  }
  if (login === "not_invited") {
    return {
      label: "Not invited",
      className: "bg-[#ece8e1] text-[#737373]",
      pendingStyle: false,
      pausedStyle: false,
    };
  }
  return {
    label: "Active",
    className: "bg-[#eef2f0] text-[#586c63]",
    pendingStyle: false,
    pausedStyle: false,
  };
}

function matchesTab(member: UnifiedTeamMember, tab: PeopleTab): boolean {
  const login = peopleLoginStatus(member);
  if (tab === "all") return true;
  if (tab === "active") return login === "active";
  if (tab === "pending") return login === "invited";
  return login === "inactive";
}

function syncPersonQuery(person: string | null) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (person) {
    url.searchParams.set("person", person);
  } else {
    url.searchParams.delete("person");
    url.searchParams.delete("tab");
  }
  window.history.replaceState(window.history.state, "", url.toString());
}

export function SettingsEaseTeamAccess({
  members,
  workspace,
  workload,
  lastSignInAtByUserId,
  canManage,
  canEditAccessTemplates = false,
  accessTemplates,
  currentUserEmail,
  canProvisionAccounts,
  events,
  seatLimit,
  planLabel,
}: SettingsEaseTeamAccessProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [peopleTab, setPeopleTab] = useState<PeopleTab>("all");
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editMember, setEditMember] = useState<UnifiedTeamMember | null>(null);
  const [drawerMemberId, setDrawerMemberId] = useState<string | null>(null);
  const [localMembers, setLocalMembers] = useState<UnifiedTeamMember[] | null>(
    null,
  );
  const [inviteFeedback, setInviteFeedback] = useState<{
    tone: "success" | "warning" | "error";
    message: string;
    inviteUrl?: string | null;
  } | null>(null);
  const [resendingMemberId, setResendingMemberId] = useState<string | null>(
    null,
  );
  const [confirm, setConfirm] = useState<{
    kind: PilotConfirmKind;
    member: UnifiedTeamMember;
  } | null>(null);
  const [resetCredentials, setResetCredentials] = useState<{
    username: string;
    password: string;
  } | null>(null);

  const accessLabels = useMemo(
    () => accessTemplateLabelMap(accessTemplates),
    [accessTemplates],
  );

  const eventTitlesById = useMemo(() => {
    const map = new Map<string, string>();
    for (const event of events) {
      map.set(event.id, event.title);
    }
    return map;
  }, [events]);

  const unifiedMembers = useMemo(() => {
    const built = buildUnifiedTeamMembers(
      members,
      workspace,
      workload,
      lastSignInAtByUserId,
    );
    return built.map((member) => ({
      ...member,
      accessLabel: accessLevelLabel(
        member.accessTemplateId ?? member.accessLevel,
        member.isRosterOnly,
        accessLabels,
      ),
    }));
  }, [members, workspace, workload, lastSignInAtByUserId, accessLabels]);

  const listedPeople = useMemo(() => {
    const people = localMembers ?? unifiedMembers;

    return [...people].sort((left, right) => {
      const leftSelf = isCurrentUserTeamMember(left, currentUserEmail) ? 0 : 1;
      const rightSelf = isCurrentUserTeamMember(right, currentUserEmail)
        ? 0
        : 1;
      if (leftSelf !== rightSelf) return leftSelf - rightSelf;

      const statusRank = (member: UnifiedTeamMember) => {
        const status = peopleLoginStatus(member);
        if (status === "active") return 0;
        if (status === "not_invited") return 1;
        if (status === "invited") return 2;
        return 3;
      };
      const byStatus = statusRank(left) - statusRank(right);
      if (byStatus !== 0) return byStatus;
      return left.displayName.localeCompare(right.displayName);
    });
  }, [localMembers, unifiedMembers, currentUserEmail]);

  useEffect(() => {
    setLocalMembers(null);
  }, [unifiedMembers]);

  const counts = useMemo(() => {
    let active = 0;
    let pending = 0;
    let inactive = 0;
    for (const member of listedPeople) {
      const status = peopleLoginStatus(member);
      if (status === "active") active += 1;
      else if (status === "invited") pending += 1;
      else if (status === "inactive") inactive += 1;
    }
    return {
      all: listedPeople.length,
      active,
      pending,
      inactive,
    };
  }, [listedPeople]);

  const visiblePeople = useMemo(() => {
    return listedPeople.filter(
      (member) =>
        matchesTab(member, peopleTab) &&
        memberMatchesPeopleSearch(member, search, eventTitlesById),
    );
  }, [listedPeople, peopleTab, search, eventTitlesById]);

  const drawerMember = useMemo(
    () =>
      drawerMemberId
        ? (listedPeople.find((member) => member.id === drawerMemberId) ??
          unifiedMembers.find((member) => member.id === drawerMemberId) ??
          null)
        : null,
    [drawerMemberId, listedPeople, unifiedMembers],
  );

  const drawerAvatarIndex = Math.max(
    0,
    listedPeople.findIndex((member) => member.id === drawerMemberId),
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const person = params.get("person");
    if (!person) return;
    const match =
      listedPeople.find((member) => member.id === person) ??
      listedPeople.find((member) =>
        member.displayName.toLowerCase().startsWith(person.toLowerCase()),
      ) ??
      null;
    if (match) setDrawerMemberId(match.id);
  }, [listedPeople]);

  function openPerson(member: UnifiedTeamMember) {
    setInviteFeedback(null);
    setDrawerMemberId(member.id);
    syncPersonQuery(member.id);
  }

  function closePerson() {
    setInviteFeedback(null);
    setResendingMemberId(null);
    setDrawerMemberId(null);
    syncPersonQuery(null);
  }

  function handleResendInvite(member: UnifiedTeamMember) {
    if (!canResendTeamInvite(member, canManage) || !member.raw) return;
    setInviteFeedback(null);
    setResendingMemberId(member.id);
    startTransition(async () => {
      try {
        const result = await resendTeamInviteAction(member.raw!.id);
        if (result.error) {
          setInviteFeedback({ tone: "error", message: result.error });
          return;
        }
        setInviteFeedback({
          tone: result.warning ? "warning" : "success",
          message:
            [result.message, result.warning].filter(Boolean).join(" ") ||
            "Invite email sent.",
          inviteUrl: result.inviteUrl,
        });
        router.refresh();
      } finally {
        setResendingMemberId(null);
      }
    });
  }

  function runConfirm() {
    if (!confirm?.member.raw) return;
    const { kind, member } = confirm;
    startTransition(async () => {
      if (kind === "cancel_invite") {
        const result = await cancelTeamInviteAction(member.raw!.id);
        if (result.error) {
          window.alert(result.error);
          return;
        }
        setLocalMembers((current) => {
          const base = current ?? unifiedMembers;
          return base.filter((entry) => entry.id !== member.id);
        });
        if (drawerMemberId === member.id) closePerson();
      } else if (kind === "remove") {
        const result = await removeTeamMemberAction(member.raw!.id);
        if (result.error) {
          window.alert(result.error);
          return;
        }
        setLocalMembers((current) => {
          const base = current ?? unifiedMembers;
          return base.filter((entry) => entry.id !== member.id);
        });
        if (drawerMemberId === member.id) closePerson();
      } else if (kind === "pause") {
        const result = await updateTeamMemberAction(member.raw!.id, {
          status: "deactivated",
        });
        if (result.error) {
          window.alert(result.error);
          return;
        }
        router.refresh();
      } else if (kind === "restore") {
        const result = await updateTeamMemberAction(member.raw!.id, {
          status: "active",
        });
        if (result.error) {
          window.alert(result.error);
          return;
        }
        router.refresh();
      } else if (kind === "reset_login") {
        const result = await resetUsernameLoginAction({
          membershipId: member.raw!.id,
        });
        if (result.error) {
          window.alert(result.error);
          return;
        }
        if (result.provisionedUsername && result.provisionedPassword) {
          setResetCredentials({
            username: result.provisionedUsername,
            password: result.provisionedPassword,
          });
        }
        router.refresh();
      }
      setConfirm(null);
      router.refresh();
    });
  }

  async function handleSaveAccessLevel(
    member: UnifiedTeamMember,
    campaignRole: CampaignRole | string,
  ): Promise<string | null> {
    if (member.isRosterOnly || !member.raw) {
      return "Invite this person first to set their access role.";
    }
    const result = await updateTeamMemberAction(member.raw.id, {
      campaignRole,
    });
    if (result.error) return result.error;
    router.refresh();
    return null;
  }

  async function handleSaveEventAssignments(
    member: UnifiedTeamMember,
    eventIds: string[],
  ): Promise<string | null> {
    if (member.organizationMemberId) {
      const result = await replaceMemberEventAssignmentsAction({
        organizationMemberId: member.organizationMemberId,
        eventIds,
      });
      if (result.error) return result.error;
    } else if (member.raw) {
      const result = await setOrganizationUserEventAssignmentsAction({
        organizationUserId: member.raw.id,
        eventIds,
      });
      if (result.error) return result.error;
    } else {
      return "Unable to link events for this person yet.";
    }
    router.refresh();
    return null;
  }

  const seatHint =
    seatLimit == null
      ? `${counts.active} active on ${planLabel}`
      : `${counts.active} of ${seatLimit} seats on ${planLabel}`;

  const tabs: Array<{ id: PeopleTab; label: string; count: number }> = [
    { id: "all", label: "All", count: counts.all },
    { id: "active", label: "Active", count: counts.active },
    { id: "pending", label: "Pending", count: counts.pending },
    { id: "inactive", label: "Inactive", count: counts.inactive },
  ];

  return (
    <section
      className="settings-ease-team-access -mx-1"
      data-settings-ease="team-access"
      data-team-access-pilot="v1"
    >
      <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <h1
            className="m-0 text-[clamp(28px,3.6vw,48px)] font-bold leading-[1.05] tracking-tight text-[#201b17]"
            style={{ fontFamily: pilotSerif }}
          >
            Team & Access
          </h1>
          <p className="m-0 max-w-xl text-base font-medium text-[#737373] sm:text-lg">
            Manage the people helping our school. Invite volunteers and set who
            can do what.
          </p>
          <p className="m-0 text-xs font-medium text-[#737373]/80">
            {seatHint}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {canEditAccessTemplates ? (
            <Link
              href="/settings/team-access/roles"
              className="inline-flex items-center gap-2 rounded-2xl border border-[#e5e1d8] bg-white px-4 py-2.5 text-sm font-bold text-[#737373] shadow-sm transition hover:bg-[#f5f2eb] hover:text-[#201b17]"
            >
              <Shield className="h-3.5 w-3.5" aria-hidden />
              Manage roles
            </Link>
          ) : null}
          {canManage ? (
            <button
              type="button"
              className={pilotBtnPrimary}
              onClick={() => setAddOpen(true)}
            >
              <Plus className="h-4 w-4" aria-hidden />
              Add team member
            </button>
          ) : null}
        </div>
      </div>

      <div className="mb-6 flex flex-col gap-4 border-b border-[#e5e1d8] sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-5 overflow-x-auto sm:gap-8" role="tablist">
          {tabs.map((tab) => {
            const active = peopleTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                className={`relative shrink-0 pb-3 text-sm font-bold transition ${
                  active
                    ? "text-[#201b17] after:absolute after:right-0 after:bottom-[-1px] after:left-0 after:h-0.5 after:bg-[#201b17]"
                    : "text-[#737373] hover:text-[#201b17]"
                }`}
                onClick={() => setPeopleTab(tab.id)}
              >
                {tab.label}{" "}
                <span className="ml-1 font-medium text-[#737373]/60">
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
        <div className="relative mb-3 w-full sm:mb-4 sm:w-72">
          <Search className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-[#737373]/50" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search team by name or role…"
            className="w-full rounded-2xl border-none bg-[#f5f2eb]/50 py-2.5 pr-4 pl-11 text-sm font-medium outline-none ring-[#586c63]/20 focus:ring-2"
          />
        </div>
      </div>

      {listedPeople.length === 0 ? (
        <div className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center space-y-6 text-center">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[#f5f2eb] text-3xl text-[#737373]">
            ◯
          </div>
          <div>
            <h3
              className="mb-2 text-2xl font-bold text-[#201b17]"
              style={{ fontFamily: pilotSerif }}
            >
              No members yet
            </h3>
            <p className="font-medium text-[#737373]">
              {canManage
                ? "Start building your team by inviting your first volunteer."
                : "Ask an admin to invite you to this organization."}
            </p>
          </div>
          {canManage ? (
            <button
              type="button"
              className={pilotBtnPrimary}
              onClick={() => setAddOpen(true)}
            >
              Add your first member
            </button>
          ) : null}
        </div>
      ) : visiblePeople.length === 0 ? (
        <p className="py-16 text-center text-sm font-medium text-[#737373]">
          No people match your search or filters.
        </p>
      ) : (
        <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:gap-4">
          {visiblePeople.map((member, index) => {
            const status = rowStatus(member);
            const tone = AVATAR_TONES[index % AVATAR_TONES.length];
            const linked = peopleRelatedEventIds(member)
              .map((id) => eventTitlesById.get(id))
              .filter(Boolean) as string[];
            const expiry = inviteExpiryLabel(member);
            const isSelf = isCurrentUserTeamMember(member, currentUserEmail);

            return (
              <button
                key={member.id}
                type="button"
                onClick={() => openPerson(member)}
                className={`group flex w-full flex-col gap-4 rounded-[2rem] border p-4 text-left transition hover:shadow-[0_4px_24px_-2px_rgba(32,27,23,0.04)] sm:flex-row sm:items-center sm:justify-between sm:rounded-[2.5rem] sm:p-5 ${
                  status.pendingStyle
                    ? "border-dashed border-[#e5e1d8] bg-white/60 hover:border-[#d4af37]/30 hover:bg-white"
                    : status.pausedStyle
                      ? "border-[#e5e1d8] bg-[#f9f2f0]/30 hover:border-[#c07a67]/30 hover:bg-white"
                      : "border-[#e5e1d8] bg-white hover:border-[#586c63]/30"
                }`}
              >
                <div
                  className={`flex min-w-0 flex-1 items-center gap-4 sm:gap-6 ${
                    status.pendingStyle
                      ? "grayscale"
                      : status.pausedStyle
                        ? "opacity-60"
                        : ""
                  }`}
                >
                  <div
                    className={`grid h-12 w-12 shrink-0 place-items-center rounded-full text-sm font-extrabold sm:h-14 sm:w-14 sm:text-base ${tone}`}
                    aria-hidden
                  >
                    {member.initials}
                  </div>
                  <div className="min-w-0">
                    <h3
                      className={`truncate text-base font-bold text-[#201b17] sm:text-lg ${
                        status.pausedStyle
                          ? "line-through decoration-[#c07a67]/30"
                          : "group-hover:text-[#586c63]"
                      }`}
                    >
                      {member.displayName}
                      {isSelf ? (
                        <span className="ml-2 text-xs font-bold text-[#586c63]">
                          You
                        </span>
                      ) : null}
                    </h3>
                    <p
                      className={`truncate text-sm font-medium text-[#737373] ${
                        status.pendingStyle ? "italic" : ""
                      }`}
                    >
                      {member.organizationRoleName?.trim() ||
                        member.orgRoleLabel?.trim() ||
                        "Team member"}
                    </p>
                  </div>
                </div>

                <div
                  className={`min-w-0 flex-1 px-0 sm:px-4 ${
                    status.pausedStyle ? "opacity-60" : ""
                  }`}
                >
                  <p className="truncate text-sm font-bold text-[#201b17]">
                    {member.accessLabel}
                  </p>
                  <p className="truncate text-xs font-medium text-[#737373]">
                    {member.username || member.email || "No email"}
                  </p>
                </div>

                <div
                  className={`min-w-0 flex-1 px-0 sm:px-4 ${
                    status.pendingStyle || status.pausedStyle
                      ? "opacity-50"
                      : ""
                  }`}
                >
                  <p className="mb-1 text-[10px] font-bold tracking-widest text-[#737373]/60 uppercase">
                    Assigned to
                  </p>
                  {linked.length === 0 ? (
                    <span className="text-xs font-medium italic text-[#737373]">
                      {status.pendingStyle ? "Assign later" : "No events linked"}
                    </span>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      <span className="rounded-full bg-[#f5f2eb] px-2.5 py-1 text-[11px] font-bold text-[#201b17]">
                        {linked[0]}
                      </span>
                      {linked.length > 1 ? (
                        <span className="rounded-full bg-[#f5f2eb] px-2.5 py-1 text-[11px] font-bold text-[#201b17]">
                          +{linked.length - 1} others
                        </span>
                      ) : null}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3 sm:gap-6 sm:pr-2">
                  {expiry && !isInviteExpired(member.raw?.inviteExpiresAt) ? (
                    <div className="hidden text-right sm:block">
                      <span className="mb-0.5 block text-[10px] font-bold tracking-tighter text-[#d4af37] uppercase">
                        Invited
                      </span>
                      <span className="whitespace-nowrap text-[11px] font-bold text-[#737373]/60">
                        {expiry}
                      </span>
                    </div>
                  ) : null}
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold tracking-wider uppercase ${status.className}`}
                  >
                    {status.label}
                  </span>
                  <span className={`${pilotBtnGhost} hidden opacity-0 group-hover:opacity-100 sm:inline-flex`}>
                    <ChevronRight className="h-4 w-4" aria-hidden />
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <TeamAccessPilotMemberDrawer
        member={drawerMember}
        open={Boolean(drawerMember)}
        onClose={closePerson}
        events={events}
        accessTemplates={accessTemplates}
        canManage={canManage}
        avatarToneIndex={drawerAvatarIndex}
        currentUserEmail={currentUserEmail}
        inviteFeedback={inviteFeedback}
        onDismissInviteFeedback={() => setInviteFeedback(null)}
        resendPending={
          Boolean(drawerMember) && resendingMemberId === drawerMember?.id
        }
        actionPending={isPending}
        onEditProfile={() => {
          if (!drawerMember) return;
          setEditMember(drawerMember);
          setEditOpen(true);
        }}
        onResendInvite={() => {
          if (drawerMember) handleResendInvite(drawerMember);
        }}
        onCancelInvite={() => {
          if (drawerMember) {
            setConfirm({ kind: "cancel_invite", member: drawerMember });
          }
        }}
        onCopyInviteLink={(url) => {
          void copyToClipboard(url);
        }}
        onPause={() => {
          if (drawerMember) setConfirm({ kind: "pause", member: drawerMember });
        }}
        onRestore={() => {
          if (drawerMember) {
            setConfirm({ kind: "restore", member: drawerMember });
          }
        }}
        onRemove={() => {
          if (drawerMember) setConfirm({ kind: "remove", member: drawerMember });
        }}
        onResetLogin={
          drawerMember?.username
            ? () => setConfirm({ kind: "reset_login", member: drawerMember })
            : undefined
        }
        onSaveAccessLevel={(templateId) =>
          drawerMember
            ? handleSaveAccessLevel(drawerMember, templateId)
            : Promise.resolve("No person selected.")
        }
        onSaveEventAssignments={(eventIds) =>
          drawerMember
            ? handleSaveEventAssignments(drawerMember, eventIds)
            : Promise.resolve("No person selected.")
        }
      />

      <TeamAccessPilotAddMemberModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        events={events}
        accessTemplates={accessTemplates}
        canProvisionAccounts={canProvisionAccounts}
        organizationRoles={workspace.roles.map((role) => ({
          id: role.id,
          name: role.name,
        }))}
      />

      <TeamAccessEditMemberModal
        open={editOpen}
        onClose={() => {
          setEditOpen(false);
          setEditMember(null);
        }}
        member={editMember}
        roles={workspace.roles}
        committees={workspace.committees}
        workspace={workspace}
        accessLabels={accessLabels}
        accessTemplates={accessTemplates}
        currentUserEmail={currentUserEmail}
      />

      <TeamAccessPilotConfirmDialog
        open={Boolean(confirm)}
        kind={confirm?.kind ?? "remove"}
        memberName={confirm?.member.displayName ?? "this person"}
        pending={isPending}
        onConfirm={runConfirm}
        onClose={() => setConfirm(null)}
      />

      {resetCredentials ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-[rgba(32,27,23,0.4)] backdrop-blur-[4px]"
            onClick={() => setResetCredentials(null)}
          />
          <div className="relative z-10 w-full max-w-md rounded-[2.5rem] border border-[#e5e1d8] bg-white p-10 shadow-2xl">
            <h2
              className="mb-2 text-2xl font-bold tracking-tight text-[#201b17]"
              style={{ fontFamily: pilotSerif }}
            >
              New login details
            </h2>
            <p className="mb-6 text-sm font-medium text-[#737373]">
              Share once, then discard. They&apos;ll create a new password on
              next sign-in.
            </p>
            <dl className="space-y-3 rounded-2xl bg-[#f5f2eb] p-5 text-sm">
              <div>
                <dt className="text-xs font-bold tracking-widest text-[#737373] uppercase">
                  Username
                </dt>
                <dd className="mt-1 font-mono font-bold text-[#201b17]">
                  {resetCredentials.username}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-bold tracking-widest text-[#737373] uppercase">
                  Temporary password
                </dt>
                <dd className="mt-1 font-mono font-bold text-[#201b17]">
                  {resetCredentials.password}
                </dd>
              </div>
            </dl>
            <div className="mt-6 flex flex-col gap-3">
              <button
                type="button"
                className={pilotBtnPrimary}
                onClick={() => {
                  void copyToClipboard(
                    `Username: ${resetCredentials.username}\nTemporary password: ${resetCredentials.password}`,
                  );
                }}
              >
                Copy login details
              </button>
              <button
                type="button"
                className={pilotBtnGhost}
                onClick={() => setResetCredentials(null)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
