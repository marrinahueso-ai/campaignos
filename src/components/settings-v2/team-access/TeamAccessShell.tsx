"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { OrganizationRosterImportBar } from "@/components/organization-workspace/OrganizationRosterImportBar";
import { SettingsV2PageHeader } from "@/components/settings-v2/SettingsV2PageHeader";
import { TeamAccessAddRosterPersonModal } from "@/components/settings-v2/team-access/TeamAccessAddRosterPersonModal";
import { TeamAccessCommitteeDetailDrawer } from "@/components/settings-v2/team-access/TeamAccessCommitteeDetailDrawer";
import { TeamAccessCommitteesPanel } from "@/components/settings-v2/team-access/TeamAccessCommitteesPanel";
import { TeamAccessCreateRoleModal } from "@/components/settings-v2/team-access/TeamAccessCreateRoleModal";
import { TeamAccessEditCommitteeModal } from "@/components/settings-v2/team-access/TeamAccessEditCommitteeModal";
import { TeamAccessEditMemberModal } from "@/components/settings-v2/team-access/TeamAccessEditMemberModal";
import { TeamAccessEditRoleModal } from "@/components/settings-v2/team-access/TeamAccessEditRoleModal";
import { TeamAccessGiveAppAccessModal } from "@/components/settings-v2/team-access/TeamAccessGiveAppAccessModal";
import { TeamAccessInviteModal } from "@/components/settings-v2/team-access/TeamAccessInviteModal";
import { TeamAccessMemberTable } from "@/components/settings-v2/team-access/TeamAccessMemberTable";
import { TeamAccessMoreActionsMenu } from "@/components/settings-v2/team-access/TeamAccessMoreActionsMenu";
import { TeamAccessOpenTasksDrawer } from "@/components/settings-v2/team-access/TeamAccessOpenTasksDrawer";
import { TeamAccessPeopleSidebar } from "@/components/settings-v2/team-access/TeamAccessPeopleSidebar";
import { teamAccessPersonProfilePath } from "@/components/settings-v2/team-access/TeamAccessPersonProfile";
import { TeamAccessRolesModal } from "@/components/settings-v2/team-access/TeamAccessRolesModal";
import { TeamAccessSendMessageModal } from "@/components/settings-v2/team-access/TeamAccessSendMessageModal";
import {
  buildUnifiedTeamMembers,
  type UnifiedTeamMember,
} from "@/components/settings-v2/team-access/team-access-utils";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";
import { Building2, FileUp, Mail, Users } from "lucide-react";
import {
  claimOrganizationAccessAction,
  removeTeamMemberAction,
  updateTeamMemberAction,
} from "@/lib/auth/actions";
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
  events?: Array<{
    id: string;
    title: string;
    date?: string | null;
    status?: string | null;
  }>;
  seatLimit?: number;
}

type PageTab = "people" | "organization";

