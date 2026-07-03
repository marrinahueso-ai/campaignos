import { Plus } from "lucide-react";
import { CampaignEventsList } from "@/components/events/CampaignEventsList";
import { Button } from "@/components/ui/Button";
import { getCampaignPageEvents, getMetaScheduledEventIds } from "@/lib/events/campaign-page-queries";
import { groupEventsByMonth, sortCampaignMonthGroups } from "@/lib/events/campaign-page-utils";
import { getEventArtworkMap } from "@/lib/event-workspace/get-event-artwork";
import { getLatestOrganization } from "@/lib/organizations/queries";
import { getOrganizationWorkspaceData } from "@/lib/organization-workspace/queries";
import { buildEventRosterOwnershipMap } from "@/lib/organization-workspace/resolve-event-roster-ownership";
import { getTodayDateString } from "@/lib/utils/dates";

export const metadata = {
  title: "Campaigns",
};

export default async function EventsPage() {
  const today = getTodayDateString();
  const events = await getCampaignPageEvents();
  const eventIds = events.map((event) => event.id);
  const groups = groupEventsByMonth(events);
  const monthGroups = sortCampaignMonthGroups(groups, today);

  const [artworkByEventId, organization, metaScheduledEventIds] = await Promise.all([
    getEventArtworkMap(eventIds),
    getLatestOrganization(),
    getMetaScheduledEventIds(eventIds),
  ]);

  const workspace = organization
    ? await getOrganizationWorkspaceData(organization.id)
    : null;
  const ownershipByEventId = buildEventRosterOwnershipMap(events, workspace);

  return (
    <div className="studio-page space-y-10">
      <header className="flex flex-col gap-4 border-b border-cos-border pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="studio-eyebrow">Workspace</p>
          <h1 className="font-display mt-2 text-4xl text-cos-text sm:text-5xl">Campaigns</h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-cos-muted sm:text-base">
            Full campaigns and reminder-only plans grouped by month — these are the
            events that get social posts and communications. Pure calendar dates stay
            on the Calendar only.
          </p>
        </div>
        <Button href="/events/create" className="shrink-0">
          <Plus className="h-4 w-4" />
          Create campaign
        </Button>
      </header>

      <CampaignEventsList
        monthGroups={monthGroups}
        artworkByEventId={artworkByEventId}
        ownershipByEventId={ownershipByEventId}
        metaScheduledEventIds={metaScheduledEventIds}
      />
    </div>
  );
}
