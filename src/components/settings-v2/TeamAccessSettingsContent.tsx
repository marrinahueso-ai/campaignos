import { TeamAccessShell } from "@/components/settings-v2/team-access/TeamAccessShell";
import type { TeamAccessWorkloadIndex } from "@/lib/organization-workspace/team-access-workload";
import type { OrganizationUser } from "@/types/auth";
import type { OrganizationWorkspaceData } from "@/types/organization-workspace";

interface TeamAccessSettingsContentProps {
  members: OrganizationUser[];
  workspace: OrganizationWorkspaceData;
  workload: TeamAccessWorkloadIndex;
  canManage: boolean;
  showClaimBanner: boolean;
  currentUserEmail: string | null;
  siteOrigin: string;
  canProvisionAccounts: boolean;
}

export function TeamAccessSettingsContent({
  members,
  workspace,
  workload,
  canManage,
  showClaimBanner,
  currentUserEmail,
  siteOrigin,
  canProvisionAccounts,
}: TeamAccessSettingsContentProps) {
  return (
    <TeamAccessShell
      members={members}
      workspace={workspace}
      workload={workload}
      canManage={canManage}
      showClaimBanner={showClaimBanner}
      currentUserEmail={currentUserEmail}
      siteOrigin={siteOrigin}
      canProvisionAccounts={canProvisionAccounts}
    />
  );
}
