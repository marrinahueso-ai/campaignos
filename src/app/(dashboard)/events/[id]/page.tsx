import { notFound } from "next/navigation";
import { EventPlanningHub } from "@/components/event-playbooks/EventPlanningHub";
import { getCampaignIntelligenceFromWorkspace } from "@/lib/campaign-intelligence/from-workspace";
import { getStepDraftsForEvent } from "@/lib/communications-brain/queries";
import {
  shouldShowEventDetailsChangedNotice,
  shouldShowHubEventDetailsChangedNotice,
} from "@/lib/event-workspace/event-details-notice";
import { buildCampaignProgress } from "@/lib/campaign-progress/build";
import { shouldAssignPlaybook } from "@/lib/events/communication-strategy";
import { initializeEventWorkspace } from "@/lib/event-workspace/mutations";
import { getEventNextStep } from "@/lib/event-workspace/get-next-helpful-action";
import { buildFallbackWorkspaceData } from "@/lib/event-workspace/mock-data";
import { getEventWorkspaceData } from "@/lib/event-workspace/queries";
import { selectHeroArtwork } from "@/lib/event-workspace/select-hero-artwork";
import { getEventById } from "@/lib/events/queries";
import { getEventMemory } from "@/lib/memory";
import { getAiAssistantStatus } from "@/lib/ai";
import { getCurrentCampaignRole } from "@/lib/auth/get-current-role";
import { getAssetVersionsForEvent } from "@/lib/creative-assets/queries";
import { buildMetaSocialCaptionMilestones } from "@/lib/meta-captions/generation";
import { getMetaPublishBundles } from "@/lib/meta-publishing/bundles";
import { getLatestOrganization } from "@/lib/organizations/queries";
import {
  getEventOrganizationDefaults,
  getOrganizationWorkspaceData,
} from "@/lib/organization-workspace/queries";
import { resolveEventRosterOwnership } from "@/lib/organization-workspace/resolve-event-roster-ownership";
import {
  buildCommitteePersonOptions,
  buildVpRoleOptions,
  resolveDefaultCommitteePerson,
  resolveDefaultVpRoleId,
} from "@/lib/event-workspace/plan/milestone-planning-context-utils";
import { buildFallbackPlaybookData } from "@/lib/playbooks/mock-data";
import {
  getEventPlaybookData,
  getPlaybooksForOrganization,
} from "@/lib/playbooks/queries";
import {
  areEventPlaybookTablesAvailable,
  areEventPlaybookTaskGroupsAvailable,
  getEventPlaybookHubData,
  getPastEventLessonsForType,
  getPastEventsForType,
} from "@/lib/event-playbooks/queries";
import { seedDefaultPlaybookTasks } from "@/lib/event-playbooks/mutations";
import { getEventPlanningOverviewData } from "@/lib/event-playbooks/planning-overview-queries";

interface EventWorkspacePageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: EventWorkspacePageProps) {
  const { id } = await params;
  const event = await getEventById(id);

  return {
    title: event ? `${event.title} — Planning hub` : "Planning hub",
  };
}

