import { redirect } from "next/navigation";
import { CreateWithAiHub } from "@/components/campaign-builder-v2/CreateWithAiHub";
import { hasPermission } from "@/lib/access-templates/effective-access";
import { isCampaignBuilderV2Enabled } from "@/lib/campaign-builder-v2/feature-flag";
import { getCampaignPageEvents } from "@/lib/events/campaign-page-queries";
import { getLatestOrganization } from "@/lib/organizations/queries";

export const metadata = {
  title: "Create with AI",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function CreateWithAiPage() {
  if (!isCampaignBuilderV2Enabled()) {
    redirect("/events");
  }

  const organization = await getLatestOrganization();
  const [canUseCreateWithAi, events] = await Promise.all([
    hasPermission("upload_artwork"),
    getCampaignPageEvents(organization?.id ?? null),
  ]);

  return (
    <CreateWithAiHub
      canUseCreateWithAi={canUseCreateWithAi}
      organizationName={organization?.name ?? null}
      events={events.map((event) => ({
        id: event.id,
        title: event.title,
        date: event.date,
      }))}
    />
  );
}
