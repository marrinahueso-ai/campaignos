import { NewsletterComposer } from "@/components/newsletter-composer/NewsletterComposer";
import { getCampaignPageEvents } from "@/lib/events/campaign-page-queries";
import { getEventVolunteerSignupUrls } from "@/lib/homepage-composer/volunteer-links";
import type { NewsletterComposerEvent } from "@/lib/newsletter-composer/types";
import { getNewsletterById } from "@/lib/newsletter/queries";
import { getLatestOrganization } from "@/lib/organizations/queries";

export const metadata = {
  title: "Newsletter Composer",
  robots: {
    index: false,
    follow: false,
  },
};

interface NewsletterComposerPageProps {
  searchParams: Promise<{ newsletterId?: string }>;
}

export default async function NewsletterComposerPage({
  searchParams,
}: NewsletterComposerPageProps) {
  const { newsletterId } = await searchParams;
  const organization = await getLatestOrganization();
  const events = await getCampaignPageEvents(organization?.id ?? null);
  const volunteerUrls = await getEventVolunteerSignupUrls(
    events.map((event) => event.id),
  );

  const composerEvents: NewsletterComposerEvent[] = events.map((event) => ({
    id: event.id,
    title: event.title,
    description: event.description ?? "",
    date: event.date,
    time: event.time,
    imageUrl: event.approvedSquareImageUrl,
    volunteerSignupUrl: volunteerUrls.get(event.id) ?? "",
  }));

  const serverNewsletter =
    newsletterId && organization
      ? await getNewsletterById(organization.id, newsletterId)
      : null;

  return (
    <NewsletterComposer
      organizationId={organization?.id ?? null}
      organizationName={organization?.name ?? null}
      events={composerEvents}
      initialNewsletterId={serverNewsletter?.id ?? null}
      initialComposerState={serverNewsletter?.composerState ?? null}
    />
  );
}
