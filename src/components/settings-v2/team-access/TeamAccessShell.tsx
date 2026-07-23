"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { ArrowLeft, Mail } from "lucide-react";
import { SettingsV2PageHeader } from "@/components/settings-v2/SettingsV2PageHeader";
import { TeamAccessAccessTemplatesPanel } from "@/components/settings-v2/team-access/TeamAccessAccessTemplatesPanel";
import { TeamAccessEditMemberModal } from "@/components/settings-v2/team-access/TeamAccessEditMemberModal";
import { TeamAccessGiveAppAccessModal } from "@/components/settings-v2/team-access/TeamAccessGiveAppAccessModal";
import { TeamAccessInviteModal } from "@/components/settings-v2/team-access/TeamAccessInviteModal";
import { TeamAccessMemberTable } from "@/components/settings-v2/team-access/TeamAccessMemberTable";
import { TeamAccessMoreActionsMenu } from "@/components/settings-v2/team-access/TeamAccessMoreActionsMenu";
import { TeamAccessOpenTasksDrawer } from "@/components/settings-v2/team-access/TeamAccessOpenTasksDrawer";
import { TeamAccessPeopleSidebar } from "@/components/settings-v2/team-access/TeamAccessPeopleSidebar";
import { teamAccessPersonProfilePath } from "@/components/settings-v2/team-access/TeamAccessPersonProfile";
import {
  accessLevelLabel,
  buildUnifiedTeamMembers,
  isCurrentUserTeamMember,
  memberMatchesPeopleSearch,
  peopleLoginStatus,
  peopleRelatedEventIds,
  type UnifiedTeamMember,
} from "@/components/settings-v2/team-access/team-access-utils";
import { Button } from "@/components/ui/Button";
import {
  claimOrganizationAccessAction,
  removeTeamMemberAction,
  resendTeamInviteAction,
  updateTeamMemberAction,
} from "@/lib/auth/actions";
import type { AccessTemplate } from "@/lib/access-templates/types";
import { accessTemplateLabelMap } from "@/lib/access-templates/merge";
import { updateOrganizationMemberAction } from "@/lib/organization-workspace/actions";
import type { TeamAccessWorkloadIndex } from "@/lib/organization-workspace/team-access-workload";
import type { OrganizationUser } from "@/types/auth";
import type { OrganizationWorkspaceData } from "@/types/organization-workspace";
import { cn } from "@/lib/utils/cn";

type PeopleHubTab = "people" | "access_templates";

interface TeamAccessShellProps {
  members: OrganizationUser[];
  workspace: OrganizationWorkspaceData;
  workload: TeamAccessWorkloadIndex;
  canManage: boolean;
  /** Admin/President only — edit access templates. */
  canEditAccessTemplates: boolean;
  accessTemplates: AccessTemplate[];
  showClaimBanner: boolean;
  currentUserEmail: string | null;
  siteOrigin: string;
  canProvisionAccounts: boolean;
  events?: Array<{
    id: string;
    title: string;
    date?: string | null;
    status?: string | null;
  }>;
  seatLimit?: number;
}

