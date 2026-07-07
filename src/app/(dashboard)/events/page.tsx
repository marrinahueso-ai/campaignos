import { CampaignsPageContent } from "@/components/campaigns/CampaignsPageContent";
import { Button } from "@/components/ui/Button";
import { getCampaignPageEvents, getMetaScheduledEventIds } from "@/lib/events/campaign-page-queries";
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
  const events = await getCampaignPageEvents(organization?.id ?? null);
  const eventIds = events.map((event) => event.id);

  const [artworkByEventId, metaScheduledEventIds] = await Promise.all([
    getEventArtworkMap(eventIds),
    getMetaScheduledEventIds(eventIds),
  ]);

  const workspace = organization
    ? await getOrganizationWorkspaceData(organization.id)
    : null;
  const ownershipByEventId = buildEventRosterOwnershipMap(events, workspace);

  return (
    <div className="studio-page space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-4xl text-cos-text sm:text-5xl">Campaigns</h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-cos-muted sm:text-base">
            Plan, organize, and launch campaigns that engage your community.
          </p>
        </div>
        <Button href="/events/create" className="shrink-0 rounded-lg">
          + New campaign
        </Button>
      </header>

      <CampaignsPageContent
        events={events}
        today={today}
        artworkByEventId={artworkByEventId}
        ownershipByEventId={ownershipByEventId}
        metaScheduledEventIds={metaScheduledEventIds}
      />
    </div>
  );
}
