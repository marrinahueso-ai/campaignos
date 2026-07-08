import { Plus } from "lucide-react";
import { CampaignsPageContent } from "@/components/campaigns/CampaignsPageContent";
import { Button } from "@/components/ui/Button";
import {
  getCampaignPageEvents,
  getEventIdsWithCampaignFiles,
  getMetaScheduledEventIds,
} from "@/lib/events/campaign-page-queries";
import { getEventArtworkMap } from "@/lib/event-workspace/get-event-artwork";
import { getCurrentOrganization } from "@/lib/auth/organization-context";
import { getOrganizationWorkspaceData } from "@/lib/organization-workspace/queries";
import { buildEventRosterOwnershipMap } from "@/lib/organization-workspace/resolve-event-roster-ownership";
import { getTodayDateString } from "@/lib/utils/dates";

export const metadata = {
  title: "Campaigns",
};

export default async function EventsPage() {
  const today = getTodayDateString();
  const organization = await getCurrentOrganization();

  const [events, workspace] = await Promise.all([
    getCampaignPageEvents(organization?.id ?? null),
    organization
      ? getOrganizationWorkspaceData(organization.id)
      : Promise.resolve(null),
  ]);

  const eventIds = events.map((event) => event.id);

  const [artworkByEventId, metaScheduledEventIds, eventIdsWithFiles] =
    await Promise.all([
      getEventArtworkMap(eventIds),
      getMetaScheduledEventIds(eventIds),
      getEventIdsWithCampaignFiles(eventIds),
    ]);
  const ownershipByEventId = buildEventRosterOwnershipMap(events, workspace);

  return (
    <div className="studio-page space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-4xl text-cos-text sm:text-5xl">Campaigns</h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-cos-muted sm:text-base">
            Full campaigns and reminder-only plans — these are the events that get
            social posts and communications. Pure calendar dates stay on the Calendar
            only.
          </p>
        </div>
        <Button href="/events/create" className="shrink-0">
          <Plus className="h-4 w-4" />
          Create campaign
        </Button>
      </header>

      <CampaignsPageContent
        events={events}
        today={today}
        artworkByEventId={artworkByEventId}
        ownershipByEventId={ownershipByEventId}
        metaScheduledEventIds={metaScheduledEventIds}
        eventIdsWithFiles={eventIdsWithFiles}
      />
    </div>
  );
}
