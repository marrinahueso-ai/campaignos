import { OnboardingMetaForm } from "@/components/onboarding/OnboardingMetaForm";
import { getOrganizationOnboardingState } from "@/lib/onboarding/mutations";
import { getMetaOAuthErrorMessage } from "@/lib/meta-publishing/connection-utils";
import { getMetaConnectionForCurrentOrg } from "@/lib/meta-publishing/connection";
import { isMetaIntegrationConfigured } from "@/lib/meta-publishing/config.server";
import { getSchoolProfile } from "@/lib/organizations/queries";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Connect Meta",
};

interface OnboardingMetaPageProps {
  searchParams: Promise<{
    connected?: string;
    error?: string;
  }>;
}

export default async function OnboardingMetaPage({
  searchParams,
}: OnboardingMetaPageProps) {
  const profile = await getSchoolProfile();
  if (!profile?.organization) {
    redirect("/onboarding");
  }

  const params = await searchParams;
  const [metaConnection, onboardingState] = await Promise.all([
    getMetaConnectionForCurrentOrg(),
    getOrganizationOnboardingState(profile.organization.id),
  ]);
  const metaOauthError =
    params.connected === "1"
      ? null
      : params.error
        ? getMetaOAuthErrorMessage(params.error)
        : null;

  return (
    <OnboardingMetaForm
      connection={metaConnection}
      configuredViaEnv={metaConnection?.id === "env"}
      integrationConfigured={isMetaIntegrationConfigured()}
      oauthError={metaOauthError}
      firstEventId={onboardingState.firstEventId ?? null}
    />
  );
}
