"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { OrganizationRosterImportBar } from "@/components/organization-workspace/OrganizationRosterImportBar";
import { SettingsV2PageHeader } from "@/components/settings-v2/SettingsV2PageHeader";
import { TeamAccessCommitteeDetailDrawer } from "@/components/settings-v2/team-access/TeamAccessCommitteeDetailDrawer";
import { TeamAccessCreateRoleModal } from "@/components/settings-v2/team-access/TeamAccessCreateRoleModal";
import { TeamAccessEditCommitteeModal } from "@/components/settings-v2/team-access/TeamAccessEditCommitteeModal";
import { TeamAccessEditMemberModal } from "@/components/settings-v2/team-access/TeamAccessEditMemberModal";
import { TeamAccessEditRoleModal } from "@/components/settings-v2/team-access/TeamAccessEditRoleModal";
import { TeamAccessInviteModal } from "@/components/settings-v2/team-access/TeamAccessInviteModal";
import { TeamAccessMemberDrawer } from "@/components/settings-v2/team-access/TeamAccessMemberDrawer";
import { TeamAccessMemberTable } from "@/components/settings-v2/team-access/TeamAccessMemberTable";
import { TeamAccessMoreActionsMenu } from "@/components/settings-v2/team-access/TeamAccessMoreActionsMenu";
import { TeamAccessOpenTasksDrawer } from "@/components/settings-v2/team-access/TeamAccessOpenTasksDrawer";
import { TeamAccessRolesModal } from "@/components/settings-v2/team-access/TeamAccessRolesModal";
import { TeamAccessSendMessageModal } from "@/components/settings-v2/team-access/TeamAccessSendMessageModal";
import { TeamAccessSummaryCards } from "@/components/settings-v2/team-access/TeamAccessSummaryCards";
import {
  buildUnifiedTeamMembers,
  countOpenCommitteeRoles,
  accessLevelLabel,
  type UnifiedTeamMember,
} from "@/components/settings-v2/team-access/team-access-utils";
import { Button } from "@/components/ui/Button";
import {
  cancelTeamInviteAction,
  claimOrganizationAccessAction,
  removeTeamMemberAction,
  resendTeamInviteAction,
  setTeamMemberAccessLevelAction,
  updateTeamMemberAction,
} from "@/lib/auth/actions";
import type { CampaignRole } from "@/lib/auth/campaign-roles";
import {
  updateOrganizationMemberAction,
} from "@/lib/organization-workspace/actions";
import type { TeamAccessWorkloadIndex } from "@/lib/organization-workspace/team-access-workload";
import type { OrganizationUser } from "@/types/auth";
import type {
  OrganizationCommittee,
  OrganizationRole,
  OrganizationWorkspaceData,
} from "@/types/organization-workspace";

interface TeamAccessShellProps {
  members: OrganizationUser[];
  workspace: OrganizationWorkspaceData;
  workload: TeamAccessWorkloadIndex;
  canManage: boolean;
  showClaimBanner: boolean;
  currentUserEmail: string | null;
  siteOrigin: string;
  canProvisionAccounts: boolean;
  seatLimit?: number;
}

type DrawerTab = "overview" | "committees" | "permissions" | "activity";