export function TeamAccessShell({
  members,
  workspace,
  workload,
  canManage,
  showClaimBanner,
  currentUserEmail,
  canProvisionAccounts,
  events = [],
}: TeamAccessShellProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pageTab, setPageTab] = useState<PageTab>("people");

  const unifiedMembers = useMemo(
    () => buildUnifiedTeamMembers(members, workspace, workload),
    [members, workspace, workload],
  );

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [accessFilter, setAccessFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [committeeFilter, setCommitteeFilter] = useState("");

  const [inviteOpen, setInviteOpen] = useState(false);
  const [invitePrefill, setInvitePrefill] = useState<{
    email?: string;
    name?: string;
    committeeId?: string;
    organizationRoleId?: string;
  } | null>(null);
  const [addRosterOpen, setAddRosterOpen] = useState(false);
  const [giveAppAccessOpen, setGiveAppAccessOpen] = useState(false);
  const [giveAppAccessMember, setGiveAppAccessMember] =
    useState<UnifiedTeamMember | null>(null);

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
  const [showRosterImport, setShowRosterImport] = useState(false);

  const activeCount = unifiedMembers.filter(
    (member) => member.status === "active" || member.status === "roster",
  ).length;
  const invitedCount = unifiedMembers.filter(
    (member) => member.status === "invited",
  ).length;
  const inactiveCount = unifiedMembers.filter(
    (member) => member.status === "deactivated",
  ).length;

  const mostAssigned = useMemo(
    () =>
      [...unifiedMembers]
        .filter((member) => member.assignedEventIds.length > 0)
        .sort(
          (a, b) => b.assignedEventIds.length - a.assignedEventIds.length,
        )
        .slice(0, 5),
    [unifiedMembers],
  );

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
        matchesCommittee
      );
    });
  }, [
    unifiedMembers,
    search,
    roleFilter,
    accessFilter,
    statusFilter,
    committeeFilter,
  ]);

  const selectedCommittee = selectedCommitteeId
    ? workspace.committees.find((committee) => committee.id === selectedCommitteeId) ?? null
    : null;

  function openPersonProfile(
    member: UnifiedTeamMember,
    tab?: "overview" | "events" | "responsibilities" | "access" | "activity",
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
      });
      return;
    }
    setGiveAppAccessMember(member);
    setGiveAppAccessOpen(true);
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

  function handleClaim() {
    startTransition(async () => {
      await claimOrganizationAccessAction();
      router.refresh();
    });
  }

  return (
    <div className="space-y-8">
      <SettingsV2PageHeader
        title="People & Responsibilities"
        description="Manage people and assign responsibilities to events. Hey Ralli automatically manages permissions."
        className="mb-0"
        actions={
          canManage ? (
            <>
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={() => setAddRosterOpen(true)}
              >
                + Add Roster Person
              </Button>
              <Button type="button" size="md" onClick={() => openInviteModal()}>
                <Mail className="h-4 w-4" />
                Invite to Login
              </Button>
            </>
          ) : null
        }
      />

      <nav
        aria-label="People and responsibilities sections"
        className="grid grid-cols-2 gap-3"
      >
        {(
          [
            {
              id: "people" as const,
              label: "People",
              subtitle: "Who they are",
              icon: Users,
            },
            {
              id: "organization" as const,
              label: "Organization",
              subtitle: "Structure & roles",
              icon: Building2,
            },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setPageTab(tab.id)}
            className={cn(
              "flex items-start gap-3.5 rounded-2xl border bg-cos-card px-5 py-5 text-left shadow-sm transition-colors",
              pageTab === tab.id
                ? "border-cos-primary/40 ring-1 ring-cos-primary/25"
                : "border-cos-border hover:border-cos-border hover:bg-cos-bg/50",
            )}
          >
            <div
              className={cn(
                "rounded-xl border border-cos-border p-2.5",
                pageTab === tab.id ? "bg-cos-bg" : "bg-cos-bg/60",
              )}
            >
              <tab.icon className="h-5 w-5 text-cos-text" strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-[15px] font-semibold text-cos-text">{tab.label}</p>
              <p className="mt-0.5 text-xs text-cos-muted">{tab.subtitle}</p>
            </div>
          </button>
        ))}
      </nav>

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

      {pageTab === "people" ? (
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
          <TeamAccessMemberTable
            members={filteredMembers}
            committees={workspace.committees}
            search={search}
            roleFilter={roleFilter}
            accessFilter={accessFilter}
            statusFilter={statusFilter}
            committeeFilter={committeeFilter}
            onSearchChange={setSearch}
            onRoleFilterChange={setRoleFilter}
            onAccessFilterChange={setAccessFilter}
            onStatusFilterChange={setStatusFilter}
            onCommitteeFilterChange={setCommitteeFilter}
            onSelectMember={(member) => openPersonProfile(member)}
            onEditMember={(member) => {
              setEditMember(member);
              setEditOpen(true);
            }}
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
            inactiveCount={inactiveCount}
            mostAssigned={mostAssigned}
            canManage={canManage}
            onInvite={() => openInviteModal()}
            onViewRoles={() => setRolesOpen(true)}
            onSelectMember={(member) => openPersonProfile(member)}
          />
        </div>
      ) : (
        <div className="space-y-4">
          {canManage ? (
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setShowRosterImport((open) => !open)}
              >
                <FileUp className="h-4 w-4" />
                {showRosterImport ? "Hide Import Roster" : "Import Roster"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  setEditCommittee(null);
                  setCommitteeParentRoleId("");
                  setCommitteeEditOpen(true);
                }}
              >
                Create Committee
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setRolesOpen(true)}
              >
                Manage roles & permissions
              </Button>
            </div>
          ) : null}
          {canManage && showRosterImport ? (
            <OrganizationRosterImportBar
              roleCount={workspace.roles.length}
              committeeCount={workspace.committees.length}
            />
          ) : null}
          <TeamAccessCommitteesPanel
            roles={workspace.roles}
            committees={workspace.committees}
            canManage={canManage}
            onAddCommittee={(parentRoleId) => {
              setEditCommittee(null);
              setCommitteeParentRoleId(parentRoleId ?? "");
              setCommitteeEditOpen(true);
            }}
            onEditCommittee={(committee) => {
              setEditCommittee(committee);
              setCommitteeParentRoleId(committee.parentRoleId ?? "");
              setCommitteeEditOpen(true);
            }}
            onEditRole={(role) => {
              setEditRole(role);
              setRoleEditOpen(true);
            }}
            onSelectCommittee={(committeeId) => {
              setSelectedCommitteeId(committeeId);
              setCommitteeDetailOpen(true);
            }}
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
      />

      <TeamAccessAddRosterPersonModal
        open={addRosterOpen}
        onClose={() => setAddRosterOpen(false)}
        roles={workspace.roles}
        committees={workspace.committees}
        events={events}
      />

      <TeamAccessGiveAppAccessModal
        open={giveAppAccessOpen}
        onClose={() => {
          setGiveAppAccessOpen(false);
          setGiveAppAccessMember(null);
        }}
        member={giveAppAccessMember}
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
        events={events}
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
            openPersonProfile(moreActionsMember, "responsibilities");
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
            openGiveAppAccess(moreActionsMember);
          }
        }}
      />
    </div>
  );
}
