import { TeamAccessSettingsContent } from "@/components/settings-v2/TeamAccessSettingsContent";
import { SettingsV2PageHeader } from "@/components/settings-v2/SettingsV2PageHeader";
import { canManageTeam } from "@/lib/auth/infer-campaign-role";
import { getCurrentCampaignRole } from "@/lib/auth/get-current-role";
import {
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
import { getCampaignPageEvents } from "@/lib/events/campaign-page-queries";
import { headers } from "next/headers";

export const metadata = {
  title: "People & Responsibilities",
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

  if (!organization) {
    return (
      <div className="space-y-6">
        <SettingsV2PageHeader
          title="People & Responsibilities"
          description="Manage people and assign responsibilities to events. Hey Ralli automatically manages permissions."
        />
        <p className="text-sm leading-relaxed text-cos-muted">
          Complete School Setup first, then return here to invite your board.
        </p>
      </div>
    );
  }

  const [workspaceResult, members, workload, events, headersList] =
    await Promise.all([
      getOrganizationWorkspaceData(organization.id),
      getOrganizationUsers(organization.id),
      getTeamAccessWorkloadIndex(organization.id),
      getCampaignPageEvents(organization.id),
      headers(),
    ]);

  const workspace =
    workspaceResult ?? buildFallbackOrganizationWorkspaceData();

  // Claim banner only applies when there is no membership; this branch requires one.
  const showClaimBanner = false;

  const siteOrigin = resolveAuthSiteOrigin(
    headersList.get("origin"),
    headersList.get("x-forwarded-host") ?? headersList.get("host"),
    headersList.get("x-forwarded-proto"),
  );

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
      events={events.map((event) => ({
        id: event.id,
        title: event.title,
        date: event.date,
        status: event.status,
      }))}
    />
  );
}
