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
import {
  removeRosterCommitteeAssignmentAction,
  updateOrganizationCommitteeAction,
  updateOrganizationMemberAction,
} from "@/lib/organization-workspace/actions";
import type { TeamAccessWorkloadIndex } from "@/lib/organization-workspace/team-access-workload";
import type { OrganizationUser } from "@/types/auth";
import type { OrganizationWorkspaceData } from "@/types/organization-workspace";

const VALID_TABS: PersonProfileTab[] = [
  "overview",
  "events",
  "access",
  "activity",
];

/** Legacy ?tab=responsibilities redirects into Events (roles live there now). */
function parseTab(value: string | null): PersonProfileTab {
  if (value === "responsibilities") {
    return "events";
  }
  if (value && VALID_TABS.includes(value as PersonProfileTab)) {
    return value as PersonProfileTab;
  }
  return "overview";
}

interface TeamAccessPersonProfileShellProps {
  memberId: string;
  /** Server-resolved profile; skips rebuilding the full org roster when set. */
  profileMember?: UnifiedTeamMember | null;
  members: OrganizationUser[];
  workspace: OrganizationWorkspaceData;
  workload: TeamAccessWorkloadIndex;
  canManage: boolean;
  canProvisionAccounts: boolean;
  events: TeamAccessEventOption[];
  accessLabels?: Partial<Record<string, string>> | null;
  accessTemplates?: import("@/lib/access-templates/types").AccessTemplate[];
}