export default async function EventWorkspacePage({ params }: EventWorkspacePageProps) {
  const { id } = await params;
  const event = await getEventById(id);

  if (!event) {
    notFound();
  }

  const hasCampaign = shouldAssignPlaybook(event.communicationStrategy);

  const tablesAvailable = await areEventPlaybookTablesAvailable();
  const taskGroupsAvailable = await areEventPlaybookTaskGroupsAvailable();
  if (tablesAvailable) {
    await seedDefaultPlaybookTasks(event.id);
  }

  const [organization, workspace, userRole] = await Promise.all([
    getLatestOrganization(),
    getEventWorkspaceData(event.id),
    getCurrentCampaignRole(),
  ]);

  let resolvedWorkspace = workspace ?? buildFallbackWorkspaceData(event);

  const workspaceNeedsInit = hasCampaign
    ? resolvedWorkspace.communications.length === 0
    : resolvedWorkspace.assets.length === 0;

  if (workspaceNeedsInit) {
    await initializeEventWorkspace(event);
    resolvedWorkspace =
      (await getEventWorkspaceData(event.id)) ?? resolvedWorkspace;
  }

  const heroArtwork = selectHeroArtwork({
    assets: resolvedWorkspace.assets,
    communications: resolvedWorkspace.communications,
    approvalRequests: resolvedWorkspace.approvalRequests,
    approvedSquareImageUrl:
      event.approvedSquareImageStatus === "filled"
        ? event.approvedSquareImageUrl
        : null,
  });

  const aiStatus = getAiAssistantStatus();

  const [hubData, pastEvents, pastEventLessons, orgWorkspace] = await Promise.all([
    getEventPlaybookHubData(event.id),
    getPastEventsForType(event.eventType, event.id),
    getPastEventLessonsForType(event.eventType, event.id),
    organization
      ? getOrganizationWorkspaceData(organization.id)
      : Promise.resolve(null),
  ]);

  const pastLessonCount = pastEventLessons.reduce(
    (sum, entry) => sum + entry.lessons.length,
    0,
  );

  const ownership = orgWorkspace
    ? resolveEventRosterOwnership(event, orgWorkspace)
    : null;

  const resolvedOwnership = ownership ?? {
    committeeName: null,
    chairNames: [],
    vpRoleName: null,
    vpContactName: null,
    committeeFilled: false,
    vpFilled: false,
  };

  const committeePersonOptions = buildCommitteePersonOptions(
    resolvedOwnership,
    orgWorkspace?.committees ?? [],
  );
  const defaultCommitteePerson = resolveDefaultCommitteePerson(
    event.eventOwner,
    resolvedOwnership,
    committeePersonOptions,
  );

  if (!hasCampaign) {
    const campaignIntelligence = getCampaignIntelligenceFromWorkspace(
      event,
      resolvedWorkspace,
    );
    const organizationDefaults = organization
      ? await getEventOrganizationDefaults(organization.id, event)
      : null;
    const eventMemory = await getEventMemory({
      event,
      schoolYear: organization?.schoolYear ?? null,
      workspace: resolvedWorkspace,
      campaignIntelligence,
    });

    return (
      <div className="studio-page pb-12">
        <EventPlanningHub
          event={event}
          ownership={ownership}
          hubData={hubData}
          pastEvents={pastEvents}
          pastLessonCount={pastLessonCount}
          aiStatus={aiStatus}
          userRole={userRole}
          tablesAvailable={tablesAvailable}
          taskGroupsAvailable={taskGroupsAvailable}
          hasCampaign={false}
          committeePersonOptions={committeePersonOptions}
          defaultCommitteePerson={defaultCommitteePerson}
          calendarContext={{
            nextStep: getEventNextStep(false, []),
            artwork: heroArtwork,
            campaignIntelligence,
            organizationDefaults,
            assets: resolvedWorkspace.assets,
            eventMemory,
          }}
        />
      </div>
    );
  }

  const [
    playbookData,
    stepDrafts,
    metaPublishBundles,
    metaSocialCaptionMilestones,
    assetVersionsMap,
    availablePlaybooks,
  ] = await Promise.all([
    getEventPlaybookData(event.id),
    getStepDraftsForEvent(event.id),
    getMetaPublishBundles(event.id),
    buildMetaSocialCaptionMilestones(event.id),
    getAssetVersionsForEvent(event.id),
    getPlaybooksForOrganization(organization?.id ?? null),
  ]);

  const resolvedPlaybook = playbookData ?? buildFallbackPlaybookData(event);
  const campaignIntelligence = getCampaignIntelligenceFromWorkspace(
    event,
    resolvedWorkspace,
    resolvedPlaybook.steps,
  );

  const eventDetailsChanged =
    shouldShowEventDetailsChangedNotice(event.updatedAt, stepDrafts) ||
    shouldShowHubEventDetailsChangedNotice(
      event.updatedAt,
      resolvedWorkspace.communications,
    );

  const campaignProgress = buildCampaignProgress({
    steps: resolvedPlaybook.steps,
    communications: resolvedWorkspace.communications,
    approvalRequests: resolvedWorkspace.approvalRequests,
    publicationSchedule: resolvedWorkspace.publicationSchedule,
    assets: resolvedWorkspace.assets,
    intelligence: campaignIntelligence,
    eventUpdatedAt: event.updatedAt ?? event.createdAt,
  });

  const assetVersions = Object.fromEntries(assetVersionsMap.entries());

  const approvalRoles =
    orgWorkspace?.roles.map((role) => ({
      id: role.id,
      name: role.name,
      contactName: role.contactName,
    })) ?? [];
  const defaultApprovalRoleId =
    orgWorkspace?.responsibilityMatrix.find(
      (entry) => entry.responsibilityType === "approvals",
    )?.defaultRoleId ?? null;

  const vpRoles = buildVpRoleOptions(orgWorkspace?.roles ?? []);
  const defaultVpRoleId = resolveDefaultVpRoleId(resolvedOwnership, vpRoles);

  const planningOverview = await getEventPlanningOverviewData({
    eventId: event.id,
    metaPublishBundles,
    timeline: resolvedWorkspace.timeline,
  });

  return (
    <div className="studio-page pb-12">
      <EventPlanningHub
        event={event}
        ownership={resolvedOwnership}
        hubData={hubData}
        pastEvents={pastEvents}
        pastLessonCount={pastLessonCount}
        aiStatus={aiStatus}
        userRole={userRole}
        tablesAvailable={tablesAvailable}
        taskGroupsAvailable={taskGroupsAvailable}
        hasCampaign
        committeePersonOptions={committeePersonOptions}
        defaultCommitteePerson={defaultCommitteePerson}
        campaignWorkspace={{
          organizationName: organization?.name ?? null,
          nextStep: getEventNextStep(true, resolvedPlaybook.steps),
          artwork: heroArtwork,
          campaignProgress,
          playbookData: resolvedPlaybook,
          availablePlaybooks,
          vpRoles,
          defaultVpRoleId,
          committeePersonOptions,
          defaultCommitteePerson,
          stepDrafts,
          metaSocialCaptionMilestones,
          assets: resolvedWorkspace.assets,
          assetVersions,
          metaPublishBundles,
          timeline: resolvedWorkspace.timeline,
          approvalRoles,
          defaultApprovalRoleId,
          eventDetailsChanged,
        }}
        planningOverview={planningOverview}
      />
    </div>
  );
}
