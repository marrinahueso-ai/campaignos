import { AiBrainProfileForm } from "@/components/ai-brain/AiBrainProfileForm";
import { TrainingLibrarySection } from "@/components/ai-brain/TrainingLibrarySection";
import { SettingsV2Card } from "@/components/settings-v2/SettingsV2Card";
import { SettingsV2PageHeader } from "@/components/settings-v2/SettingsV2PageHeader";
import { WRITING_STYLES } from "@/lib/organization-intelligence/constants";
import type { OrganizationIntelligenceData } from "@/types/organization-intelligence";

interface AiBrainSettingsContentProps {
  organizationName: string;
  intelligence: OrganizationIntelligenceData;
}

function writingStyleLabel(value: string | null): string {
  if (!value) {
    return "Not set";
  }
  return WRITING_STYLES.find((style) => style.value === value)?.label ?? value;
}

export function AiBrainSettingsContent({
  organizationName,
  intelligence,
}: AiBrainSettingsContentProps) {
  const profile = intelligence.profile;

  return (
    <div className="space-y-6">
      <SettingsV2PageHeader
        title="AI Brain"
        description={`Configure how ${organizationName} communicates. Hey Ralli uses this profile when generating drafts.`}
      />

      <SettingsV2Card
        title="How AI Brain works"
        description="Hey Ralli uses your organization voice, writing style, and training documents to draft captions, emails, and inbox replies in your school's tone."
      >
        <p className="text-sm leading-relaxed text-cos-muted">
          Changes here affect campaign drafts, inbox AI replies, and creative
          studio suggestions — not your connected integrations.
        </p>
      </SettingsV2Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <SettingsV2Card title="Organization Voice">
          <p className="text-sm leading-relaxed text-cos-muted">
            {profile?.organizationVoice ??
              "Describe how your PTO sounds — warm, inclusive, and parent-friendly."}
          </p>
        </SettingsV2Card>

        <SettingsV2Card title="Writing Style">
          <p className="text-sm text-cos-text">
            {writingStyleLabel(profile?.writingStyle ?? null)}
          </p>
        </SettingsV2Card>

        <SettingsV2Card title="Content Preferences">
          <p className="text-sm leading-relaxed text-cos-muted">
            {profile?.communicationPreferences ??
              "Volunteer opportunities, school events, fundraising updates."}
          </p>
        </SettingsV2Card>

        <SettingsV2Card title="Smart Suggestions">
          <p className="text-sm text-cos-muted">
            Allow AI to suggest tasks, captions, and content ideas based on your
            playbooks and calendar.
          </p>
        </SettingsV2Card>
      </div>

      <AiBrainProfileForm profile={intelligence.profile} />
      <TrainingLibrarySection documents={intelligence.trainingDocuments} />
    </div>
  );
}
