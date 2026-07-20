import { AdvancedSettingsContent } from "@/components/settings-v2/AdvancedSettingsContent";
import { getCurrentOrganization } from "@/lib/auth/organization-context";
import { getCampaignPageEvents } from "@/lib/events/campaign-page-queries";

export const metadata = {
  title: "Advanced",
};

export default async function AdvancedSettingsPage() {
  const organization = await getCurrentOrganization();
  const events = organization
    ? await getCampaignPageEvents(organization.id)
    : [];

  return (
    <AdvancedSettingsContent
      organizationId={organization?.id ?? ""}
      campaigns={events.map((event) => ({
        id: event.id,
        title: event.title,
      }))}
    />
  );
}
