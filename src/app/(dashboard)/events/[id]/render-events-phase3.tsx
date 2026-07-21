import { EventDetailPhase3Client } from "@/components/events-phase3/EventDetailPhase3Client";
import {
  accessHasPermission,
  getEffectiveAccess,
} from "@/lib/access-templates/effective-access";
import { getCurrentCampaignRole } from "@/lib/auth/get-current-role";
import { getActiveMembership } from "@/lib/auth/membership-queries";
import { getAuthUser } from "@/lib/auth/queries";
import {
  resolveEventResponsibilities,
  type CommitteeAssignmentInput,
} from "@/lib/events/event-responsibility";
import { getEventArtwork } from "@/lib/event-workspace/get-event-artwork";
import { getLatestOrganization } from "@/lib/organizations/queries";
import {
  getEventOrganizationDefaults,
  getOrganizationWorkspaceData,
} from "@/lib/organization-workspace/queries";
import { listCommitteeAssignmentsByOrg } from "@/lib/organization-workspace/roster-assignments";
import { resolveApprovalAssignee } from "@/lib/organization-workspace/resolve-approval-assignee";
import { areEventPlaybookTablesAvailable } from "@/lib/event-playbooks/queries";
import { getEventDetailHeroStats } from "@/lib/events-phase3/hero-stats";
import {
  getEventPlaybookName,
  loadEventDetailTabData,
} from "@/lib/events-phase3/tab-loaders";
import type { Event } from "@/types";

export async function renderEventsPhase3Detail(
  event: Event,
  initialTab: string | null,
) {
  const organization = await getLatestOrganization();

  const [
    userRole,
    access,
    artwork,
    orgWorkspace,
    committeeAssignments,
    playbookName,
    heroStats,
    approvalAssignee,
    orgDefaults,
  ] = await Promise.all([
    getCurrentCampaignRole(),
    getEffectiveAccess(),
    getEventArtwork(event.id),
    organization
      ? getOrganizationWorkspaceData(organization.id)
      : Promise.resolve(null),
    organization
      ? listCommitteeAssignmentsByOrg(organization.id)
      : Promise.resolve([]),
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

  const assignmentInputs: CommitteeAssignmentInput[] = committeeAssignments.map(
    (row) => ({
      organizationMemberId: row.organizationMemberId,
      committeeId: row.committeeId,
      role: row.role,
    }),
  );

  const linkedCommittee =
    orgWorkspace?.committees.find(
      (committee) => committee.assignedEventId === event.id,
    ) ?? null;

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

  const approvalFlow = [
    { label: "Event Lead", value: lead },
    { label: "Supervisor", value: supervisor },
    { label: "Final Approval", value: finalApproval },
    { label: "Publishing", value: publisher },
  ];

  const currentAssignments = assignmentInputs
    .filter((row) =>
      linkedCommittee ? row.committeeId === linkedCommittee.id : false,
    )
    .map((row) => ({
      organizationMemberId: row.organizationMemberId,
      role: row.role,
    }));

  // Deep-link: preload only the requested lazy tab (not all tabs).
  const lazyInitial =
    initialTab === "approvals" ||
    initialTab === "tasks" ||
    initialTab === "files" ||
    initialTab === "notes" ||
    initialTab === "vendors" ||
    initialTab === "activity"
      ? initialTab
      : null;

  let initialWorkspace: import("@/components/events-phase3/EventDetailShell").EventDetailWorkspacePanels =
    {};

  if (lazyInitial != null && organization) {
    const [user, membership, campaignRole, tablesAvailable] = await Promise.all([
      getAuthUser(),
      getActiveMembership(),
      getCurrentCampaignRole(),
      areEventPlaybookTablesAvailable(),
    ]);

    if (user && membership) {
      const data = await loadEventDetailTabData(lazyInitial, {
        user,
        membership,
        organizationId: organization.id,
        event,
        campaignRole,
        tablesAvailable,
      });

      switch (data.tab) {
        case "approvals":
          initialWorkspace = { approvalsData: data.approvalsData };
          break;
        case "tasks":
          initialWorkspace = { tasksV2Data: data.tasksV2Data };
          break;
        case "files":
          initialWorkspace = { filesPageData: data.filesPageData };
          break;
        case "notes":
          initialWorkspace = {
            notes: data.notes,
            tablesAvailable: data.tablesAvailable,
          };
          break;
        case "vendors":
          initialWorkspace = {
            eventVendorsData: data.eventVendorsData,
            vendorDirectory: data.vendorDirectory,
          };
          break;
        case "activity":
          initialWorkspace = {
            playbookActivity: data.playbookActivity,
            workspaceTimeline: data.workspaceTimeline,
          };
          break;
      }
    }
  }

  return (
    <EventDetailPhase3Client
      event={event}
      artwork={artwork}
      playbookName={playbookName}
      responsibilities={responsibilities}
      approvalFlow={approvalFlow}
      heroStats={heroStats}
      canManageAssignments={Boolean(
        access && accessHasPermission(access, "manage_people"),
      )}
      workspace={initialWorkspace}
      initialTab={initialTab}
      committeeId={linkedCommittee?.id ?? null}
      committeeName={linkedCommittee?.name ?? null}
      members={(orgWorkspace?.members ?? []).map((member) => ({
        id: member.id,
        name: member.name,
        assignedEventIds: member.assignedEventIds,
      }))}
      currentAssignments={currentAssignments}
    />
  );
}

