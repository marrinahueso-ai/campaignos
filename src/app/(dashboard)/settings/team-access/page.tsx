import { TeamAccessSettingsContent } from "@/components/settings-v2/TeamAccessSettingsContent";
import { SettingsV2PageHeader } from "@/components/settings-v2/SettingsV2PageHeader";
import { canManageTeam } from "@/lib/auth/infer-campaign-role";
import { getCurrentCampaignRole } from "@/lib/auth/get-current-role";
import {
  countActiveOrganizationUsers,
  getActiveMembership,
  getOrganizationUsers,
} from "@/lib/auth/membership-queries";
import { getAuthUser } from "@/lib/auth/queries";
import { getOrganizationById } from "@/lib/organizations/queries";
import {
  buildFallbackOrganizationWorkspaceData,
  getOrganizationWorkspaceData,
} from "@/lib/organization-workspace/queries";
import { getTeamAccessWorkloadIndex } from "@/lib/organization-workspace/team-access-workload";
import { resolveAuthSiteOrigin } from "@/lib/auth/invite-url";
import { isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { headers } from "next/headers";

export const metadata = {
  title: "Team & Access",
};

export default async function TeamAccessSettingsPage() {
  const [user, membership, campaignRole] = await Promise.all([
    getAuthUser(),
    getActiveMembership(),
    getCurrentCampaignRole(),
  ]);

  const organization = membership
    ? await getOrganizationById(membership.organizationId)
    : null;

  const workspace = organization
    ? (await getOrganizationWorkspaceData(organization.id)) ??
      buildFallbackOrganizationWorkspaceData()
    : buildFallbackOrganizationWorkspaceData();

  const members = organization
    ? await getOrganizationUsers(organization.id)
    : [];

  const workload = organization
    ? await getTeamAccessWorkloadIndex(organization.id)
    : { byCommitteeId: {} };

  const activeCount = organization
    ? await countActiveOrganizationUsers(organization.id)
    : 0;

  const showClaimBanner = Boolean(
    user && !membership && organization && activeCount === 0,
  );

  const headersList = await headers();
  const siteOrigin = resolveAuthSiteOrigin(
    headersList.get("origin"),
    headersList.get("x-forwarded-host") ?? headersList.get("host"),
    headersList.get("x-forwarded-proto"),
  );

  if (!organization) {
    return (
      <div className="space-y-6">
        <SettingsV2PageHeader
          title="Team & Access"
          description="Manage members, roles, permissions, and committee responsibilities in one place."
        />
        <p className="text-sm leading-relaxed text-cos-muted">
          Complete School Setup first, then return here to invite your board.
        </p>
      </div>
    );
  }

  return (
    <TeamAccessSettingsContent
      members={members}
      workspace={workspace}
      workload={workload}
      canManage={canManageTeam(campaignRole) || showClaimBanner}
      showClaimBanner={showClaimBanner}
      currentUserEmail={user?.email ?? null}
      siteOrigin={siteOrigin}
      canProvisionAccounts={isSupabaseAdminConfigured()}
    />
  );
}
