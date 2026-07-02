import type { CreateEventInput, Event, EventRow } from "@/types";
import { parseCommunicationStrategy } from "@/lib/events/communication-strategy";
import { sanitizeVolunteerNeeds } from "@/lib/events/volunteer-needs";

export function mapEventRow(row: EventRow): Event {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    date: row.date,
    time: row.time,
    location: row.location,
    audience: row.audience,
    theme: row.theme,
    status: row.status,
    category: row.category ?? null,
    eventType: row.event_type ?? null,
    communicationStrategy: parseCommunicationStrategy(row.communication_strategy),
    calendarImportId: row.calendar_import_id ?? null,
    eventOwner: row.event_owner ?? null,
    approvalOrganizationRoleId: row.approval_organization_role_id ?? null,
    budget: row.budget ?? null,
    volunteerNeeds: sanitizeVolunteerNeeds(row.volunteer_needs),
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? null,
  };
}

export function mapEventRows(rows: EventRow[]): Event[] {
  return rows.map(mapEventRow);
}

export function toEventInsert(input: CreateEventInput) {
  return {
    title: input.title,
    description: input.description,
    date: input.date,
    time: input.time || null,
    location: input.location || null,
    audience: input.audience || null,
    theme: input.theme || null,
    status: input.status,
    event_type: input.eventType,
    communication_strategy: input.communicationStrategy,
    ...(input.calendarImportId !== undefined && {
      calendar_import_id: input.calendarImportId,
    }),
    ...(input.category !== undefined && { category: input.category }),
  };
}
