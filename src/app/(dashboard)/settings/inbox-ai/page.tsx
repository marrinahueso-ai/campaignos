import { InboxAiSettingsContent } from "@/components/settings-v2/InboxAiSettingsContent";
import { SettingsV2Card } from "@/components/settings-v2/SettingsV2Card";
import { SettingsV2PageHeader } from "@/components/settings-v2/SettingsV2PageHeader";
import { Button } from "@/components/ui/Button";
import { getInboxAiSourcesSettingsData } from "@/lib/organizations/inbox-ai-sources/actions";
import { getLatestOrganization } from "@/lib/organizations/queries";

export const metadata = {
  title: "Inbox AI",
};

export default async function InboxAiSettingsPage() {
  const settings = await getInboxAiSourcesSettingsData();

  if (!settings) {
    return (
      <div className="space-y-6">
        <SettingsV2PageHeader
          title="Inbox AI"
          description="Tell Hey Ralli which school pages and tools to use when drafting inbox replies."
        />
        <SettingsV2Card title="School Setup Required">
          <p className="text-sm leading-relaxed text-cos-muted">
            Complete School Setup to create your organization profile, then return
            here to configure inbox AI sources.
          </p>
          <Button className="mt-4" href="/settings/school-setup">
            Go to School Setup
          </Button>
        </SettingsV2Card>
      </div>
    );
  }

  const organization = await getLatestOrganization();
  const presetSources = [
    { label: "Events page", url: organization?.eventsUrl ?? null, type: "Website" },
    { label: "Calendar", url: organization?.calendarUrl ?? null, type: "Calendar" },
    { label: "Resources", url: organization?.resourcesUrl ?? null, type: "Website" },
    { label: "FAQ", url: organization?.faqUrl ?? null, type: "Document" },
    { label: "School website", url: organization?.schoolWebsite ?? null, type: "Website" },
    { label: "PTO website", url: organization?.ptoWebsite ?? null, type: "Website" },
  ];

  return (
    <InboxAiSettingsContent
      input={settings.input}
      presetSources={presetSources}
    />
  );
}
