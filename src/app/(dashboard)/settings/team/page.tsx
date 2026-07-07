import { TeamSettingsPanel } from "@/components/settings/TeamSettingsPanel";
import { StudioPageHeader } from "@/components/layout/StudioPageHeader";
import { canManageTeam } from "@/lib/auth/infer-campaign-role";
import { getCurrentCampaignRole } from "@/lib/auth/get-current-role";
import {
  countActiveOrganizationUsers,
  getActiveMembership,
  getOrganizationUsers,
} from "@/lib/auth/membership-queries";
import { getAuthUser } from "@/lib/auth/queries";
import { getOrganizationById } from "@/lib/organizations/queries";
import { getOrganizationWorkspaceData } from "@/lib/organization-workspace/queries";
import { resolveAuthSiteOrigin } from "@/lib/auth/invite-url";
import { isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { headers } from "next/headers";

export const metadata = {
  title: "Team",
};

export default async function TeamSettingsPage() {
  const [user, membership, campaignRole] = await Promise.all([
    getAuthUser(),
    getActiveMembership(),
    getCurrentCampaignRole(),
  ]);

  const organization = membership
    ? await getOrganizationById(membership.organizationId)
    : null;

  const workspace = organization
    ? await getOrganizationWorkspaceData(organization.id)
    : null;

  const members = organization
    ? await getOrganizationUsers(organization.id)
    : [];

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

  return (
    <div className="studio-page space-y-10 pb-12">
      <StudioPageHeader
        backHref="/settings"
        title="Team"
        description="Invite VPs and committee chairs to Hey Ralli. Each person signs in with their email and gets the access level you assign."
        eyebrow="Configure"
      />

      {!organization ? (
        <p className="text-sm leading-relaxed text-cos-muted">
          Complete School Setup first, then return here to invite your board.
        </p>
      ) : (
        <TeamSettingsPanel
          members={members}
          roles={workspace?.roles ?? []}
          canManage={canManageTeam(campaignRole) || showClaimBanner}
          showClaimBanner={showClaimBanner}
          currentUserEmail={user?.email ?? null}
          siteOrigin={siteOrigin}
          canProvisionAccounts={isSupabaseAdminConfigured()}
        />
      )}
    </div>
  );
}
