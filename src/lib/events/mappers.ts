import type { CreateEventInput, Event, EventRow } from "@/types";
import { parseCommunicationStrategy } from "@/lib/events/communication-strategy";
import { sanitizeVolunteerNeeds } from "@/lib/events/volunteer-needs";
import {
  parsePlanningQuickLinks,
  parsePlanningVendors,
} from "@/lib/event-playbooks/planning-constants";

export function mapEventRow(row: EventRow): Event {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? "",
    date: row.date,
    time: row.time,
    location: row.location,
    audience: row.audience ?? null,
    theme: row.theme ?? null,
    status: row.status,
    category: row.category ?? null,
    eventType: row.event_type ?? null,
    communicationStrategy: parseCommunicationStrategy(row.communication_strategy),
    calendarImportId: row.calendar_import_id ?? null,
    eventOwner: row.event_owner ?? null,
    approvalOrganizationRoleId: row.approval_organization_role_id ?? null,
    budget: row.budget ?? null,
    volunteerNeeds: sanitizeVolunteerNeeds(row.volunteer_needs ?? null),
    goal: row.goal ?? null,
    expectedAttendance: row.expected_attendance ?? null,
    planningQuickLinks: parsePlanningQuickLinks(row.planning_quick_links) as Event["planningQuickLinks"],
    planningVendors: parsePlanningVendors(row.planning_vendors),
    approvedSquareImageUrl: row.approved_square_image_url ?? null,
    approvedSquareImageStatus:
      row.approved_square_image_status === "filled" ? "filled" : "open",
    schoolYearId: row.school_year_id ?? null,
    importSource: row.import_source ?? null,
    importExternalId: row.import_external_id ?? null,
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
    ...(input.importSource !== undefined && {
      import_source: input.importSource,
    }),
    ...(input.importExternalId !== undefined && {
      import_external_id: input.importExternalId,
    }),
  };
}