export function TeamAccessPersonProfileShell({
  memberId,
  profileMember = null,
  members,
  workspace,
  workload,
  canManage,
  canProvisionAccounts,
  events,
  accessLabels = null,
  accessTemplates = [],
}: TeamAccessPersonProfileShellProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const unifiedMembers = useMemo(() => {
    if (profileMember && profileMember.id === memberId) {
      return [profileMember];
    }
    return buildUnifiedTeamMembers(members, workspace, workload);
  }, [profileMember, memberId, members, workspace, workload]);

  const [member, setMember] = useState<UnifiedTeamMember | null>(() => {
    return profileMember?.id === memberId
      ? profileMember
      : (unifiedMembers.find((entry) => entry.id === memberId) ?? null);
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
    campaignRole?: string;
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
    const raw = searchParams.get("tab");
    setActiveTab(parseTab(raw));
    // Keep old bookmarks working without leaving a stale tab name in the URL.
    if (raw === "responsibilities") {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", "events");
      router.replace(`?${params.toString()}`, { scroll: false });
    }
  }, [searchParams, router]);

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
        campaignRole:
          target.accessTemplateId ?? target.accessLevel ?? undefined,
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
    if (
      !target.raw ||
      (target.status !== "invited" && target.status !== "deactivated")
    ) {
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
    campaignRole: CampaignRole | string,
  ): Promise<string | null> {
    if (target.isRosterOnly || !target.raw) {
      return "Use Invite to Login to grant login access for people who are not invited yet.";
    }

    const result = await updateTeamMemberAction(target.raw.id, { campaignRole });
    if (result.error) {
      return result.error;
    }

    router.refresh();
    const template =
      accessTemplates.find((entry) => entry.id === campaignRole) ?? null;
    const nextAccessLevel = template?.baseRole ?? (campaignRole as CampaignRole);
    const nextTemplateId = template?.id ?? String(campaignRole);
    setMember((current) =>
      current
        ? {
            ...current,
            accessLevel: nextAccessLevel,
            accessTemplateId: nextTemplateId,
            accessLabel: accessLevelLabel(
              nextTemplateId,
              false,
              accessLabels,
            ),
            status: current.raw?.status ?? current.status,
            isRosterOnly: false,
            raw: current.raw
              ? {
                  ...current.raw,
                  campaignRole: nextAccessLevel,
                  accessTemplateId: nextTemplateId,
                }
              : current.raw,
          }
        : current,
    );
    return null;
  }

  function handleTabChange(tab: PersonProfileTab) {
    const nextTab = tab === "responsibilities" ? "events" : tab;
    setActiveTab(nextTab);
    const params = new URLSearchParams(searchParams.toString());
    if (nextTab === "overview") {
      params.delete("tab");
    } else {
      params.set("tab", nextTab);
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
        onLinkCommitteeEvent={
          canManage
            ? async (committeeId, eventId) => {
                const result = await updateOrganizationCommitteeAction(
                  committeeId,
                  { assignedEventId: eventId },
                );
                if (result.error) {
                  return result.error;
                }
                router.refresh();
                setMember((current) => {
                  if (!current) {
                    return current;
                  }
                  const nextAssigned = Array.from(
                    new Set([...current.assignedEventIds, eventId]),
                  );
                  return {
                    ...current,
                    assignedEventIds: nextAssigned,
                    committees: current.committees.map((assignment) =>
                      assignment.committee.id === committeeId
                        ? {
                            ...assignment,
                            committee: {
                              ...assignment.committee,
                              assignedEventId: eventId,
                            },
                          }
                        : assignment,
                    ),
                    raw: current.raw
                      ? {
                          ...current.raw,
                          assignedEventIds: nextAssigned,
                        }
                      : current.raw,
                  };
                });
                return null;
              }
            : undefined
        }
        onRemoveEventInvolvement={
          canManage && (member.organizationMemberId || member.raw)
            ? async ({ eventId, committeeId }) => {
                try {
                  if (committeeId && member.organizationMemberId) {
                    const roleResult =
                      await removeRosterCommitteeAssignmentAction({
                        organizationMemberId: member.organizationMemberId,
                        committeeId,
                      });
                    if (roleResult.error) {
                      return roleResult.error;
                    }
                  } else if (committeeId && !member.organizationMemberId) {
                    return "This role is not linked to a roster person, so it cannot be removed here.";
                  }

                  if (eventId) {
                    const nextIds = (
                      member.assignedEventIds ??
                      member.raw?.assignedEventIds ??
                      []
                    ).filter((id) => id !== eventId);

                    if (member.organizationMemberId) {
                      const result = await replaceMemberEventAssignmentsAction({
                        organizationMemberId: member.organizationMemberId,
                        eventIds: nextIds,
                      });
                      if (result.error) {
                        return result.error;
                      }
                    } else if (member.raw) {
                      const result =
                        await setOrganizationUserEventAssignmentsAction({
                          organizationUserId: member.raw.id,
                          eventIds: nextIds,
                        });
                      if (result.error) {
                        return result.error;
                      }
                    }

                    setMember((current) =>
                      current
                        ? {
                            ...current,
                            assignedEventIds: nextIds,
                            committees: committeeId
                              ? current.committees.filter(
                                  (assignment) =>
                                    assignment.committee.id !== committeeId,
                                )
                              : current.committees,
                            raw: current.raw
                              ? {
                                  ...current.raw,
                                  assignedEventIds: nextIds,
                                }
                              : current.raw,
                          }
                        : current,
                    );
                  } else if (committeeId) {
                    setMember((current) =>
                      current
                        ? {
                            ...current,
                            committees: current.committees.filter(
                              (assignment) =>
                                assignment.committee.id !== committeeId,
                            ),
                          }
                        : current,
                    );
                  }

                  router.refresh();
                  return null;
                } catch (error) {
                  return error instanceof Error
                    ? error.message
                    : "Unable to remove this event role.";
                }
              }
            : undefined
        }
        events={events}
        canManage={canManage}
        accessLabels={accessLabels}
        accessTemplates={accessTemplates}
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
        accessLabels={accessLabels}
        accessTemplates={accessTemplates}
      />

      <TeamAccessGiveAppAccessModal
        open={giveAppAccessOpen}
        onClose={() => setGiveAppAccessOpen(false)}
        member={member}
        accessLabels={accessLabels}
        accessTemplates={accessTemplates}
      />

      <TeamAccessEditMemberModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        member={member}
        roles={workspace.roles}
        committees={workspace.committees}
        workspace={workspace}
        accessLabels={accessLabels}
        accessTemplates={accessTemplates}
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
