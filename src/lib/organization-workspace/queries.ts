import { createClient } from "@/lib/supabase/server";
import {
  COMMITTEE_DEFAULTS,
  DEFAULT_COMMITTEE_ROLE_NAMES,
  DEFAULT_RESPONSIBILITY_ROLE_NAMES,
  EVENT_TYPE_TO_COMMITTEE,
  EVENT_WORKSPACE_DEFAULT_RESPONSIBILITIES,
  RESPONSIBILITY_LABELS,
} from "@/lib/organization-workspace/constants";
import { mapOrganizationCommitteeRow } from "@/lib/organization-workspace/committee-mappers";
import {
  mapCommitteeDefaultRow,
  mapOrganizationMemberRow,
  mapOrganizationRoleRow,
  mapResponsibilityMatrixRow,
} from "@/lib/organization-workspace/mappers";
import { DEFAULT_ORGANIZATION_ROLE_TEMPLATE } from "@/lib/organization-workspace/role-templates";
import { ensureOrganizationWorkspaceSeeded } from "@/lib/organization-workspace/seed";
import type { Event } from "@/types";
import type {
  CommitteeDefault,
  CommitteeDefaultRow,
  EventOrganizationDefaults,
  OrganizationCommitteeRow,
  OrganizationMemberRow,
  OrganizationRole,
  OrganizationRoleRow,
  OrganizationWorkspaceData,
  ResponsibilityMatrixEntry,
  ResponsibilityMatrixRow,
} from "@/types/organization-workspace";

function buildRoleNameMap(roles: OrganizationRole[]): Map<string, string> {
  return new Map(roles.map((role) => [role.id, role.name]));
}

export async function getOrganizationWorkspaceData(
  organizationId: string,
): Promise<OrganizationWorkspaceData | null> {
  const supabase = await createClient();

  await ensureOrganizationWorkspaceSeeded(organizationId);

  const [
    { data: roleRows, error: roleError },
    { data: memberRows, error: memberError },
    { data: matrixRows, error: matrixError },
    { data: committeeRows, error: committeeError },
    { data: customCommitteeRows, error: customCommitteeError },
  ] = await Promise.all([
    supabase
      .from("organization_roles")
      .select("*")
      .eq("organization_id", organizationId)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
    supabase
      .from("organization_members")
      .select("*")
      .eq("organization_id", organizationId)
      .order("name", { ascending: true }),
    supabase
      .from("responsibility_matrix")
      .select("*")
      .eq("organization_id", organizationId)
      .order("responsibility_type", { ascending: true }),
    supabase
      .from("committee_defaults")
      .select("*")
      .eq("organization_id", organizationId)
      .order("committee_name", { ascending: true }),
    supabase
      .from("organization_committees")
      .select("*")
      .eq("organization_id", organizationId)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
  ]);

  if (roleError?.code === "42P01") {
    return null;
  }

  const committeesTableMissing = customCommitteeError?.code === "42P01";

  if (roleError || memberError || matrixError || committeeError) {
    console.error("Failed to fetch organization workspace:", {
      roleError: roleError?.message,
      memberError: memberError?.message,
      matrixError: matrixError?.message,
      committeeError: committeeError?.message,
      customCommitteeError: customCommitteeError?.message,
    });
    return null;
  }

  if (customCommitteeError && !committeesTableMissing) {
    console.error("Failed to fetch organization committees:", customCommitteeError.message);
    return null;
  }

  const roles = (roleRows ?? []).map((row) =>
    mapOrganizationRoleRow(row as OrganizationRoleRow),
  );
  const roleNames = buildRoleNameMap(roles);

  const members = (memberRows ?? []).map((row) => {
    const memberRow = row as OrganizationMemberRow;
    const roleName = memberRow.organization_role_id
      ? roleNames.get(memberRow.organization_role_id) ?? null
      : null;
    return mapOrganizationMemberRow(memberRow, roleName);
  });

  const responsibilityMatrix = (matrixRows ?? []).map((row) => {
    const matrixRow = row as ResponsibilityMatrixRow;
    const roleName = matrixRow.default_role_id
      ? roleNames.get(matrixRow.default_role_id) ?? null
      : null;
    return mapResponsibilityMatrixRow(matrixRow, roleName);
  });

  const committeeDefaults = (committeeRows ?? []).map((row) => {
    const committeeRow = row as CommitteeDefaultRow;
    const roleName = committeeRow.default_role_id
      ? roleNames.get(committeeRow.default_role_id) ?? null
      : null;
    return mapCommitteeDefaultRow(committeeRow, roleName);
  });

  const committees = committeesTableMissing
    ? []
    : (customCommitteeRows ?? []).map((row) => {
        const committeeRow = row as OrganizationCommitteeRow;
        const roleName = committeeRow.parent_role_id
          ? roleNames.get(committeeRow.parent_role_id) ?? null
          : null;
        return mapOrganizationCommitteeRow(committeeRow, roleName);
      });

  return {
    roles,
    members,
    responsibilityMatrix,
    committeeDefaults,
    committees,
  };
}

