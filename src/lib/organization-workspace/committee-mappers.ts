import type {
  OrganizationCommittee,
  OrganizationCommitteeRow,
} from "@/types/organization-workspace";

export function mapOrganizationCommitteeRow(
  row: OrganizationCommitteeRow,
  parentRoleName: string | null = null,
): OrganizationCommittee {
  return {
    id: row.id,
    organizationId: row.organization_id,
    name: row.name,
    parentRoleId: row.parent_role_id,
    parentRoleName,
    contactEmail: row.contact_email,
    contactPhone: row.contact_phone,
    contactName: row.contact_name,
    communicationStrategy: row.communication_strategy,
    playbookSlug: row.playbook_slug,
    eventMatchKey: row.event_match_key,
    sortOrder: row.sort_order,
    archivedAt: row.archived_at ?? null,
    createdAt: row.created_at,
  };
}
