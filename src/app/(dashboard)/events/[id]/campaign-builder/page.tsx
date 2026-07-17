import { notFound, redirect } from "next/navigation";
import { CampaignBuilderShell } from "@/components/campaign-builder-v2/CampaignBuilderShell";
import {
  getCachedCampaignBuilderBrandSetup,
  getCachedCampaignBuilderCampaignOptions,
  getCachedCampaignBuilderPlaybookOptions,
} from "@/lib/campaign-builder-v2/page-queries";
import { isCampaignBuilderV2Enabled } from "@/lib/campaign-builder-v2/feature-flag";
import { normalizeCampaignBuilderSession } from "@/lib/campaign-builder-v2/normalize-session";
import { loadCampaignBuilderSession } from "@/lib/campaign-builder-v2/session-queries";
import { hasPermission } from "@/lib/access-templates/effective-access";
import { canUseDeveloperClearTools } from "@/lib/dev-tools/access";
import { getEventById } from "@/lib/events/queries";
import { getLatestOrganization } from "@/lib/organizations/queries";
import { buildCampaignBuilderLogoOptions } from "@/lib/artwork-v2/setup-logos";
import { NO_BRAND_KIT_ID } from "@/lib/campaign-builder-v2/brand-kit";
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

  const [
    event,
    savedSession,
    brandSetup,
    playbookOptions,
    campaignOptions,
    organization,
    canUseDeveloperTools,
    canUploadArtwork,
  ] = await Promise.all([
    eventPromise,
    sessionPromise,
    brandPromise,
    playbooksPromise,
    campaignOptionsPromise,
    organizationPromise,
    canUseDeveloperClearTools(),
    hasPermission("upload_artwork"),
  ]);

  if (!event) {
    notFound();
  }

  const brandKits: BrandKitOption[] = [
    { id: NO_BRAND_KIT_ID, name: "No brand kit" },
    { id: "org-default", name: "Organization Brand Kit" },
  ];

  const logoOptions = buildCampaignBuilderLogoOptions(
    brandSetup.brandAssets,
    brandSetup.brandKitItems,
  );
  const schoolColors = brandSetup.schoolColors;

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
  initialSession.inspiration.primarySchoolColor = schoolColors.primary;
  initialSession.inspiration.secondarySchoolColor = schoolColors.secondary;

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
      initialSession={initialSession}
      restoredFromServer={restoredFromServer}
    />
  );
}
