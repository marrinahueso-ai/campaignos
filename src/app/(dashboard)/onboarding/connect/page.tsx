import { OnboardingConnectEase } from "@/components/onboarding/OnboardingConnectEase";
import { getActiveMembership } from "@/lib/auth/membership-queries";
import { getEventById } from "@/lib/events/queries";
import {
  getMetaConnectionForCurrentOrg,
  isInstagramPublishingConfigured,
  isMetaConnectionConfigured,
} from "@/lib/meta-publishing/connection";
import { getMetaOAuthErrorMessage } from "@/lib/meta-publishing/connection-utils";
import { getOrganizationOnboardingState } from "@/lib/onboarding/mutations";
import {
  hasCompletedFirstEvent,
  isBrandSettled,
  isCalendarSettled,
  isInviteSettled,
  isMetaSettled,
} from "@/lib/onboarding/state";
import { getSchoolProfile } from "@/lib/organizations/queries";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Team & Meta",
};

interface OnboardingConnectPageProps {
  searchParams: Promise<{
    connected?: string;
    error?: string;
  }>;
}

/**
 * First-time setup Ease page 3 — combined Team + Meta.
 * Mockup: `onboarding-setup-ease-mockup.html?view=connect`
 * Stay here until Go to event / Skip for now — do not auto-advance after section saves.
 */
export default async function OnboardingConnectPage({
  searchParams,
}: OnboardingConnectPageProps) {
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

  // Ease page 2 must come first when calendar/brand are still open.
  if (!isCalendarSettled(state) || !isBrandSettled(state)) {
    redirect("/onboarding/essentials");
  }

  const params = await searchParams;
  const [event, metaConnection] = await Promise.all([
    state.firstEventId ? getEventById(state.firstEventId) : Promise.resolve(null),
    getMetaConnectionForCurrentOrg(),
  ]);

  const metaConnected = isMetaConnectionConfigured(metaConnection);
  const oauthError =
    params.connected === "1"
      ? null
      : params.error
        ? getMetaOAuthErrorMessage(params.error)
        : null;

  return (
    <OnboardingConnectEase
      organizationName={profile.organization.name}
      eventTitle={event?.title ?? "your event"}
      inviteSettled={isInviteSettled(state)}
      inviteCompleted={Boolean(state.inviteCompletedAt)}
      metaSettled={isMetaSettled(state) || metaConnected}
      metaCompleted={Boolean(state.metaCompletedAt) || metaConnected}
      metaConnected={metaConnected}
      facebookPageName={metaConnection?.pageName ?? null}
      instagramConnected={isInstagramPublishingConfigured(metaConnection)}
      oauthError={oauthError}
    />
  );
}
