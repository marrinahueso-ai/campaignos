import { CampaignsPageContent } from "@/components/campaigns/CampaignsPageContent";
import { EventsHomeContent } from "@/components/events-phase3/EventsHomeContent";
import { getCampaignPageEvents } from "@/lib/events/campaign-page-queries";
import { collectEventsHomeArtworkEventIds } from "@/lib/events/events-home-artwork-ids";
import { isEventsPhase3UiEnabled } from "@/lib/events/events-phase3-flag";
import {
  resolveResponsiblePersonForEvent,
  type CommitteeAssignmentInput,
} from "@/lib/events/event-responsibility";
import { getEventArtworkMap } from "@/lib/event-workspace/get-event-artwork";
import { getCurrentOrganization } from "@/lib/auth/organization-context";
import { getOrganizationWorkspaceData } from "@/lib/organization-workspace/queries";
import { listCommitteeAssignmentsByOrg } from "@/lib/organization-workspace/roster-assignments";
import { buildEventRosterOwnershipMap } from "@/lib/organization-workspace/resolve-event-roster-ownership";
import {
  getActiveSchoolYear,
  getSchoolYearsForOrganization,
} from "@/lib/school-years/queries";
import { getTodayDateString } from "@/lib/utils/dates";
import type { HeroArtworkSelection } from "@/lib/event-workspace/select-hero-artwork";
import type { Event } from "@/types";

export const metadata = {
  title: "Events",
};

/** Lean client payload — clear unused planning blobs for Events Home UI. */
function toEventsHomeEvent(event: Event): Event {
  return {
    ...event,
    planningQuickLinks: {},
    planningVendors: [],
  };
}

export default async function EventsPage() {
  const today = getTodayDateString();
  const organization = await getCurrentOrganization();
  const phase3 = isEventsPhase3UiEnabled();

  const [events, workspace, schoolYears, activeSchoolYear, committeeAssignments] =
    await Promise.all([
      getCampaignPageEvents(organization?.id ?? null),
      organization
        ? getOrganizationWorkspaceData(organization.id)
        : Promise.resolve(null),
      organization
        ? getSchoolYearsForOrganization(organization.id)
        : Promise.resolve([]),
      organization ? getActiveSchoolYear(organization.id) : Promise.resolve(null),
      organization
        ? listCommitteeAssignmentsByOrg(organization.id)
        : Promise.resolve([]),
    ]);

  const eventIds = events.map((event) => event.id);

  if (!phase3) {
    const artworkByEventId = await getEventArtworkMap(eventIds);
    const [metaScheduledEventIds, eventIdsWithFiles] = await Promise.all([
      import("@/lib/events/campaign-page-queries").then((mod) =>
        mod.getMetaScheduledEventIds(eventIds),
      ),
      import("@/lib/events/campaign-page-queries").then((mod) =>
        mod.getEventIdsWithCampaignFiles(eventIds),
      ),
    ]);
    const ownershipByEventId = buildEventRosterOwnershipMap(events, workspace);

    return (
      <div className="studio-page space-y-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-display text-4xl text-cos-text sm:text-5xl">
              Campaigns
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-cos-muted sm:text-base">
              Full campaigns and reminder-only plans — these are the events that get
              social posts and communications. Pure calendar dates stay on the Calendar
              only.
            </p>
          </div>
        </header>
        <CampaignsPageContent
          events={events}
          today={today}
          artworkByEventId={artworkByEventId}
          ownershipByEventId={ownershipByEventId}
          metaScheduledEventIds={metaScheduledEventIds}
          eventIdsWithFiles={eventIdsWithFiles}
          schoolYears={schoolYears.map((year) => ({
            id: year.id,
            label: year.label,
          }))}
          activeSchoolYearId={activeSchoolYear?.id ?? null}
        />
      </div>
    );
  }

  const artworkEventIds = collectEventsHomeArtworkEventIds(
    events,
    today,
    activeSchoolYear?.id ?? null,
  );
  const artworkByEventId = await getEventArtworkMap(artworkEventIds);

  const assignmentInputs: CommitteeAssignmentInput[] = committeeAssignments.map(
    (row) => ({
      organizationMemberId: row.organizationMemberId,
      committeeId: row.committeeId,
      role: row.role,
    }),
  );

  const members = workspace?.members ?? [];
  const committees = workspace?.committees ?? [];

  const responsibleByEventId: Record<
    string,
    { displayName: string; organizationTitle: string | null }
  > = {};
  const playbookNameByEventId: Record<string, string | null> = {};
  const committeeByEventId = new Map(
    committees
      .filter((committee) => committee.assignedEventId)
      .map((committee) => [committee.assignedEventId as string, committee]),
  );

  for (const event of events) {
    const resolved = resolveResponsiblePersonForEvent({
      eventId: event.id,
      event,
      committees,
      members,
      committeeAssignments: assignmentInputs,
    });
    responsibleByEventId[event.id] = {
      displayName: resolved.displayName,
      organizationTitle: resolved.organizationTitle,
    };
    playbookNameByEventId[event.id] =
      committeeByEventId.get(event.id)?.playbookSlug ?? null;
  }

  const leanEvents = events.map(toEventsHomeEvent);
  const artworkRecord: Record<string, HeroArtworkSelection | null> = {};
  for (const [eventId, artwork] of artworkByEventId) {
    artworkRecord[eventId] = artwork;
  }

  return (
    <EventsHomeContent
      events={leanEvents}
      today={today}
      artworkByEventId={artworkRecord}
      responsibleByEventId={responsibleByEventId}
      playbookNameByEventId={playbookNameByEventId}
      schoolYears={schoolYears.map((year) => ({
        id: year.id,
        label: year.label,
      }))}
      activeSchoolYearId={activeSchoolYear?.id ?? null}
    />
  );
}
