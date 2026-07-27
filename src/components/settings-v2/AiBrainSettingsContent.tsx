import { AiBrainProfileForm } from "@/components/ai-brain/AiBrainProfileForm";
import { TrainingLibrarySection } from "@/components/ai-brain/TrainingLibrarySection";
import {
  SettingsEaseSectionChrome,
  settingsEaseSoftCardClassName,
} from "@/components/settings-v2/SettingsEaseSectionChrome";
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
    <SettingsEaseSectionChrome
      data-settings-ease="ai-brain"
      title="AI Brain"
      description={`Configure how ${organizationName} communicates. Hey Ralli uses this profile when generating drafts.`}
      backHref="/settings/branding?section=ai-brain"
    >
      <div className="space-y-3.5">
        <div className={settingsEaseSoftCardClassName}>
          <h3
            className="m-0 text-xl font-semibold tracking-[-0.01em] text-[#2a2622]"
            style={{ fontFamily: "var(--font-fraunces), Georgia, serif" }}
          >
            How AI Brain works
          </h3>
          <p className="mt-1 mb-0 text-[13px] leading-snug text-[#5c554c]">
            Hey Ralli uses your organization voice, writing style, and training
            documents to draft captions, emails, and inbox replies in your
            school&apos;s tone. Changes here affect campaign drafts, inbox AI
            replies, and creative studio suggestions — not your connected
            integrations.
          </p>
        </div>

        <div className="grid gap-3.5 lg:grid-cols-2">
          <div className={settingsEaseSoftCardClassName}>
            <h3
              className="m-0 text-xl font-semibold tracking-[-0.01em] text-[#2a2622]"
              style={{ fontFamily: "var(--font-fraunces), Georgia, serif" }}
            >
              Organization Voice
            </h3>
            <p className="mt-2 mb-0 text-sm leading-relaxed text-[#5c554c]">
              {profile?.organizationVoice ??
                "Describe how your PTO sounds — warm, inclusive, and parent-friendly."}
            </p>
          </div>
          <div className={settingsEaseSoftCardClassName}>
            <h3
              className="m-0 text-xl font-semibold tracking-[-0.01em] text-[#2a2622]"
              style={{ fontFamily: "var(--font-fraunces), Georgia, serif" }}
            >
              Writing Style
            </h3>
            <p className="mt-2 mb-0 text-sm font-semibold text-[#2a2622]">
              {writingStyleLabel(profile?.writingStyle ?? null)}
            </p>
          </div>
          <div className={settingsEaseSoftCardClassName}>
            <h3
              className="m-0 text-xl font-semibold tracking-[-0.01em] text-[#2a2622]"
              style={{ fontFamily: "var(--font-fraunces), Georgia, serif" }}
            >
              Content Preferences
            </h3>
            <p className="mt-2 mb-0 text-sm leading-relaxed text-[#5c554c]">
              {profile?.communicationPreferences ??
                "Volunteer opportunities, school events, fundraising updates."}
            </p>
          </div>
          <div className={settingsEaseSoftCardClassName}>
            <h3
              className="m-0 text-xl font-semibold tracking-[-0.01em] text-[#2a2622]"
              style={{ fontFamily: "var(--font-fraunces), Georgia, serif" }}
            >
              Smart Suggestions
            </h3>
            <p className="mt-2 mb-0 text-sm leading-relaxed text-[#5c554c]">
              Allow AI to suggest tasks, captions, and content ideas based on your
              playbooks and calendar.
            </p>
          </div>
        </div>

        <AiBrainProfileForm profile={intelligence.profile} />
        <TrainingLibrarySection documents={intelligence.trainingDocuments} />
      </div>
    </SettingsEaseSectionChrome>
  );
}
