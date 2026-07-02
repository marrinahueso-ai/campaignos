import type { SchoolYear, SchoolYearRow } from "@/lib/school-years/types";

export function mapSchoolYearRow(row: SchoolYearRow): SchoolYear {
  return {
    id: row.id,
    organizationId: row.organization_id,
    label: row.label,
    status: row.status,
    calendarSubscribeUrl: row.calendar_subscribe_url,
    closedAt: row.closed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
