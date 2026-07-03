import type {
  CommunicationPlaybook,
  CommunicationPlaybookRow,
  CommunicationPlaybookStep,
  CommunicationPlaybookStepRow,
  EventCommunicationStep,
  EventCommunicationStepRow,
  EventPlaybookAssignment,
  EventPlaybookAssignmentRow,
  OrganizationPlaybookDefault,
  OrganizationPlaybookDefaultRow,
} from "@/types/playbooks";
import { addDaysToDateOnly } from "@/lib/utils/dates";

export function mapCommunicationPlaybookRow(
  row: CommunicationPlaybookRow,
  stepCount?: number,
): CommunicationPlaybook {
  return {
    id: row.id,
    organizationId: row.organization_id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    eventType: row.event_type,
    isSystem: row.is_system,
    isArchived: row.is_archived,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    stepCount,
  };
}

export function mapCommunicationPlaybookStepRow(
  row: CommunicationPlaybookStepRow,
): CommunicationPlaybookStep {
  return {
    id: row.id,
    playbookId: row.playbook_id,
    sortOrder: row.sort_order,
    relativeDay: row.relative_day,
    title: row.title,
    channel: row.channel,
    isRequired: row.is_required,
    defaultStatus: row.default_status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapOrganizationPlaybookDefaultRow(
  row: OrganizationPlaybookDefaultRow,
): OrganizationPlaybookDefault {
  return {
    id: row.id,
    organizationId: row.organization_id,
    eventType: row.event_type,
    playbookId: row.playbook_id,
    createdAt: row.created_at,
  };
}

export function mapEventPlaybookAssignmentRow(
  row: EventPlaybookAssignmentRow,
): EventPlaybookAssignment {
  return {
    id: row.id,
    eventId: row.event_id,
    playbookId: row.playbook_id,
    assignedAt: row.assigned_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapEventCommunicationStepRow(
  row: EventCommunicationStepRow,
): EventCommunicationStep {
  return {
    id: row.id,
    eventId: row.event_id,
    assignmentId: row.assignment_id,
    playbookStepId: row.playbook_step_id,
    sortOrder: row.sort_order,
    relativeDay: row.relative_day,
    dueDate: row.due_date,
    title: row.title,
    channel: row.channel,
    isRequired: row.is_required,
    status: row.status,
    metaPublishSurfaces: row.meta_publish_surfaces ?? "both",
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function computeDueDate(eventDate: string, relativeDay: number): string {
  return addDaysToDateOnly(eventDate, relativeDay);
}
