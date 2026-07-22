import { OnboardingWelcome } from "@/components/onboarding/OnboardingWelcome";
import { getActiveMembership } from "@/lib/auth/membership-queries";
import {
  hasCompletedFirstEvent,
  nextOnboardingPrompt,
} from "@/lib/onboarding/state";
import { getOrganizationOnboardingState } from "@/lib/onboarding/mutations";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Welcome — Get started",
};

interface OnboardingPageProps {
  searchParams: Promise<{ error?: string; welcome?: string }>;
}

export default async function OnboardingPage({
  searchParams,
}: OnboardingPageProps) {
  const params = await searchParams;
  const membership = await getActiveMembership();
  const forceWelcome = params.welcome === "1";

  // Explicit welcome (replay / demo) — do not bounce to dashboard.
  if (!membership || forceWelcome) {
    return (
      <OnboardingWelcome
        errorMessage={params.error ?? null}
        defaultTimezone="America/Chicago"
      />
    );
  }

  const state = await getOrganizationOnboardingState(membership.organizationId);

  if (!hasCompletedFirstEvent(state)) {
    redirect("/events/create?onboarding=1");
  }

  const next = nextOnboardingPrompt(state);
  if (next === "calendar" && state.firstEventId) {
    redirect(`/events/${state.firstEventId}?onboarding=calendar`);
  }
  if (next === "brand") {
    redirect("/onboarding/brand");
  }
  if (next === "invite") {
    redirect("/onboarding/invite");
  }

  // Finished prompts — checklist lives under Get started (not Today/home).
  redirect("/settings/school-setup");
}
