"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { TeamAccessEditMemberModal } from "@/components/settings-v2/team-access/TeamAccessEditMemberModal";
import { TeamAccessGiveAppAccessModal } from "@/components/settings-v2/team-access/TeamAccessGiveAppAccessModal";
import { TeamAccessInviteModal } from "@/components/settings-v2/team-access/TeamAccessInviteModal";
import { TeamAccessOpenTasksDrawer } from "@/components/settings-v2/team-access/TeamAccessOpenTasksDrawer";
import {
  TeamAccessPersonProfile,
  type PersonProfileTab,
  type TeamAccessEventOption,
} from "@/components/settings-v2/team-access/TeamAccessPersonProfile";
import { TeamAccessSendMessageModal } from "@/components/settings-v2/team-access/TeamAccessSendMessageModal";
import {
  accessLevelLabel,
  buildUnifiedTeamMembers,
  type UnifiedTeamMember,
} from "@/components/settings-v2/team-access/team-access-utils";
import {
  cancelTeamInviteAction,
  removeTeamMemberAction,
  replaceMemberEventAssignmentsAction,
  resendTeamInviteAction,
  setOrganizationUserEventAssignmentsAction,
  updateTeamMemberAction,
} from "@/lib/auth/actions";
import type { CampaignRole } from "@/lib/auth/campaign-roles";
import { updateOrganizationMemberAction } from "@/lib/organization-workspace/actions";
import type { TeamAccessWorkloadIndex } from "@/lib/organization-workspace/team-access-workload";
import type { OrganizationUser } from "@/types/auth";
import type { OrganizationWorkspaceData } from "@/types/organization-workspace";

const VALID_TABS: PersonProfileTab[] = [
  "overview",
  "events",
  "responsibilities",
  "access",
  "activity",
];

function parseTab(value: string | null): PersonProfileTab {
  if (value && VALID_TABS.includes(value as PersonProfileTab)) {
    return value as PersonProfileTab;
  }
  return "overview";
}

interface TeamAccessPersonProfileShellProps {
  memberId: string;
  members: OrganizationUser[];
  workspace: OrganizationWorkspaceData;
  workload: TeamAccessWorkloadIndex;
  canManage: boolean;
  canProvisionAccounts: boolean;
  events: TeamAccessEventOption[];
}