export async function getEventOrganizationDefaults(
  organizationId: string,
  event: Event,
): Promise<EventOrganizationDefaults | null> {
  const workspace = await getOrganizationWorkspaceData(organizationId);

  if (!workspace) {
    return null;
  }

  const matrixByType = new Map(
    workspace.responsibilityMatrix.map((entry) => [
      entry.responsibilityType,
      entry,
    ]),
  );

  const responsibilities = EVENT_WORKSPACE_DEFAULT_RESPONSIBILITIES.map(
    (type) => {
      const entry = matrixByType.get(type);
      return {
        label: RESPONSIBILITY_LABELS[type],
        roleName: entry?.defaultRoleName ?? "Not set",
      };
    },
  );

  const committeeKey = event.eventType
    ? EVENT_TYPE_TO_COMMITTEE[event.eventType]
    : undefined;

  const matchedCommittee = committeeKey
    ? workspace.committees.find((entry) => entry.eventMatchKey === committeeKey)
    : undefined;

  const committeeDefault = committeeKey
    ? workspace.committeeDefaults.find(
        (entry) => entry.committeeName === committeeKey,
      )
    : undefined;

  const ownerName =
    matchedCommittee?.parentRoleName ??
    committeeDefault?.defaultRoleName ??
    null;

  return {
    responsibilities,
    committeeOwner: ownerName,
    communicationStrategy:
      matchedCommittee?.communicationStrategy ??
      committeeDefault?.communicationStrategy ??
      null,
    playbookSlug:
      matchedCommittee?.playbookSlug ?? committeeDefault?.playbookSlug ?? null,
  };
}

export function buildFallbackOrganizationWorkspaceData(): OrganizationWorkspaceData {
  const roles: OrganizationRole[] = DEFAULT_ORGANIZATION_ROLE_TEMPLATE.map(
    (role, index) => ({
      id: `fallback-role-${index}`,
      organizationId: "fallback",
      name: role.name,
      systemRole: false,
      description: role.description,
      contactEmail: role.contactEmail ?? null,
      contactPhone: role.contactPhone ?? null,
      contactName: null,
      roleKind: role.roleKind,
      sortOrder: role.sortOrder,
      archivedAt: null,
      campaignRole: null,
      createdAt: new Date().toISOString(),
    }),
  );

  const roleByName = new Map(roles.map((role) => [role.name, role.id]));

  const responsibilityMatrix: ResponsibilityMatrixEntry[] = Object.entries(
    DEFAULT_RESPONSIBILITY_ROLE_NAMES,
  ).map(([type, roleName], index) => ({
    id: `fallback-matrix-${index}`,
    organizationId: "fallback",
    responsibilityType: type as ResponsibilityMatrixEntry["responsibilityType"],
    defaultRoleId: roleByName.get(roleName) ?? null,
    defaultRoleName: roleName,
    createdAt: new Date().toISOString(),
  }));

  const committeeDefaults: CommitteeDefault[] = COMMITTEE_DEFAULTS.map(
    (committee, index) => ({
      id: `fallback-committee-${index}`,
      organizationId: "fallback",
      committeeName: committee.value,
      defaultRoleId:
        roleByName.get(DEFAULT_COMMITTEE_ROLE_NAMES[committee.value]) ?? null,
      defaultRoleName: DEFAULT_COMMITTEE_ROLE_NAMES[committee.value] ?? null,
      communicationStrategy: committee.defaultStrategy,
      playbookSlug: committee.defaultPlaybookSlug,
      createdAt: new Date().toISOString(),
    }),
  );

  const committees = COMMITTEE_DEFAULTS.map((committee, index) => {
    const roleName = DEFAULT_COMMITTEE_ROLE_NAMES[committee.value];
    return {
      id: `fallback-custom-committee-${index}`,
      organizationId: "fallback",
      name: committee.label,
      parentRoleId: roleByName.get(roleName) ?? null,
      parentRoleName: roleName,
      contactEmail: null,
      contactPhone: null,
      contactName: null,
      communicationStrategy: committee.defaultStrategy,
      playbookSlug: committee.defaultPlaybookSlug,
      eventMatchKey: committee.value,
      sortOrder: (index + 1) * 10,
      archivedAt: null,
      campaignRole: null,
      createdAt: new Date().toISOString(),
    };
  });

  return {
    roles,
    members: [],
    responsibilityMatrix,
    committeeDefaults,
    committees,
  };
}
