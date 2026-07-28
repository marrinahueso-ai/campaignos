import { WebsitePagesLanding } from "@/components/create-with-ai/WebsitePagesLanding";
import { getLatestOrganization } from "@/lib/organizations/queries";

export const metadata = {
  title: "Website pages",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function WebsitePagesPage() {
  const organization = await getLatestOrganization();

  return (
    <WebsitePagesLanding organizationName={organization?.name ?? null} />
  );
}
