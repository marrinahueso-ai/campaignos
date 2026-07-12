import { notFound, redirect } from "next/navigation";
import { CampaignBuilderShell } from "@/components/campaign-builder-v2/CampaignBuilderShell";
import {
  getCachedCampaignBuilderCampaignOptions,
  getCachedPlaybooksForOrganization,
} from "@/lib/campaign-builder-v2/page-queries";
import { isCampaignBuilderV2Enabled } from "@/lib/campaign-builder-v2/feature-flag";
import { normalizeCampaignBuilderSession } from "@/lib/campaign-builder-v2/normalize-session";
import { loadCampaignBuilderSession } from "@/lib/campaign-builder-v2/session-queries";
import { buildDefaultSession } from "@/lib/campaign-builder-v2/seed-data";
import { getEventById } from "@/lib/events/queries";
import { getLatestOrganization, getSchoolProfile } from "@/lib/organizations/queries";
import { buildCampaignBuilderLogoOptions } from "@/lib/artwork-v2/setup-logos";
import { NO_BRAND_KIT_ID } from "@/lib/campaign-builder-v2/brand-kit";
import type { BrandKitOption, PlaybookOption } from "@/lib/campaign-builder-v2/types";
import { getBrandKitItems } from "@/lib/creative-assets/queries";

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
  };
}

export default async function CampaignBuilderPage({
  params,
}: CampaignBuilderPageProps) {
  if (!isCampaignBuilderV2Enabled()) {
    redirect("/events");
  }

  const { id } = await params;

  const [event, organization, schoolProfile, savedSession] = await Promise.all([
    getEventById(id),
    getLatestOrganization(),
    getSchoolProfile(),
    loadCampaignBuilderSession(id),
  ]);

  if (!event) {
    notFound();
  }

  const [playbooks, campaignOptions, brandKitItems] = await Promise.all([
    getCachedPlaybooksForOrganization(organization?.id ?? null),
    getCachedCampaignBuilderCampaignOptions(organization?.id ?? null, event),
    organization?.id
      ? getBrandKitItems(organization.id)
      : Promise.resolve([]),
  ]);

  const playbookOptions: PlaybookOption[] = playbooks.map((playbook) => ({
    id: playbook.id,
    name: playbook.name,
  }));

  const brandKits: BrandKitOption[] = [
    { id: NO_BRAND_KIT_ID, name: "No brand kit" },
    { id: "org-default", name: "Organization Brand Kit" },
  ];

  const logoOptions = buildCampaignBuilderLogoOptions(
    schoolProfile?.brandAssets,
    brandKitItems,
  );
  const schoolColors = {
    primary: schoolProfile?.brandAssets?.primaryColor ?? null,
    secondary: schoolProfile?.brandAssets?.secondaryColor ?? null,
  };

  const restoredFromServer = savedSession !== null;
  const initialSession = savedSession
    ? normalizeCampaignBuilderSession(
        savedSession,
        event.id,
        event.title,
        event.date,
      )
    : buildDefaultSession(event.id, event.title, event.date);

  if (!initialSession.inspiration.selectedLogoId && logoOptions[0]) {
    initialSession.inspiration.selectedLogoId = logoOptions[0].id;
  }
  initialSession.inspiration.primarySchoolColor = schoolColors.primary;
  initialSession.inspiration.secondarySchoolColor = schoolColors.secondary;

  return (
    <CampaignBuilderShell
      eventId={event.id}
      eventTitle={event.title}
      eventDate={event.date}
      playbooks={playbookOptions}
      brandKits={brandKits}
      campaignOptions={campaignOptions}
      logoOptions={logoOptions}
      schoolColors={schoolColors}
      initialSession={initialSession}
      restoredFromServer={restoredFromServer}
    />
  );
}
