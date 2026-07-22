import { redirect } from "next/navigation";
import { CreateWithAiHub } from "@/components/campaign-builder-v2/CreateWithAiHub";
import { hasPermission } from "@/lib/access-templates/effective-access";
import { pickDefaultCreateWithAiEvent } from "@/lib/campaign-builder-v2/default-event";
import { isCampaignBuilderV2Enabled } from "@/lib/campaign-builder-v2/feature-flag";
import { createWithAiHref } from "@/lib/events/event-responsibility";
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

  const hubEvents = events.map((event) => ({
    id: event.id,
    title: event.title,
    date: event.date,
  }));

  // Access denied or no events — keep the hub empty states.
  if (!canUseCreateWithAi || hubEvents.length === 0) {
    return (
      <CreateWithAiHub
        canUseCreateWithAi={canUseCreateWithAi}
        organizationName={organization?.name ?? null}
        events={hubEvents}
      />
    );
  }

  // Land directly on Creative Setup (inspiration) for a sensible default event.
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
