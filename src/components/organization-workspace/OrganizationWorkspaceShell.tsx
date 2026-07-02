import { OrganizationRosterImportBar } from "@/components/organization-workspace/OrganizationRosterImportBar";
import { OrganizationRosterSection } from "@/components/organization-workspace/OrganizationRosterSection";
import { ResponsibilityMatrixSection } from "@/components/organization-workspace/ResponsibilityMatrixSection";
import type { OrganizationWorkspaceData } from "@/types/organization-workspace";

interface OrganizationWorkspaceShellProps {
  workspace: OrganizationWorkspaceData;
  /** Onboarding steps 3–5 can hide settings-specific intro copy. */
  showIntro?: boolean;
}

/**
 * Reusable layout for Organization Workspace sections.
 * Used in Settings today; plugs into onboarding Steps 3–5 later.
 */
export function OrganizationWorkspaceShell({
  workspace,
  showIntro = true,
}: OrganizationWorkspaceShellProps) {
  return (
    <div className="space-y-8">
      <OrganizationRosterImportBar
        roleCount={workspace.roles.length}
        committeeCount={workspace.committees.length}
      />

      <OrganizationRosterSection
        roles={workspace.roles}
        committees={workspace.committees}
        showIntro={showIntro}
      />

      <ResponsibilityMatrixSection
        entries={workspace.responsibilityMatrix}
        roles={workspace.roles}
        showIntro={showIntro}
      />
    </div>
  );
}
