import { Suspense } from "react";
import { SchoolSetupShellContent } from "@/components/settings-v2/SchoolSetupShellContent";
import {
  getPendingFoundingAccessCode,
  isFoundingAccessCodeRequired,
  validateFoundingAccessCode,
} from "@/lib/auth/founding-access";
import { getActiveMembership } from "@/lib/auth/membership-queries";
import { getAuthUser } from "@/lib/auth/queries";
import { getMetaOAuthErrorMessage } from "@/lib/meta-publishing/connection-utils";
import { getMetaConnectionForCurrentOrg } from "@/lib/meta-publishing/connection";
import { isMetaIntegrationConfigured } from "@/lib/meta-publishing/config.server";
import { getOrganizationWorkspaceData } from "@/lib/organization-workspace/queries";
import { SchoolSetupWizard } from "@/components/school-setup/SchoolSetupWizard";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Get started",
};

interface SettingsSchoolSetupPageProps {
  searchParams: Promise<{
    step?: string;
    connected?: string;
    error?: string;
    onboarding?: string;
    view?: string;
  }>;
}

function isPostSetupContinuation(params: {
  step?: string;
  connected?: string;
  error?: string;
  onboarding?: string;
}): boolean {
  return (
    params.onboarding === "1" ||
    params.step === "meta" ||
    params.connected === "1" ||
    Boolean(params.error)
  );
}

export default async function SettingsSchoolSetupPage({
  searchParams,
}: SettingsSchoolSetupPageProps) {
  const user = await getAuthUser();
  if (!user) {
    redirect("/login?intent=setup");
  }

  const membership = await getActiveMembership();
  const pendingCode = await getPendingFoundingAccessCode();
  const hasValidPendingCode =
    Boolean(pendingCode) && validateFoundingAccessCode(pendingCode);
  const accessCodeRequired = isFoundingAccessCodeRequired();
  const params = await searchParams;
  const showWizard =
    isPostSetupContinuation(params) || params.view === "wizard";

  if (accessCodeRequired && !hasValidPendingCode && !membership) {
    redirect("/login?intent=setup&error=code_required");
  }

  if (!membership && !showWizard) {
    redirect("/onboarding");
  }

  if (membership && !hasValidPendingCode && !showWizard) {
    return <SchoolSetupShellContent />;
  }

  const [metaConnection, workspace] = membership
    ? await Promise.all([
        getMetaConnectionForCurrentOrg(),
        getOrganizationWorkspaceData(membership.organizationId),
      ])
    : [null, null];

  const metaOauthError =
    params.connected === "1"
      ? null
      : params.error
        ? getMetaOAuthErrorMessage(params.error)
        : null;

  return (
    <Suspense fallback={null}>
      <SchoolSetupWizard
        validatedAccessCode={pendingCode}
        resumePostSetup={isPostSetupContinuation(params) && Boolean(membership)}
        metaConnection={metaConnection}
        metaConfiguredViaEnv={metaConnection?.id === "env"}
        metaIntegrationConfigured={isMetaIntegrationConfigured()}
        metaOauthError={metaOauthError}
        organizationRoles={workspace?.roles ?? []}
      />
    </Suspense>
  );
}
