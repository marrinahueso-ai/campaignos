import { SchoolSetupShellContent } from "@/components/settings-v2/SchoolSetupShellContent";
import {
  getPendingFoundingAccessCode,
  isFoundingAccessCodeRequired,
  validateFoundingAccessCode,
} from "@/lib/auth/founding-access";
import { getActiveMembership } from "@/lib/auth/membership-queries";
import { getAuthUser } from "@/lib/auth/queries";
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

/**
 * Get started under Settings is no longer a boarding wizard.
 * Members see Helpful next steps (or home); founding users go to Welcome.
 * Legacy deep-links redirect to focused surfaces without steppers.
 */
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

  if (accessCodeRequired && !hasValidPendingCode && !membership) {
    redirect("/login?intent=setup&error=code_required");
  }

  // Founding / no org — Welcome → first event → overlay (no school wizard).
  if (!membership) {
    redirect("/onboarding");
  }

  // Legacy wizard / step deep-links → focused pages (no boarding steppers).
  if (params.view === "wizard" || params.step === "school") {
    redirect("/settings/organization/edit");
  }
  if (params.step === "meta" || params.onboarding === "1" || params.connected === "1") {
    redirect("/settings/integrations");
  }
  if (params.step === "calendar") {
    redirect("/calendar/import");
  }
  if (params.step === "brand") {
    redirect("/onboarding/brand?standalone=1");
  }
  if (params.error) {
    redirect(
      `/settings/meta?error=${encodeURIComponent(params.error)}`,
    );
  }

  return <SchoolSetupShellContent />;
}