export function TeamAccessShell({
  members,
  workspace,
  workload,
  canManage,
  showClaimBanner,
  currentUserEmail,
  canProvisionAccounts,
  seatLimit = 18,
}: TeamAccessShellProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const unifiedMembers = useMemo(
    () => buildUnifiedTeamMembers(members, workspace, workload),
    [members, workspace, workload],
  );

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [accessFilter, setAccessFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [vpPortfolioFilter, setVpPortfolioFilter] = useState("");
  const [committeeFilter, setCommitteeFilter] = useState("");

  const [selectedMember, setSelectedMember] = useState<UnifiedTeamMember | null>(null);
  const [drawerTab, setDrawerTab] = useState<DrawerTab>("overview");
  const [memberDrawerOpen, setMemberDrawerOpen] = useState(false);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [invitePrefill, setInvitePrefill] = useState<{
    email?: string;
    name?: string;
    committeeId?: string;
    organizationRoleId?: string;
  } | null>(null);

  const [rolesOpen, setRolesOpen] = useState(false);
  const [createRoleOpen, setCreateRoleOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editMember, setEditMember] = useState<UnifiedTeamMember | null>(null);
  const [messageOpen, setMessageOpen] = useState(false);
  const [messageMember, setMessageMember] = useState<UnifiedTeamMember | null>(null);
  const [tasksOpen, setTasksOpen] = useState(false);
  const [tasksMember, setTasksMember] = useState<UnifiedTeamMember | null>(null);

  const [committeeDetailOpen, setCommitteeDetailOpen] = useState(false);
  const [selectedCommitteeId, setSelectedCommitteeId] = useState<string | null>(null);
  const [committeeEditOpen, setCommitteeEditOpen] = useState(false);
  const [editCommittee, setEditCommittee] = useState<OrganizationCommittee | null>(null);
  const [committeeParentRoleId, setCommitteeParentRoleId] = useState("");
  const [roleEditOpen, setRoleEditOpen] = useState(false);
  const [editRole, setEditRole] = useState<OrganizationRole | null>(null);

  const [moreActionsMember, setMoreActionsMember] = useState<UnifiedTeamMember | null>(null);
  const [moreActionsAnchor, setMoreActionsAnchor] = useState<DOMRect | null>(null);

  const activeCount = unifiedMembers.filter(
    (member) => member.status === "active" || member.status === "roster",
  ).length;
  const pendingCount = members.filter((member) => member.status === "invited").length;
  const openRoleCount = countOpenCommitteeRoles(workspace.committees);

  const filteredMembers = useMemo(() => {
    return unifiedMembers.filter((member) => {
      const searchLower = search.toLowerCase();
      const matchesSearch =
        !search ||
        member.displayName.toLowerCase().includes(searchLower) ||
        member.email.toLowerCase().includes(searchLower);

      const matchesRole = !roleFilter || member.orgRoleLabel === roleFilter;
      const matchesAccess = !accessFilter || member.accessLevel === accessFilter;
      const matchesStatus = !statusFilter || member.status === statusFilter;
      const matchesVpPortfolio =
        !vpPortfolioFilter || member.vpPortfolioId === vpPortfolioFilter;
      const matchesCommittee =
        !committeeFilter ||
        member.committees.some(
          (assignment) => assignment.committee.id === committeeFilter,
        );

      return (
        matchesSearch &&
        matchesRole &&
        matchesAccess &&
        matchesStatus &&
        matchesVpPortfolio &&
        matchesCommittee
      );
    });
  }, [
    unifiedMembers,
    search,
    roleFilter,
    accessFilter,
    statusFilter,
    vpPortfolioFilter,
    committeeFilter,
  ]);

  useEffect(() => {
    if (!selectedMember) {
      return;
    }

    const refreshed = unifiedMembers.find(
      (member) =>
        member.id === selectedMember.id ||
        (selectedMember.email &&
          member.email.toLowerCase() === selectedMember.email.toLowerCase()) ||
        (member.displayName === selectedMember.displayName &&
          member.organizationRoleId === selectedMember.organizationRoleId),
    );

    if (
      refreshed &&
      (refreshed.accessLevel !== selectedMember.accessLevel ||
        refreshed.raw?.id !== selectedMember.raw?.id ||
        refreshed.status !== selectedMember.status)
    ) {
      setSelectedMember(refreshed);
    }
  }, [unifiedMembers, selectedMember]);

  const selectedCommittee = selectedCommitteeId
    ? workspace.committees.find((committee) => committee.id === selectedCommitteeId) ?? null
    : null;

  function openMemberDrawer(member: UnifiedTeamMember, tab: DrawerTab = "overview") {
    setSelectedMember(member);
    setDrawerTab(tab);
    setMemberDrawerOpen(true);
  }

  function openInviteModal(prefill?: typeof invitePrefill) {
    setInvitePrefill(prefill ?? null);
    setInviteOpen(true);
  }

  function handleDeactivate(member: UnifiedTeamMember) {
    startTransition(async () => {
      if (member.raw) {
        await updateTeamMemberAction(member.raw.id, {
          status: member.status === "deactivated" ? "active" : "deactivated",
        });
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
      setMemberDrawerOpen(false);
    });
  }

  function handleArchive(member: UnifiedTeamMember) {
    if (!window.confirm(`Archive ${member.displayName}? They will be hidden from active views.`)) {
      return;
    }
    startTransition(async () => {
      if (member.raw) {
        await updateTeamMemberAction(member.raw.id, { status: "deactivated" });
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
      setMemberDrawerOpen(false);
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
      await removeTeamMemberAction(member.raw!.id);
      router.refresh();
    });
  }

  function handleResendInvite(member: UnifiedTeamMember) {
    if (!member.raw || member.status !== "invited") {
      return;
    }
    startTransition(async () => {
      await resendTeamInviteAction(member.raw!.id);
      router.refresh();
    });
  }

  function handleCancelInvite(member: UnifiedTeamMember) {
    if (!member.raw || member.status !== "invited") {
      return;
    }
    if (!window.confirm(`Cancel the pending invite for ${member.displayName}?`)) {
      return;
    }
    startTransition(async () => {
      await cancelTeamInviteAction(member.raw!.id);
      router.refresh();
    });
  }

  async function handleSaveAccessLevel(
    member: UnifiedTeamMember,
    campaignRole: CampaignRole,
  ): Promise<string | null> {
    if (member.emailMissing || !member.email.trim()) {
      return "Add an email address before you can set access level.";
    }

    const result = member.raw
      ? await updateTeamMemberAction(member.raw.id, { campaignRole })
      : await setTeamMemberAccessLevelAction({
          email: member.email,
          organizationRoleId: member.organizationRoleId,
          campaignRole,
        });

    if (result.error) {
      return result.error;
    }

    router.refresh();
    setSelectedMember((current) =>
      current?.id === member.id
        ? {
            ...current,
            accessLevel: campaignRole,
            accessLabel: accessLevelLabel(campaignRole),
            status: current.raw?.status ?? "invited",
            isRosterOnly: false,
            raw: current.raw ? { ...current.raw, campaignRole } : current.raw,
          }
        : current,
    );
    return null;
  }

  function handleClaim() {
    startTransition(async () => {
      await claimOrganizationAccessAction();
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <SettingsV2PageHeader
        title="Team & Access"
        description="Manage members, roles, permissions, and committee responsibilities in one place."
        actions={
          canManage ? (
            <>
              <Button type="button" size="sm" onClick={() => openInviteModal()}>
                Invite member
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setRolesOpen(true)}
              >
                Manage roles & permissions
              </Button>
            </>
          ) : null
        }
      />

      {showClaimBanner && (
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
      )}

      <TeamAccessSummaryCards
        activeCount={activeCount}
        seatLimit={seatLimit}
        pendingCount={pendingCount}
        roleCount={workspace.roles.length}
        committeeCount={workspace.committees.length}
        openRoleCount={openRoleCount}
        onViewInvites={() => setStatusFilter("invited")}
        onViewRoles={() => setRolesOpen(true)}
      />

      {canManage ? (
        <OrganizationRosterImportBar
          roleCount={workspace.roles.length}
          committeeCount={workspace.committees.length}
        />
      ) : null}

      <TeamAccessMemberTable
        members={filteredMembers}
        roles={workspace.roles}
        committees={workspace.committees}
        search={search}
        roleFilter={roleFilter}
        accessFilter={accessFilter}
        statusFilter={statusFilter}
        vpPortfolioFilter={vpPortfolioFilter}
        committeeFilter={committeeFilter}
        onSearchChange={setSearch}
        onRoleFilterChange={setRoleFilter}
        onAccessFilterChange={setAccessFilter}
        onStatusFilterChange={setStatusFilter}
        onVpPortfolioFilterChange={setVpPortfolioFilter}
        onCommitteeFilterChange={setCommitteeFilter}
        onSelectMember={(member) => openMemberDrawer(member)}
        onEditMember={(member) => {
          setEditMember(member);
          setEditOpen(true);
        }}
        onMoreActions={(member, anchor) => {
          setMoreActionsMember(member);
          setMoreActionsAnchor(anchor);
        }}
        canManage={canManage}
      />

      <TeamAccessMemberDrawer
        member={selectedMember}
        open={memberDrawerOpen}
        onClose={() => setMemberDrawerOpen(false)}
        activeTab={drawerTab}
        onTabChange={setDrawerTab}
        workspace={workspace}
        onEdit={() => {
          if (selectedMember) {
            setEditMember(selectedMember);
            setEditOpen(true);
          }
        }}
        onInvite={() => {
          if (selectedMember) {
            openInviteModal({
              email: selectedMember.email || undefined,
              name: selectedMember.displayName,
              organizationRoleId: selectedMember.organizationRoleId ?? undefined,
            });
          }
        }}
        onResendInvite={() => {
          if (selectedMember) handleResendInvite(selectedMember);
        }}
        onCancelInvite={() => {
          if (selectedMember) handleCancelInvite(selectedMember);
        }}
        onSendMessage={() => {
          if (selectedMember) {
            setMessageMember(selectedMember);
            setMessageOpen(true);
          }
        }}
        onDeactivate={() => {
          if (selectedMember) handleDeactivate(selectedMember);
        }}
        onArchive={() => {
          if (selectedMember) handleArchive(selectedMember);
        }}
        onRemove={() => {
          if (selectedMember) handleRemove(selectedMember);
        }}
        onViewTasks={() => {
          if (selectedMember) {
            setTasksMember(selectedMember);
            setTasksOpen(true);
          }
        }}
        onSelectCommittee={(committeeId) => {
          setSelectedCommitteeId(committeeId);
          setCommitteeDetailOpen(true);
        }}
        onSaveAccessLevel={
          canManage && selectedMember
            ? (campaignRole) => handleSaveAccessLevel(selectedMember, campaignRole)
            : undefined
        }
        canManage={canManage}
      />

      <TeamAccessInviteModal
        open={inviteOpen}
        onClose={() => {
          setInviteOpen(false);
          setInvitePrefill(null);
        }}
        roles={workspace.roles}
        committees={workspace.committees}
        canProvisionAccounts={canProvisionAccounts}
        prefill={invitePrefill}
      />

      <TeamAccessRolesModal
        open={rolesOpen}
        onClose={() => setRolesOpen(false)}
        members={members}
        workspace={workspace}
        onCreateRole={() => {
          setRolesOpen(false);
          setCreateRoleOpen(true);
        }}
      />

      <TeamAccessCreateRoleModal
        open={createRoleOpen}
        onClose={() => setCreateRoleOpen(false)}
      />

      <TeamAccessEditMemberModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        member={editMember}
        roles={workspace.roles}
        committees={workspace.committees}
        workspace={workspace}
      />

      <TeamAccessEditCommitteeModal
        open={committeeEditOpen}
        onClose={() => {
          setCommitteeEditOpen(false);
          setEditCommittee(null);
        }}
        committee={editCommittee}
        roles={workspace.roles}
        defaultParentRoleId={committeeParentRoleId}
      />

      <TeamAccessEditRoleModal
        open={roleEditOpen}
        onClose={() => {
          setRoleEditOpen(false);
          setEditRole(null);
        }}
        role={editRole}
      />

      <TeamAccessSendMessageModal
        open={messageOpen}
        onClose={() => setMessageOpen(false)}
        member={messageMember}
      />

      <TeamAccessOpenTasksDrawer
        open={tasksOpen}
        onClose={() => setTasksOpen(false)}
        member={tasksMember}
      />

      <TeamAccessCommitteeDetailDrawer
        open={committeeDetailOpen}
        onClose={() => setCommitteeDetailOpen(false)}
        committee={selectedCommittee}
        workload={workload}
        canManage={canManage}
        onEdit={() => {
          if (selectedCommittee) {
            setEditCommittee(selectedCommittee);
            setCommitteeParentRoleId(selectedCommittee.parentRoleId ?? "");
            setCommitteeEditOpen(true);
          }
        }}
        onInvite={() => {
          if (selectedCommittee) {
            openInviteModal({ committeeId: selectedCommittee.id });
          }
        }}
        onAddMember={() => {
          if (selectedCommittee) {
            setEditCommittee(selectedCommittee);
            setCommitteeEditOpen(true);
          }
        }}
      />

      <TeamAccessMoreActionsMenu
        member={moreActionsMember}
        anchor={moreActionsAnchor}
        onClose={() => {
          setMoreActionsMember(null);
          setMoreActionsAnchor(null);
        }}
        onViewProfile={() => {
          if (moreActionsMember) openMemberDrawer(moreActionsMember);
        }}
        onEdit={() => {
          if (moreActionsMember) {
            setEditMember(moreActionsMember);
            setEditOpen(true);
          }
        }}
        onAssignCommittee={() => {
          if (moreActionsMember) openMemberDrawer(moreActionsMember, "committees");
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
        onSendMessage={() => {
          if (moreActionsMember) {
            setMessageMember(moreActionsMember);
            setMessageOpen(true);
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
            openInviteModal({
              email: moreActionsMember.email || undefined,
              name: moreActionsMember.displayName,
            });
          }
        }}
      />
    </div>
  );
}
