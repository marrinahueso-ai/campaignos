import { notFound } from "next/navigation";
import { EventWorkspaceCalendarLayout } from "@/components/event-workspace/EventWorkspaceCalendarLayout";
import { EventWorkspaceCampaignLayout } from "@/components/event-workspace/EventWorkspaceCampaignLayout";
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
import { buildFallbackPlaybookData } from "@/lib/playbooks/mock-data";
import {
  getEventPlaybookData,
  getPlaybooksForOrganization,
} from "@/lib/playbooks/queries";

interface EventWorkspacePageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: EventWorkspacePageProps) {
  const { id } = await params;
  const event = await getEventById(id);

  return {
    title: event ? event.title : "Campaign workspace",
  };
}

export default async function EventWorkspacePage({ params }: EventWorkspacePageProps) {
  const { id } = await params;
  const event = await getEventById(id);

  if (!event) {
    notFound();
  }

  const hasCampaign = shouldAssignPlaybook(event.communicationStrategy);

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
  });
  const aiStatus = getAiAssistantStatus();
  const showRoleSimulator = process.env.NODE_ENV === "development";

  if (!hasCampaign) {
    const campaignIntelligence = getCampaignIntelligenceFromWorkspace(
      event,
      resolvedWorkspace,
    );
    const [organizationDefaults, eventMemory] = await Promise.all([
      organization
        ? getEventOrganizationDefaults(organization.id, event)
        : Promise.resolve(null),
      getEventMemory({
        event,
        schoolYear: organization?.schoolYear ?? null,
        workspace: resolvedWorkspace,
        campaignIntelligence,
      }),
    ]);

    return (
      <EventWorkspaceCalendarLayout
        event={event}
        eventId={event.id}
        nextStep={getEventNextStep(false, [])}
        artwork={heroArtwork}
        campaignIntelligence={campaignIntelligence}
        organizationDefaults={organizationDefaults}
        assets={resolvedWorkspace.assets}
        communicationStrategy={event.communicationStrategy}
        eventMemory={eventMemory}
      />
    );
  }

  const [
    playbookData,
    availablePlaybooks,
    stepDrafts,
    metaPublishBundles,
    metaSocialCaptionMilestones,
    assetVersionsMap,
    orgWorkspace,
  ] = await Promise.all([
    getEventPlaybookData(event.id),
    getPlaybooksForOrganization(organization?.id ?? null),
    getStepDraftsForEvent(event.id),
    getMetaPublishBundles(event.id),
    buildMetaSocialCaptionMilestones(event.id),
    getAssetVersionsForEvent(event.id),
    organization
      ? getOrganizationWorkspaceData(organization.id)
      : Promise.resolve(null),
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

  const ownership = orgWorkspace
    ? resolveEventRosterOwnership(event, orgWorkspace)
    : {
        committeeName: null,
        chairNames: [],
        vpRoleName: null,
        vpContactName: null,
        committeeFilled: false,
        vpFilled: false,
      };
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

  return (
    <EventWorkspaceCampaignLayout
      event={event}
      eventId={event.id}
      organizationName={organization?.name ?? null}
      nextStep={getEventNextStep(true, resolvedPlaybook.steps)}
      artwork={heroArtwork}
      campaignProgress={campaignProgress}
      playbookData={resolvedPlaybook}
      availablePlaybooks={availablePlaybooks}
      stepDrafts={stepDrafts}
      metaSocialCaptionMilestones={metaSocialCaptionMilestones}
      assets={resolvedWorkspace.assets}
      assetVersions={assetVersions}
      metaPublishBundles={metaPublishBundles}
      timeline={resolvedWorkspace.timeline}
      communicationStrategy={event.communicationStrategy}
      aiStatus={aiStatus}
      userRole={userRole}
      ownership={ownership}
      approvalRoles={approvalRoles}
      defaultApprovalRoleId={defaultApprovalRoleId}
      showRoleSimulator={showRoleSimulator}
      eventDetailsChanged={eventDetailsChanged}
    />
  );
}
