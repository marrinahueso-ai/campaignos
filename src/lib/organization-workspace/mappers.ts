import type {
  CommitteeDefault,
  CommitteeDefaultRow,
  OrganizationMember,
  OrganizationMemberRow,
  OrganizationRole,
  OrganizationRoleRow,
  ResponsibilityMatrixEntry,
  ResponsibilityMatrixRow,
} from "@/types/organization-workspace";

export function mapOrganizationRoleRow(row: OrganizationRoleRow): OrganizationRole {
  return {
    id: row.id,
    organizationId: row.organization_id,
    name: row.name,
    systemRole: row.system_role,
    description: row.description,
    contactEmail: row.contact_email,
    contactPhone: row.contact_phone,
    contactName: row.contact_name,
    roleKind: row.role_kind,
    sortOrder: row.sort_order,
    archivedAt: row.archived_at ?? null,
    campaignRole: row.campaign_role ?? null,
    createdAt: row.created_at,
  };
}

export function mapOrganizationMemberRow(
  row: OrganizationMemberRow,
  roleName: string | null = null,
  assignedEventIds: string[] = [],
): OrganizationMember {
  return {
    id: row.id,
    organizationId: row.organization_id,
    name: row.name,
    email: row.email ?? null,
    phone: row.phone ?? null,
    organizationRoleId: row.organization_role_id,
    roleName,
    active: row.active,
    campaignRole: row.campaign_role ?? null,
    createdAt: row.created_at,
    assignedEventIds,
  };
}

export function mapResponsibilityMatrixRow(
  row: ResponsibilityMatrixRow,
  defaultRoleName: string | null = null,
): ResponsibilityMatrixEntry {
  return {
    id: row.id,
    organizationId: row.organization_id,
    responsibilityType: row.responsibility_type,
    defaultRoleId: row.default_role_id,
    defaultRoleName,
    createdAt: row.created_at,
  };
}

export function mapCommitteeDefaultRow(
  row: CommitteeDefaultRow,
  defaultRoleName: string | null = null,
): CommitteeDefault {
  return {
    id: row.id,
    organizationId: row.organization_id,
    committeeName: row.committee_name,
    defaultRoleId: row.default_role_id,
    defaultRoleName,
    communicationStrategy: row.communication_strategy,
    playbookSlug: row.playbook_slug,
    createdAt: row.created_at,
  };
}
