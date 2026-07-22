import { BoardRosterHashRedirect } from "@/components/settings-v2/BoardRosterHashRedirect";
import { OrganizationSettingsContent } from "@/components/settings-v2/OrganizationSettingsContent";
import { SettingsV2PageHeader } from "@/components/settings-v2/SettingsV2PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { GraduationCap } from "lucide-react";
import { getSchoolProfile } from "@/lib/organizations/queries";

export const metadata = {
  title: "Organization",
};

export default async function OrganizationSettingsPage() {
  const schoolProfile = await getSchoolProfile();

  if (!schoolProfile?.organization) {
    return (
      <div className="space-y-6">
        <SettingsV2PageHeader
          title="Organization"
          description="Set up your school profile, branding, and workspace preferences."
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
    <>
      <BoardRosterHashRedirect />
      <OrganizationSettingsContent
        organization={schoolProfile.organization}
        brandAssets={schoolProfile.brandAssets}
      />
    </>
  );
}
