import { OrganizationWorkspaceShell } from "@/components/organization-workspace/OrganizationWorkspaceShell";
import { StudioPageHeader } from "@/components/layout/StudioPageHeader";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { GraduationCap } from "lucide-react";
import { getLatestOrganization } from "@/lib/organizations/queries";
import {
  buildFallbackOrganizationWorkspaceData,
  getOrganizationWorkspaceData,
} from "@/lib/organization-workspace/queries";

export const metadata = {
  title: "Organization Workspace",
};

export default async function OrganizationWorkspaceSettingsPage() {
  const organization = await getLatestOrganization();

  if (!organization) {
    return (
      <div className="studio-page space-y-10 pb-12">
        <StudioPageHeader
          backHref="/settings"
          title="Organization Workspace"
          eyebrow="Configure"
        />
        <EmptyState
          icon={GraduationCap}
          title="Set up your school first"
          description="Complete School Setup so Hey Ralli knows which organization to configure."
          action={{ label: "Go to School Setup", href: "/settings/school-setup" }}
          className="cos-card py-16"
        />
      </div>
    );
  }

  const workspace =
    (await getOrganizationWorkspaceData(organization.id)) ??
    buildFallbackOrganizationWorkspaceData();

  return (
    <div className="studio-page space-y-10 pb-12">
      <StudioPageHeader
        backHref="/settings"
        title="Organization Workspace"
        description="Upload your board roster, then add person names for each VP and committee chair. Committees nest under their VP in collapsible groups below."
        eyebrow="Configure"
      />

      <OrganizationWorkspaceShell workspace={workspace} />

      <section className="cos-card border-dashed">
        <h2 className="font-display text-xl text-cos-text">Coming later</h2>
        <p className="mt-2 text-sm leading-relaxed text-cos-muted">
          Assignments, approvals, notifications, and permissions will build on
          this foundation — not part of Engine 7.1.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="secondary" disabled>
            Assignments
          </Button>
          <Button variant="secondary" disabled>
            Approvals
          </Button>
          <Button variant="secondary" disabled>
            Notifications
          </Button>
        </div>
      </section>
    </div>
  );
}
