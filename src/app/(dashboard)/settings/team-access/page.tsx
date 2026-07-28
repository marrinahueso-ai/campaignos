import { TeamAccessSettingsContent } from "@/components/settings-v2/TeamAccessSettingsContent";
import { getOrganizationAccessTemplates } from "@/lib/access-templates/queries";
import {
  accessHasPermission,
  getEffectiveAccess,
} from "@/lib/access-templates/effective-access";
import { getOrganizationMemberLastSignIns } from "@/lib/auth/last-sign-in";
import { getOrganizationUsers } from "@/lib/auth/membership-queries";
import { getCurrentOrganization } from "@/lib/auth/organization-context";
import { getAuthUser } from "@/lib/auth/queries";
import {
  getOrgBillingSnapshot,
  orgCapacityLimit,
} from "@/lib/billing/org-billing";
import { getSettingsBillingContext } from "@/lib/billing/settings-billing";
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
  title: "Team & Access",
};

export default async function TeamAccessSettingsPage() {
  const [user, organization, access] = await Promise.all([
    getAuthUser(),
    getCurrentOrganization(),
    getEffectiveAccess(),
  ]);

  if (!organization) {
    return (
      <section data-settings-ease="team-access">
        <h1
          className="m-0 text-[clamp(30px,3.6vw,42px)] font-semibold leading-[1.05] tracking-[-0.02em] text-[#2a2622]"
          style={{ fontFamily: "var(--font-fraunces), Georgia, serif" }}
        >
          Team & Access
        </h1>
        <p className="mt-1.5 mb-0 max-w-[48ch] text-sm leading-snug text-[#5c554c]">
          Finish setting up your organization first, then return here to invite
          your team.
        </p>
      </section>
    );
  }

  const [workspaceResult, members, workload, events, headersList, accessTemplates, billing, billingContext] =
    await Promise.all([
      getOrganizationWorkspaceData(organization.id),
      getOrganizationUsers(organization.id),
      getTeamAccessWorkloadIndex(organization.id),
      getCampaignPageEvents(organization.id),
      headers(),
      getOrganizationAccessTemplates(organization.id),
      getOrgBillingSnapshot(organization.id),
      getSettingsBillingContext(),
    ]);

  const lastSignInAtByUserId = await getOrganizationMemberLastSignIns(
    organization.id,
    members.map((member) => member.userId),
  );

  const workspace =
    workspaceResult ?? buildFallbackOrganizationWorkspaceData();

  // Claim banner only applies when there is no membership; this branch requires one.
  const showClaimBanner = false;
  const canManagePeople = Boolean(
    access && accessHasPermission(access, "manage_people"),
  );
  const canManage = canManagePeople || showClaimBanner;

  const siteOrigin = resolveAuthSiteOrigin(
    headersList.get("origin"),
    headersList.get("x-forwarded-host") ?? headersList.get("host"),
    headersList.get("x-forwarded-proto"),
  );

  const seatLimit = billing
    ? orgCapacityLimit(billing, "teamMembers")
    : 15;

  return (
    <TeamAccessSettingsContent
      members={members}
      workspace={workspace}
      workload={workload}
      lastSignInAtByUserId={lastSignInAtByUserId}
      canManage={canManage}
      canEditAccessTemplates={canManagePeople}
      accessTemplates={accessTemplates}
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
      seatLimit={seatLimit}
      planLabel={billingContext.planLabel}
    />
  );
}
