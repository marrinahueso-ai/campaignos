import Link from "next/link";
import { Suspense } from "react";
import {
  getPendingFoundingAccessCode,
  isFoundingAccessCodeRequired,
  validateFoundingAccessCode,
} from "@/lib/auth/founding-access";
import { getActiveMembership } from "@/lib/auth/membership-queries";
import { getAuthUser } from "@/lib/auth/queries";
import { getMetaOAuthErrorMessage } from "@/lib/meta-publishing/connection-utils";
import {
  getMetaConnectionForCurrentOrg,
} from "@/lib/meta-publishing/connection";
import { isMetaIntegrationConfigured } from "@/lib/meta-publishing/config.server";
import { getOrganizationWorkspaceData } from "@/lib/organization-workspace/queries";
import { createClient } from "@/lib/supabase/server";
import { SchoolSetupWizard } from "@/components/school-setup/SchoolSetupWizard";
import { redirect } from "next/navigation";

export const metadata = {
  title: "School Setup",
};

interface SettingsSchoolSetupPageProps {
  searchParams: Promise<{
    step?: string;
    connected?: string;
    error?: string;
    onboarding?: string;
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

  if (membership && !hasValidPendingCode && !isPostSetupContinuation(params)) {
    const supabase = await createClient();
    const { data: organization } = await supabase
      .from("organizations")
      .select("name")
      .eq("id", membership.organizationId)
      .maybeSingle();

    return (
      <div className="studio-page pb-12">
        <div className="mx-auto max-w-lg space-y-4 border border-cos-border bg-cos-card px-8 py-10 text-center">
          <h1 className="font-display text-2xl text-cos-text">
            You already have a workspace
          </h1>
          <p className="text-sm leading-relaxed text-cos-muted">
            {organization?.name
              ? `This account belongs to ${organization.name}.`
              : "This account already belongs to a school workspace."}{" "}
            Sign in to continue, or use an invite link to join another team.
          </p>
          <Link
            href="/dashboard"
            className="inline-block text-sm font-medium text-cos-accent underline-offset-2 hover:underline"
          >
            Go to your workspace
          </Link>
        </div>
      </div>
    );
  }

  if (accessCodeRequired && !hasValidPendingCode && !membership) {
    redirect("/login?intent=setup&error=code_required");
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
    <div className="studio-page pb-12">
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
    </div>
  );
}
