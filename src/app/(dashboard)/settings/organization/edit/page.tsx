import { OrganizationProfileForm } from "@/components/settings-v2/OrganizationProfileForm";
import { SettingsV2PageHeader } from "@/components/settings-v2/SettingsV2PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { GraduationCap } from "lucide-react";
import { getSchoolProfile } from "@/lib/organizations/queries";

export const metadata = {
  title: "Edit organization profile",
};

export default async function OrganizationProfileEditPage() {
  const schoolProfile = await getSchoolProfile();

  if (!schoolProfile?.organization) {
    return (
      <div className="space-y-6">
        <SettingsV2PageHeader
          title="Edit profile"
          description="Update your school details."
        />
        <EmptyState
          icon={GraduationCap}
          title="Create your workspace first"
          description="Start with your first event — takes about a minute."
          action={{ label: "Get started", href: "/onboarding" }}
          className="cos-card py-16"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SettingsV2PageHeader
        title="Tell us about your school"
        description="Update name, timezone, and school details. No setup wizard — just your profile."
      />
      <div className="rounded-2xl border border-cos-border bg-cos-card p-6 sm:p-8">
        <OrganizationProfileForm organization={schoolProfile.organization} />
      </div>
    </div>
  );
}
