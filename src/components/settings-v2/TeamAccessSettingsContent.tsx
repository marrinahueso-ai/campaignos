import { SettingsEaseTeamAccess } from "@/components/settings-v2/SettingsEaseTeamAccess";
import type { AccessTemplate } from "@/lib/access-templates/types";
import type { TeamAccessWorkloadIndex } from "@/lib/organization-workspace/team-access-workload";
import type { OrganizationUser } from "@/types/auth";
import type { OrganizationWorkspaceData } from "@/types/organization-workspace";

interface TeamAccessSettingsContentProps {
  members: OrganizationUser[];
  workspace: OrganizationWorkspaceData;
  workload: TeamAccessWorkloadIndex;
  /** Auth last_sign_in_at by auth user id (org-scoped server lookup). */
  lastSignInAtByUserId?: Record<string, string | null>;
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
  seatLimit: number | null;
  planLabel: string;
}

export function TeamAccessSettingsContent({
  members,
  workspace,
  workload,
  lastSignInAtByUserId,
  canManage,
  canEditAccessTemplates,
  accessTemplates,
  showClaimBanner,
  currentUserEmail,
  canProvisionAccounts,
  events,
  seatLimit,
  planLabel,
}: TeamAccessSettingsContentProps) {
  return (
    <SettingsEaseTeamAccess
      members={members}
      workspace={workspace}
      workload={workload}
      lastSignInAtByUserId={lastSignInAtByUserId}
      canManage={canManage}
      canEditAccessTemplates={canEditAccessTemplates}
      accessTemplates={accessTemplates}
      showClaimBanner={showClaimBanner}
      currentUserEmail={currentUserEmail}
      canProvisionAccounts={canProvisionAccounts}
      events={events}
      seatLimit={seatLimit}
      planLabel={planLabel}
    />
  );
}
