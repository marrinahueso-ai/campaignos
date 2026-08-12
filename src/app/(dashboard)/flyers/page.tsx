import { FlyerLibraryShell } from "@/components/flyers/FlyerLibraryShell";
import { hasPermission } from "@/lib/access-templates/effective-access";
import { getCurrentOrganization } from "@/lib/auth/organization-context";
import { getCampaignPageEvents } from "@/lib/events/campaign-page-queries";
import {
  parseFlyerLibraryFilter,
} from "@/lib/flyers/library-filters";
import { listFlyersForOrg } from "@/lib/flyers/queries";

export const metadata = {
  title: "Flyers",
  robots: {
    index: false,
    follow: false,
  },
};

interface FlyersPageProps {
  searchParams: Promise<{ filter?: string }>;
}

export default async function FlyersPage({ searchParams }: FlyersPageProps) {
  const { filter: filterParam } = await searchParams;
  const filter = parseFlyerLibraryFilter(filterParam);
  const organization = await getCurrentOrganization();

  if (!organization) {
    return (
      <div className="studio-page space-y-4">
        <p className="text-sm text-cos-muted">
          Sign in and set up your organization to view flyers.
        </p>
      </div>
    );
  }

  const [flyers, events, canEdit] = await Promise.all([
    listFlyersForOrg(organization.id),
    getCampaignPageEvents(organization.id),
    hasPermission("upload_artwork"),
  ]);

  return (
    <FlyerLibraryShell
      flyers={flyers}
      events={events.map((event) => ({
        id: event.id,
        title: event.title,
        date: event.date ?? null,
      }))}
      filter={filter}
      canEdit={canEdit}
    />
  );
}
