import Link from "next/link";
import {
  getPendingFoundingAccessCode,
  isFoundingAccessCodeRequired,
  validateFoundingAccessCode,
} from "@/lib/auth/founding-access";
import { getActiveMembership } from "@/lib/auth/membership-queries";
import { getAuthUser } from "@/lib/auth/queries";
import { createClient } from "@/lib/supabase/server";
import { SchoolSetupWizard } from "@/components/school-setup/SchoolSetupWizard";
import { redirect } from "next/navigation";

export const metadata = {
  title: "School Setup",
};

export default async function SettingsSchoolSetupPage() {
  const user = await getAuthUser();
  if (!user) {
    redirect("/login?intent=setup");
  }

  const membership = await getActiveMembership();
  const pendingCode = await getPendingFoundingAccessCode();
  const hasValidPendingCode =
    Boolean(pendingCode) && validateFoundingAccessCode(pendingCode);
  const accessCodeRequired = isFoundingAccessCodeRequired();

  if (membership && !hasValidPendingCode) {
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

  if (accessCodeRequired && !hasValidPendingCode) {
    redirect("/login?intent=setup&error=code_required");
  }

  return (
    <div className="studio-page pb-12">
      <SchoolSetupWizard validatedAccessCode={pendingCode} />
    </div>
  );
}
