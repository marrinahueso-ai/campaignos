import { Suspense } from "react";
import { notFound } from "next/navigation";
import { TeamAccessPersonProfileShell } from "@/components/settings-v2/team-access/TeamAccessPersonProfileShell";
import {
  accessLevelLabel,
  buildUnifiedTeamMembers,
  findUnifiedTeamMemberById,
  peopleRelatedEventIds,
} from "@/components/settings-v2/team-access/team-access-utils";
import { accessTemplateLabelMap } from "@/lib/access-templates/merge";
import { getOrganizationAccessTemplates } from "@/lib/access-templates/queries";
import {
  accessHasPermission,
  filterEventsByAccess,
  getEffectiveAccess,
} from "@/lib/access-templates/effective-access";
import {
  getActiveMembership,
  getOrganizationUsers,
} from "@/lib/auth/membership-queries";
import {
  getCampaignEventsByIds,
  getCampaignPageEvents,
} from "@/lib/events/campaign-page-queries";
import { getEventArtworkMap } from "@/lib/event-workspace/get-event-artwork";
import { getOrganizationById } from "@/lib/organizations/queries";
import {
  buildFallbackOrganizationWorkspaceData,
  getOrganizationWorkspaceData,
} from "@/lib/organization-workspace/queries";
import { getTeamAccessWorkloadIndex } from "@/lib/organization-workspace/team-access-workload";
import { isSupabaseAdminConfigured } from "@/lib/supabase/admin";

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

  if (memberId.startsWith("roster-member:")) {
    const rosterId = memberId.slice("roster-member:".length);
    const rosterMember = workspace.members.find((member) => member.id === rosterId);
    if (rosterMember?.name) {
      return { title: `${rosterMember.name} · People` };
    }
  }

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

  const [membership, access] = await Promise.all([
    getActiveMembership(),
    getEffectiveAccess(),
  ]);

  const organization = membership
    ? await getOrganizationById(membership.organizationId)
    : null;

  if (!organization) {
    notFound();
  }

  const [workspaceResult, members, workload, accessTemplates] =
    await Promise.all([
      getOrganizationWorkspaceData(organization.id),
      getOrganizationUsers(organization.id),
      getTeamAccessWorkloadIndex(organization.id),
      getOrganizationAccessTemplates(organization.id),
    ]);

  const workspace =
    workspaceResult ?? buildFallbackOrganizationWorkspaceData();
  const accessLabels = accessTemplateLabelMap(accessTemplates);

  // Direct profile resolve; full roster only as fallback.
  let person = findUnifiedTeamMemberById(
    memberId,
    members,
    workspace,
    workload,
  );
  if (!person) {
    person =
      buildUnifiedTeamMembers(members, workspace, workload).find(
        (entry) => entry.id === memberId,
      ) ?? null;
  }
  if (!person) {
    notFound();
  }

  person = {
    ...person,
    accessLabel: accessLevelLabel(
      person.accessTemplateId ?? person.accessLevel,
      person.isRosterOnly,
      accessLabels,
    ),
  };

  const canManage = Boolean(
    access && accessHasPermission(access, "manage_people"),
  );
  // Display: only events this person is tied to (keeps profile light).
  const relatedIds = peopleRelatedEventIds(person);
  // Manage picker: full catalog only when the viewer can edit assignments.
  const [relatedEventsRaw, manageCatalog] = await Promise.all([
    getCampaignEventsByIds(relatedIds),
    canManage ? getCampaignPageEvents(organization.id) : Promise.resolve([]),
  ]);
  // Mode B (list-hide): do not expose unassigned event metadata on profiles.
  const relatedEvents = filterEventsByAccess(access, relatedEventsRaw);

  const eventsSource =
    canManage && manageCatalog.length > 0 ? manageCatalog : relatedEvents;
  const visibleRelatedIds = relatedEvents.map((event) => event.id);
  const artworkByEventId = await getEventArtworkMap(visibleRelatedIds);

  const eventsWithArtwork = eventsSource.map((event) => ({
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
        profileMember={person}
        members={members}
        workspace={workspace}
        workload={workload}
        canManage={canManage}
        canProvisionAccounts={isSupabaseAdminConfigured()}
        events={eventsWithArtwork}
        accessLabels={accessLabels}
        accessTemplates={accessTemplates}
      />
    </Suspense>
  );
}
