import { VolunteerComposer } from "@/components/volunteer-composer/VolunteerComposer";
import { getCampaignPageEvents } from "@/lib/events/campaign-page-queries";
import { getEventVolunteerSignupUrls } from "@/lib/homepage-composer/volunteer-links";
import type { VolunteerComposerEvent } from "@/lib/volunteer-composer/types";
import { getLatestOrganization } from "@/lib/organizations/queries";

export const metadata = {
  title: "Volunteer Composer",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function VolunteerComposerPage() {
  const organization = await getLatestOrganization();
  const events = await getCampaignPageEvents(organization?.id ?? null);
  const volunteerUrls = await getEventVolunteerSignupUrls(
    events.map((event) => event.id),
  );

  const composerEvents: VolunteerComposerEvent[] = events.map((event) => ({
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
      <VolunteerComposer
        organizationId={organization?.id ?? null}
        organizationName={organization?.name ?? null}
        events={composerEvents}
      />
    </div>
  );
}
