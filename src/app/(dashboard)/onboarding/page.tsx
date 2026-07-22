import { OnboardingWelcome } from "@/components/onboarding/OnboardingWelcome";
import { getActiveMembership } from "@/lib/auth/membership-queries";
import { hasCompletedFirstEvent } from "@/lib/onboarding/state";
import { getOrganizationOnboardingState } from "@/lib/onboarding/mutations";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Welcome — Get started",
};

interface OnboardingPageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function OnboardingPage({
  searchParams,
}: OnboardingPageProps) {
  const params = await searchParams;
  const membership = await getActiveMembership();

  if (membership) {
    const state = await getOrganizationOnboardingState(
      membership.organizationId,
    );
    if (hasCompletedFirstEvent(state)) {
      redirect("/dashboard");
    }
    redirect("/events/create?onboarding=1");
  }

  return (
    <OnboardingWelcome
      errorMessage={params.error ?? null}
      defaultTimezone="America/Chicago"
    />
  );
}
