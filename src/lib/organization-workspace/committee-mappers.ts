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
    contactEmail: row.contact_email ?? null,
    contactPhone: row.contact_phone ?? null,
    contactName: row.contact_name ?? null,
    communicationStrategy: row.communication_strategy,
    playbookSlug: row.playbook_slug,
    eventMatchKey: row.event_match_key,
    assignedEventId: row.assigned_event_id ?? null,
    sortOrder: row.sort_order,
    archivedAt: row.archived_at ?? null,
    campaignRole: row.campaign_role ?? null,
    createdAt: row.created_at,
  };
}
