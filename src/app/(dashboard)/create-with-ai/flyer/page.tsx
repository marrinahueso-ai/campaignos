import { FlyerComposerHost } from "@/components/create-with-ai/FlyerComposerHost";
import { getCurrentOrganization } from "@/lib/auth/organization-context";

export const metadata = {
  title: "Flyer · Create with AI",
  robots: {
    index: false,
    follow: false,
  },
};

type FlyerComposerPageProps = {
  searchParams: Promise<{
    view?: string;
    eventId?: string;
    event?: string;
    fresh?: string;
  }>;
};

export default async function FlyerComposerPage({
  searchParams,
}: FlyerComposerPageProps) {
  const params = await searchParams;
  const eventId = (params.eventId || params.event || "").trim() || null;
  const fresh = params.fresh === "1" || params.fresh === "true";
  const organization = await getCurrentOrganization();
  return (
    <FlyerComposerHost
      view={params.view ?? null}
      eventId={eventId}
      organizationId={organization?.id ?? null}
      fresh={fresh}
    />
  );
}
