import { InboxAiSourcesPanel } from "@/components/settings/InboxAiSourcesPanel";
import { StudioPageHeader } from "@/components/layout/StudioPageHeader";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { getInboxAiSourcesSettingsData } from "@/lib/organizations/inbox-ai-sources/actions";

export const metadata = {
  title: "Inbox AI Sources",
};

export default async function InboxAiSourcesSettingsPage() {
  const settings = await getInboxAiSourcesSettingsData();

  if (!settings) {
    return (
      <div className="studio-page mx-auto max-w-3xl space-y-10 pb-12">
        <StudioPageHeader
          backHref="/settings"
          title="Inbox AI Sources"
          description="Tell CampaignOS which school pages to check before drafting inbox replies."
          eyebrow="Configure"
        />

        <Card>
          <CardHeader>
            <CardTitle>School Setup Required</CardTitle>
            <CardDescription>
              Complete School Setup to create your organization profile, then return here
              to configure inbox AI sources.
            </CardDescription>
          </CardHeader>
          <Button href="/settings/school-setup">Go to School Setup</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="studio-page mx-auto max-w-3xl space-y-10 pb-12">
      <StudioPageHeader
        backHref="/settings"
        title="Inbox AI Sources"
        description="CampaignOS checks these pages in order before drafting inbox replies. Only verified facts from these sources are used — never invented details."
        eyebrow="Configure"
      />

      <InboxAiSourcesPanel initialInput={settings.input} />
    </div>
  );
}
