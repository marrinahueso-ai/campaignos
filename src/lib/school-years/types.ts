export type SchoolYearStatus = "planning" | "active" | "closed";

export interface SchoolYear {
  id: string;
  organizationId: string;
  label: string;
  status: SchoolYearStatus;
  calendarSubscribeUrl: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SchoolYearRow {
  id: string;
  organization_id: string;
  label: string;
  status: SchoolYearStatus;
  calendar_subscribe_url: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
}
