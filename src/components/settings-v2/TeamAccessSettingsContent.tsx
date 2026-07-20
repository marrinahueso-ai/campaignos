import { TeamAccessShell } from "@/components/settings-v2/team-access/TeamAccessShell";
import type { AccessTemplate } from "@/lib/access-templates/types";
import type { TeamAccessWorkloadIndex } from "@/lib/organization-workspace/team-access-workload";
import type { OrganizationUser } from "@/types/auth";
import type { OrganizationWorkspaceData } from "@/types/organization-workspace";

interface TeamAccessSettingsContentProps {
  members: OrganizationUser[];
  workspace: OrganizationWorkspaceData;
  workload: TeamAccessWorkloadIndex;
  canManage: boolean;
  canEditAccessTemplates: boolean;
  accessTemplates: AccessTemplate[];
  showClaimBanner: boolean;
  currentUserEmail: string | null;
  siteOrigin: string;
  canProvisionAccounts: boolean;
  events: Array<{
    id: string;
    title: string;
    date?: string | null;
    status?: string | null;
  }>;
}

export function TeamAccessSettingsContent({
  members,
  workspace,
  workload,
  canManage,
  canEditAccessTemplates,
  accessTemplates,
  showClaimBanner,
  currentUserEmail,
  siteOrigin,
  canProvisionAccounts,
  events,
}: TeamAccessSettingsContentProps) {
  return (
    <TeamAccessShell
      members={members}
      workspace={workspace}
      workload={workload}
      canManage={canManage}
      canEditAccessTemplates={canEditAccessTemplates}
      accessTemplates={accessTemplates}
      showClaimBanner={showClaimBanner}
      currentUserEmail={currentUserEmail}
      siteOrigin={siteOrigin}
      canProvisionAccounts={canProvisionAccounts}
      events={events}
    />
  );
}
