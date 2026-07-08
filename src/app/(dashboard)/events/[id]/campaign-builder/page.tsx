import { notFound, redirect } from "next/navigation";
import { CampaignBuilderShell } from "@/components/campaign-builder-v2/CampaignBuilderShell";
import { getCampaignBuilderCampaignOptions } from "@/lib/campaign-builder-v2/campaign-options";
import { isCampaignBuilderV2Enabled } from "@/lib/campaign-builder-v2/feature-flag";
import { getEventById } from "@/lib/events/queries";
import { getLatestOrganization } from "@/lib/organizations/queries";
import { getPlaybooksForOrganization } from "@/lib/playbooks/queries";
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
  const event = await getEventById(id);

  if (!event) {
    notFound();
  }

  const organization = await getLatestOrganization();

  const [playbooks, campaignOptions] = await Promise.all([
    getPlaybooksForOrganization(organization?.id ?? null),
    getCampaignBuilderCampaignOptions(organization?.id ?? null, event),
  ]);

  const playbookOptions: PlaybookOption[] = playbooks.map((playbook) => ({
    id: playbook.id,
    name: playbook.name,
  }));

  const brandKits: BrandKitOption[] = [
    { id: "org-default", name: "Organization Brand Kit" },
    { id: "ees-pto", name: "EES PTO Brand Kit" },
  ];

  return (
    <CampaignBuilderShell
      eventId={event.id}
      eventTitle={event.title}
      eventDate={event.date}
      playbooks={playbookOptions}
      brandKits={brandKits}
      campaignOptions={campaignOptions}
    />
  );
}