export function TeamAccessPersonProfileShell({
  memberId,
  members,
  workspace,
  workload,
  canManage,
  canProvisionAccounts,
  events,
}: TeamAccessPersonProfileShellProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const unifiedMembers = useMemo(
    () => buildUnifiedTeamMembers(members, workspace, workload),
    [members, workspace, workload],
  );

  const [member, setMember] = useState<UnifiedTeamMember | null>(() => {
    return unifiedMembers.find((entry) => entry.id === memberId) ?? null;
  });

  const [activeTab, setActiveTab] = useState<PersonProfileTab>(() =>
    parseTab(searchParams.get("tab")),
  );

  const [inviteOpen, setInviteOpen] = useState(false);
  const [invitePrefill, setInvitePrefill] = useState<{
    email?: string;
    name?: string;
    committeeId?: string;
    organizationRoleId?: string;
  } | null>(null);
  const [giveAppAccessOpen, setGiveAppAccessOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [messageOpen, setMessageOpen] = useState(false);
  const [tasksOpen, setTasksOpen] = useState(false);
  const [inviteLinkBanner, setInviteLinkBanner] = useState<{
    url: string | null;
    warning: string | null;
    message: string | null;
  } | null>(null);

  useEffect(() => {
    const refreshed = unifiedMembers.find((entry) => entry.id === memberId) ?? null;
    setMember(refreshed);
  }, [unifiedMembers, memberId]);

  useEffect(() => {
    setActiveTab(parseTab(searchParams.get("tab")));
  }, [searchParams]);

  if (!member) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-cos-muted">
          This person could not be found. They may have been removed or merged.
        </p>
        <button
          type="button"
          className="text-sm font-medium text-cos-primary hover:underline"
          onClick={() => router.push("/settings/team-access")}
        >
          Back to People
        </button>
      </div>
    );
  }

  function openInviteModal(prefill?: typeof invitePrefill) {
    setInvitePrefill(prefill ?? null);
    setInviteOpen(true);
  }

  function openGiveAppAccess(target: UnifiedTeamMember) {
    if (!target.organizationMemberId) {
      openInviteModal({
        email: target.email || undefined,
        name: target.displayName,
        organizationRoleId: target.organizationRoleId ?? undefined,
      });
      return;
    }
    setGiveAppAccessOpen(true);
  }

  function handleDeactivate(target: UnifiedTeamMember) {
    startTransition(async () => {
      if (target.raw) {
        await updateTeamMemberAction(target.raw.id, {
          status: target.status === "deactivated" ? "active" : "deactivated",
        });
      } else {
        const rosterMember = workspace.members.find(
          (entry) =>
            entry.email?.toLowerCase() === target.email.toLowerCase() ||
            entry.name === target.displayName,
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

  function handleArchive(target: UnifiedTeamMember) {
    if (
      !window.confirm(
        `Archive ${target.displayName}? They will be hidden from active views.`,
      )
    ) {
      return;
    }
    startTransition(async () => {
      if (target.raw) {
        await updateTeamMemberAction(target.raw.id, { status: "deactivated" });
      } else {
        const rosterMember = workspace.members.find(
          (entry) =>
            entry.email?.toLowerCase() === target.email.toLowerCase() ||
            entry.name === target.displayName,
        );
        if (rosterMember) {
          await updateOrganizationMemberAction(rosterMember.id, {
            active: false,
          });
        }
      }
      router.refresh();
      router.push("/settings/team-access");
    });
  }

  function handleRemove(target: UnifiedTeamMember) {
    if (!target.raw) {
      return;
    }
    if (!window.confirm(`Remove ${target.displayName} from the team?`)) {
      return;
    }
    startTransition(async () => {
      await removeTeamMemberAction(target.raw!.id);
      router.refresh();
      router.push("/settings/team-access");
    });
  }

  function handleResendInvite(target: UnifiedTeamMember) {
    if (!target.raw || target.status !== "invited") {
      return;
    }
    startTransition(async () => {
      const result = await resendTeamInviteAction(target.raw!.id);
      if (result.inviteUrl) {
        setInviteLinkBanner({
          url: result.inviteUrl,
          warning: result.warning ?? null,
          message: result.message ?? "Invite link refreshed.",
        });
      }
      router.refresh();
    });
  }

  function handleCancelInvite(target: UnifiedTeamMember) {
    if (!target.raw || target.status !== "invited") {
      return;
    }
    if (
      !window.confirm(`Cancel the pending invite for ${target.displayName}?`)
    ) {
      return;
    }
    startTransition(async () => {
      await cancelTeamInviteAction(target.raw!.id);
      router.refresh();
    });
  }

  async function handleSaveAccessLevel(
    target: UnifiedTeamMember,
    campaignRole: CampaignRole,
  ): Promise<string | null> {
    if (target.isRosterOnly || !target.raw) {
      return "Use Give App Access to grant login access for roster-only people.";
    }

    const result = await updateTeamMemberAction(target.raw.id, { campaignRole });
    if (result.error) {
      return result.error;
    }

    router.refresh();
    setMember((current) =>
      current
        ? {
            ...current,
            accessLevel: campaignRole,
            accessLabel: accessLevelLabel(campaignRole, false),
            status: current.raw?.status ?? current.status,
            isRosterOnly: false,
            raw: current.raw ? { ...current.raw, campaignRole } : current.raw,
          }
        : current,
    );
    return null;
  }

  function handleTabChange(tab: PersonProfileTab) {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    if (tab === "overview") {
      params.delete("tab");
    } else {
      params.set("tab", tab);
    }
    const query = params.toString();
    router.replace(
      query
        ? `/settings/team-access/people/${encodeURIComponent(memberId)}?${query}`
        : `/settings/team-access/people/${encodeURIComponent(memberId)}`,
      { scroll: false },
    );
  }

  return (
    <>
      {inviteLinkBanner ? (
        <div className="mb-6 border border-cos-border bg-cos-card p-4">
          {inviteLinkBanner.message ? (
            <p className="text-sm font-medium text-cos-text">
              {inviteLinkBanner.message}
            </p>
          ) : null}
          {inviteLinkBanner.warning ? (
            <p className="mt-1 text-sm text-amber-800" role="alert">
              {inviteLinkBanner.warning}
            </p>
          ) : null}
          {inviteLinkBanner.url ? (
            <div className="mt-3 space-y-2">
              <p className="break-all text-sm text-cos-text">
                {inviteLinkBanner.url}
              </p>
            </div>
          ) : null}
          <button
            type="button"
            className="mt-2 text-sm text-cos-muted hover:text-cos-text"
            onClick={() => setInviteLinkBanner(null)}
          >
            Dismiss
          </button>
        </div>
      ) : null}

      <TeamAccessPersonProfile
        member={member}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        workspace={workspace}
        onEdit={() => setEditOpen(true)}
        onInvite={() => openGiveAppAccess(member)}
        onResendInvite={() => handleResendInvite(member)}
        onCancelInvite={() => handleCancelInvite(member)}
        onSendMessage={() => setMessageOpen(true)}
        onDeactivate={() => handleDeactivate(member)}
        onArchive={() => handleArchive(member)}
        onRemove={() => handleRemove(member)}
        onViewTasks={() => setTasksOpen(true)}
        onSelectCommittee={() => {
          router.push("/settings/team-access");
        }}
        onSaveAccessLevel={
          canManage && !member.isRosterOnly
            ? (campaignRole) => handleSaveAccessLevel(member, campaignRole)
            : undefined
        }
        onSaveEventAssignments={
          canManage && (member.organizationMemberId || member.raw)
            ? async (eventIds) => {
                if (member.organizationMemberId) {
                  const result = await replaceMemberEventAssignmentsAction({
                    organizationMemberId: member.organizationMemberId,
                    eventIds,
                  });
                  if (result.error) {
                    return result.error;
                  }
                } else if (member.raw) {
                  const result = await setOrganizationUserEventAssignmentsAction(
                    {
                      organizationUserId: member.raw.id,
                      eventIds,
                    },
                  );
                  if (result.error) {
                    return result.error;
                  }
                }
                router.refresh();
                setMember((current) =>
                  current
                    ? {
                        ...current,
                        assignedEventIds: eventIds,
                        raw: current.raw
                          ? {
                              ...current.raw,
                              assignedEventIds: eventIds,
                            }
                          : current.raw,
                      }
                    : current,
                );
                return null;
              }
            : undefined
        }
        events={events}
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
        events={events}
        canProvisionAccounts={canProvisionAccounts}
        prefill={invitePrefill}
      />

      <TeamAccessGiveAppAccessModal
        open={giveAppAccessOpen}
        onClose={() => setGiveAppAccessOpen(false)}
        member={member}
      />

      <TeamAccessEditMemberModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        member={member}
        roles={workspace.roles}
        committees={workspace.committees}
        workspace={workspace}
      />

      <TeamAccessSendMessageModal
        open={messageOpen}
        onClose={() => setMessageOpen(false)}
        member={member}
      />

      <TeamAccessOpenTasksDrawer
        open={tasksOpen}
        onClose={() => setTasksOpen(false)}
        member={member}
      />
    </>
  );
}
