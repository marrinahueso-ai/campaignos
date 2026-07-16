import { Suspense } from "react";
import { notFound } from "next/navigation";
import { TeamAccessPersonProfileShell } from "@/components/settings-v2/team-access/TeamAccessPersonProfileShell";
import { canManageTeam } from "@/lib/auth/infer-campaign-role";
import { getCurrentCampaignRole } from "@/lib/auth/get-current-role";
import {
  countActiveOrganizationUsers,
  getActiveMembership,
  getOrganizationUsers,
} from "@/lib/auth/membership-queries";
import { getAuthUser } from "@/lib/auth/queries";
import { getCampaignPageEvents } from "@/lib/events/campaign-page-queries";
import { getEventArtworkMap } from "@/lib/event-workspace/get-event-artwork";
import { getOrganizationById } from "@/lib/organizations/queries";
import {
  buildFallbackOrganizationWorkspaceData,
  getOrganizationWorkspaceData,
} from "@/lib/organization-workspace/queries";
import { getTeamAccessWorkloadIndex } from "@/lib/organization-workspace/team-access-workload";
import { isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { buildUnifiedTeamMembers } from "@/components/settings-v2/team-access/team-access-utils";

interface PersonProfilePageProps {
  params: Promise<{ memberId: string }>;
}

export async function generateMetadata({ params }: PersonProfilePageProps) {
  const { memberId: rawId } = await params;
  const memberId = decodeURIComponent(rawId);
  const membership = await getActiveMembership();
  const organization = membership
    ? await getOrganizationById(membership.organizationId)
    : null;
  if (!organization) {
    return { title: "Person Profile" };
  }

  // Lightweight title lookup — avoid rebuilding the full unified roster twice.
  const workspace =
    (await getOrganizationWorkspaceData(organization.id)) ??
    buildFallbackOrganizationWorkspaceData();
  const rosterMember = workspace.members.find((member) => member.id === memberId);
  if (rosterMember?.name) {
    return { title: `${rosterMember.name} · People` };
  }

  const users = await getOrganizationUsers(organization.id);
  const user = users.find((entry) => entry.id === memberId);
  const label = user?.displayName?.trim() || user?.email;
  return {
    title: label ? `${label} · People` : "Person Profile",
  };
}

export default async function TeamAccessPersonProfilePage({
  params,
}: PersonProfilePageProps) {
  const { memberId: rawId } = await params;
  const memberId = decodeURIComponent(rawId);

  const [user, membership, campaignRole] = await Promise.all([
    getAuthUser(),
    getActiveMembership(),
    getCurrentCampaignRole(),
  ]);

  const organization = membership
    ? await getOrganizationById(membership.organizationId)
    : null;

  if (!organization) {
    notFound();
  }

  const [workspaceResult, members, workload, events, activeCount] =
    await Promise.all([
      getOrganizationWorkspaceData(organization.id),
      getOrganizationUsers(organization.id),
      getTeamAccessWorkloadIndex(organization.id),
      getCampaignPageEvents(organization.id),
      countActiveOrganizationUsers(organization.id),
    ]);

  const workspace =
    workspaceResult ?? buildFallbackOrganizationWorkspaceData();
  const showClaimBanner = Boolean(
    user && !membership && organization && activeCount === 0,
  );

  const unified = buildUnifiedTeamMembers(members, workspace, workload);
  const person = unified.find((entry) => entry.id === memberId);
  if (!person) {
    notFound();
  }

  // Artwork keyed strictly by event id (same resolver as Events / Campaigns).
  const artworkByEventId = await getEventArtworkMap(person.assignedEventIds);

  const eventsWithArtwork = events.map((event) => ({
    id: event.id,
    title: event.title,
    date: event.date,
    status: event.status,
    artwork: artworkByEventId.get(event.id) ?? null,
  }));

  return (
    <Suspense fallback={<p className="text-sm text-cos-muted">Loading profile…</p>}>
      <TeamAccessPersonProfileShell
        memberId={memberId}
        members={members}
        workspace={workspace}
        workload={workload}
        canManage={canManageTeam(campaignRole) || showClaimBanner}
        canProvisionAccounts={isSupabaseAdminConfigured()}
        events={eventsWithArtwork}
      />
    </Suspense>
  );
}
