import { AiBrainProfileForm } from "@/components/ai-brain/AiBrainProfileForm";
import { TrainingLibrarySection } from "@/components/ai-brain/TrainingLibrarySection";
import { StudioPageHeader } from "@/components/layout/StudioPageHeader";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { getOrganizationIntelligence } from "@/lib/organization-intelligence/queries";
import { getLatestOrganization } from "@/lib/organizations/queries";

export const metadata = {
  title: "AI Brain",
};

export default async function AiBrainSettingsPage() {
  const organization = await getLatestOrganization();

  if (!organization) {
    return (
      <div className="studio-page mx-auto max-w-3xl space-y-10 pb-12">
        <StudioPageHeader
          backHref="/settings"
          title="AI Brain"
          description="Teach Hey Ralli how your school communicates before connecting AI."
          eyebrow="Configure"
        />

        <Card>
          <CardHeader>
            <CardTitle>School Setup Required</CardTitle>
            <CardDescription>
              Complete School Setup to create your organization profile, then
              return here to configure your AI Brain.
            </CardDescription>
          </CardHeader>
          <Button href="/settings/school-setup">Go to School Setup</Button>
        </Card>
      </div>
    );
  }

  const intelligence = await getOrganizationIntelligence(organization.id);

  return (
    <div className="studio-page mx-auto max-w-3xl space-y-10 pb-12">
      <StudioPageHeader
        backHref="/settings"
        title="AI Brain"
        description={`Configure how ${organization.name} communicates. Hey Ralli uses this profile when generating drafts.`}
        eyebrow="Configure"
      />

      <AiBrainProfileForm profile={intelligence.profile} />
      <TrainingLibrarySection documents={intelligence.trainingDocuments} />
    </div>
  );
}
