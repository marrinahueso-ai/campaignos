import { OnboardingChecklistCards } from "@/components/onboarding/OnboardingChecklistCards";
import { RestartOnboardingButton } from "@/components/onboarding/RestartOnboardingButton";
import { SettingsV2PageHeader } from "@/components/settings-v2/SettingsV2PageHeader";
import { Button } from "@/components/ui/Button";
import { getOnboardingChecklistForCurrentOrg } from "@/lib/onboarding/actions";

export async function SchoolSetupShellContent() {
  const checklist = await getOnboardingChecklistForCurrentOrg();
  const items = checklist?.items ?? [];

  return (
    <div className="space-y-8">
      <SettingsV2PageHeader
        title="Get started"
        description="Value first — create an event, then finish calendar, brand, and team when you’re ready."
        actions={
          <Button href="/events/create?onboarding=1" size="sm">
            Create an event
          </Button>
        }
      />

      {items.length > 0 ? (
        <OnboardingChecklistCards
          items={items}
          title="Your checklist"
          description="Skipped steps show up here until they’re done."
        />
      ) : (
        <p className="text-sm text-cos-muted">
          You’re all set. Open Organization settings anytime to edit profile
          details.
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <Button href="/settings/organization" variant="secondary" size="sm">
          Organization settings
        </Button>
        <Button href="/calendar/import" variant="secondary" size="sm">
          Calendar import
        </Button>
        <Button href="/settings/team-access" variant="secondary" size="sm">
          Team & Access
        </Button>
        <RestartOnboardingButton />
      </div>
    </div>
  );
}
