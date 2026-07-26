import { redirect } from "next/navigation";
import { CreateWithAiHub } from "@/components/campaign-builder-v2/CreateWithAiHub";
import { hasPermission } from "@/lib/access-templates/effective-access";
import { pickDefaultCreateWithAiEvent } from "@/lib/campaign-builder-v2/default-event";
import { isCampaignBuilderV2Enabled } from "@/lib/campaign-builder-v2/feature-flag";
import { createWithAiHref } from "@/lib/events/event-responsibility";
import { getCampaignPageEvents } from "@/lib/events/campaign-page-queries";
import { getLatestOrganization } from "@/lib/organizations/queries";

export const metadata = {
  title: "Social Media · Create with AI",
  robots: {
    index: false,
    follow: false,
  },
};

/** Opens Campaign Builder for a sensible default event (Creative Setup). */
export default async function CreateWithAiSocialPage() {
  if (!isCampaignBuilderV2Enabled()) {
    redirect("/create-with-ai");
  }

  const organization = await getLatestOrganization();
  const [canUseCreateWithAi, events] = await Promise.all([
    hasPermission("upload_artwork"),
    getCampaignPageEvents(organization?.id ?? null),
  ]);

  const hubEvents = events.map((event) => ({
    id: event.id,
    title: event.title,
    date: event.date,
  }));

  if (!canUseCreateWithAi || hubEvents.length === 0) {
    return (
      <CreateWithAiHub
        canUseCreateWithAi={canUseCreateWithAi}
        organizationName={organization?.name ?? null}
        events={hubEvents}
      />
    );
  }

  const defaultEvent = pickDefaultCreateWithAiEvent(hubEvents);
  if (!defaultEvent) {
    return (
      <CreateWithAiHub
        canUseCreateWithAi={canUseCreateWithAi}
        organizationName={organization?.name ?? null}
        events={hubEvents}
      />
    );
  }

  redirect(createWithAiHref(defaultEvent.id, "inspiration"));
}
