import { redirect } from "next/navigation";
import { CampaignBuilderShell } from "@/components/campaign-builder-v2/CampaignBuilderShell";
import {
  getCachedCampaignBuilderBrandSetup,
  getCachedCampaignBuilderCampaignOptions,
  getCachedCampaignBuilderPlaybookOptions,
} from "@/lib/campaign-builder-v2/page-queries";
import {
  applyResolvedApproverToWorkflow,
  toResolvedWorkflowApprover,
} from "@/lib/campaign-builder-v2/approval-workflow";
import { isCampaignBuilderV2Enabled } from "@/lib/campaign-builder-v2/feature-flag";
import { normalizeCampaignBuilderSession } from "@/lib/campaign-builder-v2/normalize-session";
import { loadCampaignBuilderSession } from "@/lib/campaign-builder-v2/session-queries";
import { hasPermission } from "@/lib/access-templates/effective-access";
import { canUseDeveloperClearTools } from "@/lib/dev-tools/access";
import { getEventById } from "@/lib/events/queries";
import { resolveApprovalAssignee } from "@/lib/organization-workspace/resolve-approval-assignee";
import { getLatestOrganization } from "@/lib/organizations/queries";
import { buildCampaignBuilderLogoOptions } from "@/lib/artwork-v2/setup-logos";
import {
  hasOrganizationBrandDirection,
  NO_BRAND_KIT_ID,
  ORG_DEFAULT_BRAND_KIT_ID,
  resolveBrandKitIdForSession,
} from "@/lib/campaign-builder-v2/brand-kit";
import type { BrandKitOption } from "@/lib/campaign-builder-v2/types";

interface CampaignBuilderPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: CampaignBuilderPageProps) {
  const { id } = await params;
  const event = await getEventById(id);

  return {
    title: event
      ? `${event.title} — Create with AI`
      : "Create with AI",
    description:
      "Set creative direction for AI campaign artwork and captions — inspiration, logo, colors, and voice.",
    alternates: {
      canonical: `/events/${id}/campaign-builder`,
    },
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function CampaignBuilderPage({
  params,
}: CampaignBuilderPageProps) {
  if (!isCampaignBuilderV2Enabled()) {
    redirect("/events");
  }

  const { id } = await params;

  // Kick off org early so brand/playbook/options can overlap with event+session.
  const organizationPromise = getLatestOrganization();
  const eventPromise = getEventById(id);
  const sessionPromise = loadCampaignBuilderSession(id);
  const brandPromise = getCachedCampaignBuilderBrandSetup();

  const playbooksPromise = organizationPromise.then((organization) =>
    getCachedCampaignBuilderPlaybookOptions(organization?.id ?? null),
  );
  const campaignOptionsPromise = Promise.all([
    organizationPromise,
    eventPromise,
  ]).then(([organization, event]) =>
    event
      ? getCachedCampaignBuilderCampaignOptions(
          organization?.id ?? null,
          event,
        )
      : Promise.resolve([]),
  );

  const approvalAssigneePromise = Promise.all([
    organizationPromise,
    eventPromise,
  ]).then(([organization, event]) =>
    organization && event
      ? resolveApprovalAssignee(
          organization.id,
          event.approvalOrganizationRoleId ?? null,
        )
      : null,
  );

  const [
    event,
    savedSession,
    brandSetup,
    playbookOptions,
    campaignOptions,
    organization,
    canUseDeveloperTools,
    canUploadArtwork,
    approvalAssignee,
  ] = await Promise.all([
    eventPromise,
    sessionPromise,
    brandPromise,
    playbooksPromise,
    campaignOptionsPromise,
    organizationPromise,
    canUseDeveloperClearTools(),
    hasPermission("upload_artwork"),
    approvalAssigneePromise,
  ]);

  if (!event) {
    // Stale sidebar "last event" (e.g. after switching or founding a new org)
    // — land on the Create with AI hub instead of Events.
    redirect("/create-with-ai");
  }

  const brandKits: BrandKitOption[] = [
    { id: NO_BRAND_KIT_ID, name: "No brand kit" },
    { id: ORG_DEFAULT_BRAND_KIT_ID, name: "Organization Brand Kit" },
  ];

  const logoOptions = buildCampaignBuilderLogoOptions(
    brandSetup.brandAssets,
    brandSetup.brandKitItems,
  );
  const schoolColors = brandSetup.schoolColors;
  const mascot = brandSetup.mascot;
  const hasBrandDirection = hasOrganizationBrandDirection({
    primaryColor: schoolColors.primary,
    secondaryColor: schoolColors.secondary,
    ptoLogo: brandSetup.brandAssets?.ptoLogo,
    schoolLogo: brandSetup.brandAssets?.schoolLogo,
    mascot,
    brandKitItemCount: brandSetup.brandKitItems.length,
  });

  const restoredFromServer = savedSession !== null;
  // Always normalize — even for a brand-new campaign with no saved session —
  // so stale/demo seed text (artwork notes, caption notes, AI guidance) is
  // stripped the same way it is for restored sessions. Without this, a new
  // campaign's default milestones carried hardcoded example copy (e.g.
  // "Bold headline, vintage school poster style") straight into real form
  // fields and into generation prompts before the user ever typed anything.
  const initialSession = normalizeCampaignBuilderSession(
    savedSession ?? {},
    event.id,
    event.title,
    event.date,
  );

  // Keep org colors available for the organization_palette mode, but do not
  // auto-select logo, colors, or tone — Creative Setup starts at explicit None.
  // Org brand kit itself defaults on when brand direction exists so AI reads
  // school logos / colors / mascot even without Creative Setup toggles.
  initialSession.inspiration.primarySchoolColor = schoolColors.primary;
  initialSession.inspiration.secondarySchoolColor = schoolColors.secondary;
  initialSession.inspiration.brandKitId = resolveBrandKitIdForSession(
    initialSession.inspiration.brandKitId,
    hasBrandDirection,
  );

  const resolvedWorkflowApprover = approvalAssignee
    ? toResolvedWorkflowApprover(approvalAssignee)
    : null;
  if (resolvedWorkflowApprover) {
    initialSession.approvalWorkflow = applyResolvedApproverToWorkflow(
      initialSession.approvalWorkflow,
      resolvedWorkflowApprover,
    );
  }

  return (
    <CampaignBuilderShell
      eventId={event.id}
      eventTitle={event.title}
      eventDate={event.date}
      organizationId={organization?.id ?? ""}
      canUseDeveloperTools={canUseDeveloperTools}
      canUploadArtwork={canUploadArtwork}
      playbooks={playbookOptions}
      brandKits={brandKits}
      campaignOptions={campaignOptions}
      logoOptions={logoOptions}
      schoolColors={schoolColors}
      mascot={mascot}
      initialSession={initialSession}
      restoredFromServer={restoredFromServer}
      resolvedWorkflowApprover={resolvedWorkflowApprover}
    />
  );
}
