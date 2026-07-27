import { OnboardingEssentialsEase } from "@/components/onboarding/OnboardingEssentialsEase";
import { getActiveMembership } from "@/lib/auth/membership-queries";
import { getEventById } from "@/lib/events/queries";
import {
  getGoogleCalendarConnectionForCurrentOrg,
  isGoogleCalendarConnectionConfigured,
} from "@/lib/google-calendar/connection";
import { getOrganizationOnboardingState } from "@/lib/onboarding/mutations";
import {
  hasCompletedFirstEvent,
  isBrandSettled,
  isCalendarSettled,
} from "@/lib/onboarding/state";
import { getSchoolProfile } from "@/lib/organizations/queries";
import { resolveAssetImageUrl } from "@/lib/event-workspace/storage";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Calendar & brand",
};

/**
 * First-time setup Ease page 2 — combined Calendar + Brand.
 * Mockup: `onboarding-setup-ease-mockup.html?view=essentials`
 * Stay here until Continue / Skip for now — do not auto-advance after section saves.
 */
export default async function OnboardingEssentialsPage() {
  const membership = await getActiveMembership();
  if (!membership) {
    redirect("/onboarding");
  }

  const profile = await getSchoolProfile();
  if (!profile?.organization) {
    redirect("/onboarding");
  }

  const state = await getOrganizationOnboardingState(membership.organizationId);

  if (!hasCompletedFirstEvent(state)) {
    redirect("/events/create?onboarding=1");
  }

  const event = state.firstEventId
    ? await getEventById(state.firstEventId)
    : null;
  const googleConnection = await getGoogleCalendarConnectionForCurrentOrg();

  return (
    <OnboardingEssentialsEase
      organizationName={profile.organization.name}
      eventTitle={event?.title ?? "your event"}
      initialPrimary={profile.brandAssets?.primaryColor ?? "#2f4a3c"}
      initialSecondary={profile.brandAssets?.secondaryColor ?? "#c4922e"}
      initialMascot={profile.organization.mascot ?? ""}
      initialPtoLogo={
        resolveAssetImageUrl(profile.brandAssets?.ptoLogo ?? null) ??
        profile.brandAssets?.ptoLogo ??
        null
      }
      initialSchoolLogo={
        resolveAssetImageUrl(profile.brandAssets?.schoolLogo ?? null) ??
        profile.brandAssets?.schoolLogo ??
        null
      }
      calendarSettled={isCalendarSettled(state)}
      calendarCompleted={Boolean(state.calendarCompletedAt)}
      brandSettled={isBrandSettled(state)}
      brandCompleted={Boolean(state.brandCompletedAt)}
      googleConnected={isGoogleCalendarConnectionConfigured(googleConnection)}
    />
  );
}
