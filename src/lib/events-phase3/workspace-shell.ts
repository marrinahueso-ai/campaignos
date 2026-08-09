import {
  accessHasPermission,
  getEffectiveAccess,
} from "@/lib/access-templates/effective-access";
import {
  resolveEventResponsibilities,
  type CommitteeAssignmentInput,
  type EventResponsibilityPerson,
} from "@/lib/events/event-responsibility";
import { getEventArtwork } from "@/lib/event-workspace/get-event-artwork";
import type { HeroArtworkSelection } from "@/lib/event-workspace/select-hero-artwork";
import { getLatestOrganization } from "@/lib/organizations/queries";
import {
  getEventOrganizationDefaults,
  getOrganizationWorkspaceDataLean,
} from "@/lib/organization-workspace/queries";
import { listCommitteeAssignmentsForCommittee } from "@/lib/organization-workspace/roster-assignments";
import { resolveApprovalAssignee } from "@/lib/organization-workspace/resolve-approval-assignee";
import type { EventDetailHeroStats } from "@/components/events-phase3/EventDetailHeroStatsStrip";
import type { EventApprovalFlowStep } from "@/components/events-phase3/EventDetailShell";
import { getEventDetailHeroStats } from "@/lib/events-phase3/hero-stats";
import { getEventPlaybookName } from "@/lib/events-phase3/tab-loaders";
import type { Event } from "@/types";

/**
 * Shared Event Workspace shell payload — identity, artwork, team, hero stats.
 * Loaded once per selected event; tab panels load separately via tab actions.
 */
export type EventWorkspaceShellPayload = {
  event: Event;
  artwork: HeroArtworkSelection | null;
  playbookName: string | null;
  responsibilities: EventResponsibilityPerson[];
  approvalFlow: EventApprovalFlowStep[];
  heroStats: EventDetailHeroStats;
  canManageAssignments: boolean;
  committeeId: string | null;
  committeeName: string | null;
};

/**
 * Build the common Event Workspace shell for an already-authorized event row.
 * Does not load Approvals/Tasks/Volunteers panel datasets.
 */
export async function loadEventWorkspaceShellPayload(
  event: Event,
): Promise<EventWorkspaceShellPayload> {
  const organization = await getLatestOrganization();

  const [
    access,
    artwork,
    orgWorkspace,
    playbookName,
    heroStats,
    approvalAssignee,
    orgDefaults,
  ] = await Promise.all([
    getEffectiveAccess(),
    getEventArtwork(event.id),
    organization
      ? getOrganizationWorkspaceDataLean(organization.id)
      : Promise.resolve(null),
    getEventPlaybookName(event.id),
    getEventDetailHeroStats(event.id),
    organization
      ? resolveApprovalAssignee(
          organization.id,
          event.approvalOrganizationRoleId,
        )
      : Promise.resolve(null),
    organization
      ? getEventOrganizationDefaults(organization.id, event)
      : Promise.resolve(null),
  ]);

  const publishingDefault = orgDefaults?.responsibilities.find(
    (entry) => entry.label === "Publishing",
  );
  const publishingRoleName =
    publishingDefault?.roleName &&
    publishingDefault.roleName !== "Not set"
      ? publishingDefault.roleName
      : null;

  const linkedCommittee =
    orgWorkspace?.committees.find(
      (committee) => committee.assignedEventId === event.id,
    ) ?? null;

  const committeeAssignments = linkedCommittee
    ? await listCommitteeAssignmentsForCommittee(linkedCommittee.id)
    : [];
  const assignmentInputs: CommitteeAssignmentInput[] = committeeAssignments.map(
    (row) => ({
      organizationMemberId: row.organizationMemberId,
      committeeId: row.committeeId,
      role: row.role,
    }),
  );

  const responsibilities = resolveEventResponsibilities({
    eventId: event.id,
    event,
    committees: orgWorkspace?.committees ?? [],
    members: orgWorkspace?.members ?? [],
    committeeAssignments: assignmentInputs,
    finalApproval: approvalAssignee
      ? {
          displayName: approvalAssignee.assigneeDisplayName,
          organizationTitle: approvalAssignee.organizationRoleName,
        }
      : null,
    publisher: publishingRoleName
      ? { displayName: publishingRoleName }
      : null,
  });

  const lead =
    responsibilities.find((row) => row.responsibility === "Event Lead")
      ?.displayName ?? "Not assigned";
  const supervisor =
    responsibilities.find((row) => row.responsibility === "Supervisor")
      ?.displayName ?? "Not assigned";
  const finalApproval =
    responsibilities.find((row) => row.responsibility === "Final Approval")
      ?.displayName ?? "Not assigned";
  const publisher =
    responsibilities.find((row) => row.responsibility === "Publisher")
      ?.displayName ?? "Not assigned";

  const approvalFlow: EventApprovalFlowStep[] = [
    { label: "Event Lead", value: lead },
    { label: "Supervisor", value: supervisor },
    { label: "Final Approval", value: finalApproval },
    { label: "Publishing", value: publisher },
  ];

  return {
    event,
    artwork,
    playbookName,
    responsibilities,
    approvalFlow,
    heroStats,
    canManageAssignments: Boolean(
      access && accessHasPermission(access, "manage_people"),
    ),
    committeeId: linkedCommittee?.id ?? null,
    committeeName: linkedCommittee?.name ?? null,
  };
}
