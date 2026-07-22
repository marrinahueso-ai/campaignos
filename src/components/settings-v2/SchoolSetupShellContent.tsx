import { OnboardingChecklistCards } from "@/components/onboarding/OnboardingChecklistCards";
import { RestartOnboardingButton } from "@/components/onboarding/RestartOnboardingButton";
import { Button } from "@/components/ui/Button";
import { getOnboardingChecklistForCurrentOrg } from "@/lib/onboarding/actions";
import { checklistNeedsAttention } from "@/lib/onboarding/state";

export async function SchoolSetupShellContent() {
  const checklist = await getOnboardingChecklistForCurrentOrg();
  const items = checklist?.items ?? [];
  const hasOpenItems = checklistNeedsAttention(items);
  const openItems = items.filter((item) => !item.done);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col justify-center px-2 py-10 sm:py-16">
      <div className="rounded-2xl border border-cos-border bg-cos-card px-6 py-10 text-center shadow-sm sm:px-10 sm:py-12">
        <p className="text-sm font-medium text-cos-muted">Hey Ralli</p>
        <h1 className="font-display mt-3 text-3xl text-cos-text sm:text-4xl">
          {hasOpenItems ? "A few helpful next steps" : "Ready when you are"}
        </h1>
        <p className="mx-auto mt-3 max-w-md text-base leading-relaxed text-cos-muted">
          {hasOpenItems
            ? "Add another event anytime. The tips below are optional — do them whenever it feels right."
            : "Start a new event whenever you have something coming up. We’ll help with the rest as you go."}
        </p>

        <div className="mt-8 flex justify-center">
          <Button href="/events/create?onboarding=1" size="lg">
            Create an event
          </Button>
        </div>

        {hasOpenItems ? (
          <div className="mt-10 border-t border-cos-border pt-8 text-left">
            <OnboardingChecklistCards
              items={openItems}
              title="Nice to finish when you can"
              description="No rush — these just make Hey Ralli more useful for your school."
            />
          </div>
        ) : null}

        <div className="mt-8">
          <RestartOnboardingButton />
        </div>
      </div>
    </div>
  );
}