export function TeamAccessShell({
  members,
  workspace,
  workload,
  canManage,
  canEditAccessTemplates,
  accessTemplates,
  showClaimBanner,
  currentUserEmail,
  canProvisionAccounts,
  events = [],
}: TeamAccessShellProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [hubTab, setHubTab] = useState<PeopleHubTab>("people");

  const accessLabels = useMemo(
    () => accessTemplateLabelMap(accessTemplates),
    [accessTemplates],
  );

  const unifiedMembers = useMemo(() => {
    const built = buildUnifiedTeamMembers(members, workspace, workload);
    return built.map((member) => ({
      ...member,
      accessLabel: accessLevelLabel(
        member.accessTemplateId ?? member.accessLevel,
        member.isRosterOnly,
        accessLabels,
      ),
    }));
  }, [members, workspace, workload, accessLabels]);

  const eventTitlesById = useMemo(
    () => new Map(events.map((event) => [event.id, event.title])),
    [events],
  );

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [eventFilter, setEventFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [inviteOpen, setInviteOpen] = useState(false);
  const [invitePrefill, setInvitePrefill] = useState<{
    email?: string;
    name?: string;
    committeeId?: string;
    organizationRoleId?: string;
    campaignRole?: string;
  } | null>(null);
  const [giveAppAccessOpen, setGiveAppAccessOpen] = useState(false);
  const [giveAppAccessMember, setGiveAppAccessMember] =
    useState<UnifiedTeamMember | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editMember, setEditMember] = useState<UnifiedTeamMember | null>(null);
  const [tasksOpen, setTasksOpen] = useState(false);
  const [tasksMember, setTasksMember] = useState<UnifiedTeamMember | null>(null);

  const [moreActionsMember, setMoreActionsMember] = useState<UnifiedTeamMember | null>(null);
  const [moreActionsAnchor, setMoreActionsAnchor] = useState<DOMRect | null>(null);

  const activeCount = unifiedMembers.filter(
    (member) => peopleLoginStatus(member) === "active",
  ).length;
  const invitedCount = unifiedMembers.filter(
    (member) => peopleLoginStatus(member) === "invited",
  ).length;
  const notInvitedCount = unifiedMembers.filter(
    (member) => peopleLoginStatus(member) === "not_invited",
  ).length;
  const inactiveCount = unifiedMembers.filter(
    (member) => peopleLoginStatus(member) === "inactive",
  ).length;

  const mostAssigned = useMemo(
    () =>
      [...unifiedMembers]
        .filter((member) => peopleRelatedEventIds(member).length > 0)
        .sort(
          (a, b) =>
            peopleRelatedEventIds(b).length - peopleRelatedEventIds(a).length,
        )
        .slice(0, 5),
    [unifiedMembers],
  );

  const filteredMembers = useMemo(() => {
    return unifiedMembers.filter((member) => {
      const matchesSearch = memberMatchesPeopleSearch(
        member,
        search,
        eventTitlesById,
      );
      const matchesRole = !roleFilter || member.accessLabel === roleFilter;
      const relatedEventIds = peopleRelatedEventIds(member);
      const matchesEvent =
        !eventFilter || relatedEventIds.includes(eventFilter);
      const matchesStatus =
        !statusFilter || peopleLoginStatus(member) === statusFilter;

      return matchesSearch && matchesRole && matchesEvent && matchesStatus;
    });
  }, [unifiedMembers, search, roleFilter, eventFilter, statusFilter, eventTitlesById]);

  function openPersonProfile(
    member: UnifiedTeamMember,
    tab?: "overview" | "events" | "access" | "activity",
  ) {
    const base = teamAccessPersonProfilePath(member.id);
    router.push(tab && tab !== "overview" ? `${base}?tab=${tab}` : base);
  }

  function openInviteModal(prefill?: typeof invitePrefill) {
    setInvitePrefill(prefill ?? null);
    setInviteOpen(true);
  }

  function openGiveAppAccess(member: UnifiedTeamMember) {
    if (!member.organizationMemberId) {
      openInviteModal({
        email: member.email || undefined,
        name: member.displayName,
        organizationRoleId: member.organizationRoleId ?? undefined,
        campaignRole:
          member.accessTemplateId ?? member.accessLevel ?? undefined,
      });
      return;
    }
    setGiveAppAccessMember(member);
    setGiveAppAccessOpen(true);
  }

  function handleDeactivate(member: UnifiedTeamMember) {
    startTransition(async () => {
      if (member.raw) {
        const result = await updateTeamMemberAction(member.raw.id, {
          status: member.status === "deactivated" ? "active" : "deactivated",
        });
        if (result.error) {
          window.alert(result.error);
          return;
        }
      } else {
        const rosterMember = workspace.members.find(
          (entry) =>
            entry.email?.toLowerCase() === member.email.toLowerCase() ||
            entry.name === member.displayName,
        );
        if (rosterMember) {
          await updateOrganizationMemberAction(rosterMember.id, {
            active: false,
          });
        }
      }
      router.refresh();
    });
  }

  function handleArchive(member: UnifiedTeamMember) {
    if (!window.confirm(`Archive ${member.displayName}? They will be hidden from active views.`)) {
      return;
    }
    startTransition(async () => {
      if (member.raw) {
        const result = await updateTeamMemberAction(member.raw.id, {
          status: "deactivated",
        });
        if (result.error) {
          window.alert(result.error);
          return;
        }
      } else {
        const rosterMember = workspace.members.find(
          (entry) =>
            entry.email?.toLowerCase() === member.email.toLowerCase() ||
            entry.name === member.displayName,
        );
        if (rosterMember) {
          await updateOrganizationMemberAction(rosterMember.id, { active: false });
        }
      }
      router.refresh();
    });
  }

  function handleRemove(member: UnifiedTeamMember) {
    if (!member.raw) {
      return;
    }
    if (!window.confirm(`Remove ${member.displayName} from the team?`)) {
      return;
    }
    startTransition(async () => {
      const result = await removeTeamMemberAction(member.raw!.id);
      if (result.error) {
        window.alert(result.error);
        return;
      }
      router.refresh();
    });
  }

  function handleClaim() {
    startTransition(async () => {
      await claimOrganizationAccessAction();
      router.refresh();
    });
  }

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/settings"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-cos-muted transition-colors hover:text-cos-text"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
          Back to Settings
        </Link>
        <SettingsV2PageHeader
          title="People & Responsibilities"
          description="Manage people, event assignments, login access, and access templates."
          className="mb-0"
          actions={
            canManage && hubTab === "people" ? (
              <Button type="button" size="md" onClick={() => openInviteModal()}>
                <Mail className="h-4 w-4" />
                Invite person
              </Button>
            ) : null
          }
        />
      </div>

      <div className="flex flex-wrap gap-2 border-b border-cos-border pb-px">
        {(
          [
            { id: "people" as const, label: "People" },
            { id: "access_templates" as const, label: "Access templates" },
          ] as const
        ).map((tab) => {
          const active = hubTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setHubTab(tab.id)}
              className={cn(
                "rounded-t-lg px-4 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "border border-b-0 border-cos-border bg-cos-card text-cos-text"
                  : "text-cos-muted hover:text-cos-text",
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {showClaimBanner && hubTab === "people" ? (
        <div className="border border-amber-200 bg-amber-50/50 p-5">
          <h3 className="font-display text-xl text-amber-950">Link your account</h3>
          <p className="mt-1 text-sm text-amber-900">
            This PTO workspace exists but has no signed-in users yet. Claim admin
            access as <span className="font-medium">{currentUserEmail}</span> to
            manage the team.
          </p>
          <Button
            type="button"
            className="mt-3"
            disabled={isPending}
            onClick={handleClaim}
          >
            Claim admin access
          </Button>
        </div>
      ) : null}

      {hubTab === "access_templates" ? (
        <TeamAccessAccessTemplatesPanel
          templates={accessTemplates}
          canEdit={canEditAccessTemplates}
        />
      ) : (
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
        <TeamAccessMemberTable
          members={filteredMembers}
          search={search}
          roleFilter={roleFilter}
          eventFilter={eventFilter}
          statusFilter={statusFilter}
          eventOptions={events.map((event) => ({
            id: event.id,
            title: event.title,
          }))}
          eventTitlesById={eventTitlesById}
          onSearchChange={setSearch}
          onRoleFilterChange={setRoleFilter}
          onEventFilterChange={setEventFilter}
          onStatusFilterChange={setStatusFilter}
          onSelectMember={(member) => openPersonProfile(member)}
          onMoreActions={(member, anchor) => {
            setMoreActionsMember(member);
            setMoreActionsAnchor(anchor);
          }}
          canManage={canManage}
          peopleCount={unifiedMembers.length}
        />

        <TeamAccessPeopleSidebar
          totalCount={unifiedMembers.length}
          activeCount={activeCount}
          invitedCount={invitedCount}
          notInvitedCount={notInvitedCount}
          inactiveCount={inactiveCount}
          mostAssigned={mostAssigned}
          canManage={canManage}
          onInvite={() => openInviteModal()}
          onSelectMember={(member) => openPersonProfile(member)}
        />
      </div>
      )}

      <TeamAccessInviteModal
        open={inviteOpen}
        onClose={() => {
          setInviteOpen(false);
          setInvitePrefill(null);
        }}
        roles={workspace.roles}
        committees={workspace.committees}
        events={events}
        canProvisionAccounts={canProvisionAccounts}
        prefill={invitePrefill}
        accessLabels={accessLabels}
        accessTemplates={accessTemplates}
      />

      <TeamAccessGiveAppAccessModal
        open={giveAppAccessOpen}
        onClose={() => {
          setGiveAppAccessOpen(false);
          setGiveAppAccessMember(null);
        }}
        member={giveAppAccessMember}
        accessLabels={accessLabels}
        accessTemplates={accessTemplates}
      />

      <TeamAccessEditMemberModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        member={editMember}
        roles={workspace.roles}
        committees={workspace.committees}
        workspace={workspace}
        accessLabels={accessLabels}
        accessTemplates={accessTemplates}
        currentUserEmail={currentUserEmail}
      />

      <TeamAccessOpenTasksDrawer
        open={tasksOpen}
        onClose={() => setTasksOpen(false)}
        member={tasksMember}
      />

      <TeamAccessMoreActionsMenu
        member={moreActionsMember}
        anchor={moreActionsAnchor}
        onClose={() => {
          setMoreActionsMember(null);
          setMoreActionsAnchor(null);
        }}
        isSelf={
          moreActionsMember
            ? isCurrentUserTeamMember(moreActionsMember, currentUserEmail)
            : false
        }
        onViewProfile={() => {
          if (moreActionsMember) openPersonProfile(moreActionsMember);
        }}
        onEdit={() => {
          if (moreActionsMember) {
            setEditMember(moreActionsMember);
            setEditOpen(true);
          }
        }}
        onAssignCommittee={() => {
          if (moreActionsMember) {
            openPersonProfile(moreActionsMember, "events");
          }
        }}
        onViewTasks={() => {
          if (moreActionsMember) {
            setTasksMember(moreActionsMember);
            setTasksOpen(true);
          }
        }}
        onViewApprovals={() => {
          if (moreActionsMember) {
            window.location.href = "/approvals";
          }
        }}
        onDeactivate={() => {
          if (moreActionsMember) handleDeactivate(moreActionsMember);
        }}
        onArchive={() => {
          if (moreActionsMember) handleArchive(moreActionsMember);
        }}
        onRemove={() => {
          if (moreActionsMember) handleRemove(moreActionsMember);
        }}
        onInvite={() => {
          if (moreActionsMember) {
            openGiveAppAccess(moreActionsMember);
          }
        }}
        onResendInvite={() => {
          if (!moreActionsMember?.raw) {
            return;
          }
          startTransition(async () => {
            await resendTeamInviteAction(moreActionsMember.raw!.id);
            router.refresh();
          });
        }}
        onChangeAccess={() => {
          if (moreActionsMember) {
            openPersonProfile(moreActionsMember, "access");
          }
        }}
      />
    </div>
  );
}
