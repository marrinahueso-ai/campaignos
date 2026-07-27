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

  // Org bootstrap glue only — mockup page 1 is Create your first event.
  if (!membership) {
    return (
      <OnboardingWelcome
        errorMessage={params.error ?? null}
        defaultTimezone="America/Chicago"
      />
    );
  }

  // Replay / restart with an existing org → event screen (not a Welcome step).
  if (forceWelcome) {
    redirect("/events/create?onboarding=1");
  }

  const state = await getOrganizationOnboardingState(membership.organizationId);

  if (!hasCompletedFirstEvent(state)) {
    redirect("/events/create?onboarding=1");
  }

  const next = nextOnboardingPrompt(state);
  // Ease page 2 — Calendar + Brand combined.
  if (next === "calendar" || next === "brand") {
    redirect("/onboarding/essentials");
  }
  // Ease page 3 — Team + Meta combined.
  if (next === "invite" || next === "meta") {
    redirect("/onboarding/connect");
  }

  // Finished prompts — Helpful next steps live on home.
  redirect("/dashboard");
}
