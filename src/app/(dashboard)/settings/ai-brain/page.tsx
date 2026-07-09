import { AiBrainSettingsContent } from "@/components/settings-v2/AiBrainSettingsContent";
import { SettingsV2PageHeader } from "@/components/settings-v2/SettingsV2PageHeader";
import { Button } from "@/components/ui/Button";
import { SettingsV2Card } from "@/components/settings-v2/SettingsV2Card";
import { getOrganizationIntelligence } from "@/lib/organization-intelligence/queries";
import { getLatestOrganization } from "@/lib/organizations/queries";

export const metadata = {
  title: "AI Brain",
};

export default async function AiBrainSettingsPage() {
  const organization = await getLatestOrganization();

  if (!organization) {
    return (
      <div className="space-y-6">
        <SettingsV2PageHeader
          title="AI Brain"
          description="Teach Hey Ralli how your school communicates before connecting AI."
        />
        <SettingsV2Card title="School Setup Required">
          <p className="text-sm leading-relaxed text-cos-muted">
            Complete School Setup to create your organization profile, then return
            here to configure your AI Brain.
          </p>
          <Button className="mt-4" href="/settings/school-setup">
            Go to School Setup
          </Button>
        </SettingsV2Card>
      </div>
    );
  }

  const intelligence = await getOrganizationIntelligence(organization.id);

  return (
    <AiBrainSettingsContent
      organizationName={organization.name}
      intelligence={intelligence}
    />
  );
}
