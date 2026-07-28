import { HomepageComposer } from "@/components/homepage-composer/HomepageComposer";
import { getCampaignPageEvents } from "@/lib/events/campaign-page-queries";
import type { HomepageComposerEvent } from "@/lib/homepage-composer/types";
import { getEventVolunteerSignupUrls } from "@/lib/homepage-composer/volunteer-links";
import { getLatestOrganization } from "@/lib/organizations/queries";

export const metadata = {
  title: "Homepage Composer",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function HomepageComposerPage() {
  const organization = await getLatestOrganization();
  const events = await getCampaignPageEvents(organization?.id ?? null);
  const volunteerUrls = await getEventVolunteerSignupUrls(
    events.map((event) => event.id),
  );

  const composerEvents: HomepageComposerEvent[] = events.map((event) => ({
    id: event.id,
    title: event.title,
    description: event.description ?? "",
    date: event.date,
    time: event.time,
    imageUrl: event.approvedSquareImageUrl,
    volunteerSignupUrl: volunteerUrls.get(event.id) ?? "",
  }));

  return (
    <div className="-mt-3 lg:-mt-5">
      <HomepageComposer
        organizationId={organization?.id ?? null}
        organizationName={organization?.name ?? null}
        events={composerEvents}
      />
    </div>
  );
}
