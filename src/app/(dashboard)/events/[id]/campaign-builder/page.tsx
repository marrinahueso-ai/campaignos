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
import { getLatestOrganization } from "@/lib/organizations/queries";
import type { BrandKitOption, PlaybookOption } from "@/lib/campaign-builder-v2/types";

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

  const [event, organization, savedSession] = await Promise.all([
    getEventById(id),
    getLatestOrganization(),
    loadCampaignBuilderSession(id),
  ]);

  if (!event) {
    notFound();
  }

  const [playbooks, campaignOptions] = await Promise.all([
    getCachedPlaybooksForOrganization(organization?.id ?? null),
    getCachedCampaignBuilderCampaignOptions(organization?.id ?? null, event),
  ]);

  const playbookOptions: PlaybookOption[] = playbooks.map((playbook) => ({
    id: playbook.id,
    name: playbook.name,
  }));

  const brandKits: BrandKitOption[] = [
    { id: "org-default", name: "Organization Brand Kit" },
    { id: "ees-pto", name: "EES PTO Brand Kit" },
  ];

  const restoredFromServer = savedSession !== null;
  const initialSession = savedSession
    ? normalizeCampaignBuilderSession(
        savedSession,
        event.id,
        event.title,
        event.date,
      )
    : buildDefaultSession(event.id, event.title, event.date);

  return (
    <CampaignBuilderShell
      eventId={event.id}
      eventTitle={event.title}
      eventDate={event.date}
      playbooks={playbookOptions}
      brandKits={brandKits}
      campaignOptions={campaignOptions}
      initialSession={initialSession}
      restoredFromServer={restoredFromServer}
    />
  );
}
