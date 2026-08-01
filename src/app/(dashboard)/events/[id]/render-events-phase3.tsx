import { Suspense } from "react";
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
  getOrganizationWorkspaceDataLean,
} from "@/lib/organization-workspace/queries";
import { listCommitteeAssignmentsForCommittee } from "@/lib/organization-workspace/roster-assignments";
import { resolveApprovalAssignee } from "@/lib/organization-workspace/resolve-approval-assignee";
import { areEventPlaybookTablesAvailable } from "@/lib/event-playbooks/queries";
import { getEventDetailHeroStats } from "@/lib/events-phase3/hero-stats";
import {
  getEventPlaybookName,
  loadEventDetailTabData,
} from "@/lib/events-phase3/tab-loaders";
import type { Event } from "@/types";
import { EventDetailApprovalsStream } from "./event-detail-approvals-stream";

function ApprovalsTabFallback() {
  return (
    <div className="space-y-3 rounded-xl border border-cos-border bg-cos-card p-4">
      <div className="flex flex-wrap gap-2">
        <div className="h-8 w-24 animate-pulse rounded-md bg-cos-bg/70" />
        <div className="h-8 w-28 animate-pulse rounded-md bg-cos-bg/70" />
        <div className="h-8 w-20 animate-pulse rounded-md bg-cos-bg/70" />
      </div>
      <div className="h-16 w-full animate-pulse rounded-md bg-cos-bg/70" />
      <div className="h-16 w-full animate-pulse rounded-md bg-cos-bg/70" />
      <div className="h-16 w-3/4 animate-pulse rounded-md bg-cos-bg/70" />
    </div>
  );
}

export async function renderEventsPhase3Detail(
  event: Event,
  initialTab: string | null,
  options?: { showYoureSet?: boolean },
) {
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

  // Event-scoped roster only — full org assignment list loads with Manage Assignments.
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

  const approvalFlow = [
    { label: "Event Lead", value: lead },
    { label: "Supervisor", value: supervisor },
    { label: "Final Approval", value: finalApproval },
    { label: "Publishing", value: publisher },
  ];

  // Bare URL / Approvals: stream tab body so shell/hero paint first.
  const streamApprovals =
    initialTab == null ||
    initialTab === "" ||
    initialTab === "approvals";

  // Other deep links still preload that tab (not the Approvals default path).
  const lazyInitial =
    !streamApprovals &&
    (initialTab === "tasks" ||
      initialTab === "files" ||
      initialTab === "notes" ||
      initialTab === "vendors" ||
      initialTab === "activity" ||
      initialTab === "insights")
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
        case "insights":
          initialWorkspace = {
            insightsData: data.insightsData,
          };
          break;
      }
    }
  }

  const approvalsSlot = streamApprovals ? (
    <Suspense fallback={<ApprovalsTabFallback />}>
      <EventDetailApprovalsStream eventId={event.id} />
    </Suspense>
  ) : undefined;

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
      approvalsSlot={approvalsSlot}
      initialTab={initialTab}
      showYoureSet={Boolean(options?.showYoureSet)}
      committeeId={linkedCommittee?.id ?? null}
      committeeName={linkedCommittee?.name ?? null}
    />
  );
}
