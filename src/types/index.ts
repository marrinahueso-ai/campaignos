import type { EventType } from "@/types/playbooks";
import type { CommunicationStrategy } from "@/types/communication-strategy";

export type EventStatus = "draft" | "scheduled" | "published" | "archived";

export interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string | null;
  location: string | null;
  audience: string | null;
  theme: string | null;
  status: EventStatus;
  category: string | null;
  eventType: EventType | null;
  communicationStrategy: CommunicationStrategy;
  calendarImportId: string | null;
  eventOwner: string | null;
  approvalOrganizationRoleId: string | null;
  budget: string | null;
  volunteerNeeds: string | null;
  goal: string | null;
  expectedAttendance: string | null;
  planningQuickLinks: Record<string, { url: string; status: "open" | "filled" }>;
  planningVendors: Array<{
    id: string;
    name: string;
    notes: string;
    status: "open" | "filled";
  }>;
  approvedSquareImageUrl: string | null;
  approvedSquareImageStatus: "open" | "filled";
  createdAt: string;
  updatedAt: string | null;
}

export interface EventRow {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string | null;
  location: string | null;
  audience: string | null;
  theme: string | null;
  status: EventStatus;
  category: string | null;
  event_type: EventType | null;
  communication_strategy: CommunicationStrategy | null;
  calendar_import_id: string | null;
  event_owner: string | null;
  approval_organization_role_id?: string | null;
  budget: string | null;
  volunteer_needs: string | null;
  goal?: string | null;
  expected_attendance?: string | null;
  planning_quick_links?: Record<string, unknown> | null;
  planning_vendors?: unknown[] | null;
  approved_square_image_url?: string | null;
  approved_square_image_status?: "open" | "filled" | null;
  created_at: string;
  updated_at: string | null;
}

export interface CreateEventInput {
  title: string;
  description: string;
  date: string;
  time: string | null;
  location: string | null;
  audience: string | null;
  theme: string | null;
  status: EventStatus;
  eventType: EventType;
  communicationStrategy: CommunicationStrategy;
  calendarImportId?: string | null;
  category?: string | null;
}

export interface NavItem {
  label: string;
  href: string;
  icon: string;
}

export type CalendarUploadStatus = "pending" | "uploaded" | "failed";

export type CalendarParseStatus =
  | "pending"
  | "parsing"
  | "parsed"
  | "failed"
  | "imported";

import type { PreferredPostingWindow } from "@/types/posting-preferences";

export interface Organization {
  id: string;
  name: string;
  district: string | null;
  schoolYear: string | null;
  mascot: string | null;
  principal: string | null;
  schoolWebsite: string | null;
  ptoWebsite: string | null;
  eventsUrl: string | null;
  calendarUrl: string | null;
  resourcesUrl: string | null;
  faqUrl: string | null;
  timezone: string;
  preferredPostingHours: PreferredPostingWindow[] | null;
  foundingAccessCode: string | null;
  billingExemptAt: string | null;
  createdAt: string;
}

export interface OrganizationRow {
  id: string;
  name: string;
  district: string | null;
  school_year: string | null;
  mascot: string | null;
  principal: string | null;
  school_website: string | null;
  pto_website: string | null;
  events_url?: string | null;
  calendar_url?: string | null;
  resources_url?: string | null;
  faq_url?: string | null;
  timezone?: string | null;
  preferred_posting_hours?: PreferredPostingWindow[] | null;
  founding_access_code?: string | null;
  billing_exempt_at?: string | null;
  created_at: string;
}

export interface BrandAssets {
  id: string;
  organizationId: string;
  ptoLogo: string | null;
  schoolLogo: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  fontFamily: string | null;
  createdAt: string;
}

export interface BrandAssetsRow {
  id: string;
  organization_id: string;
  pto_logo: string | null;
  school_logo: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  font_family: string | null;
  created_at: string;
}

export interface CalendarImport {
  id: string;
  organizationId: string;
  filename: string;
  fileType: string;
  uploadStatus: CalendarUploadStatus;
  storagePath: string;
  parseStatus: CalendarParseStatus;
  parseError: string | null;
  parsedEvents: unknown | null;
  extractedText: string | null;
  importedAt: string | null;
  createdAt: string;
}

export interface CalendarImportRow {
  id: string;
  organization_id: string;
  filename: string;
  file_type: string;
  upload_status: CalendarUploadStatus;
  storage_path: string;
  parse_status: CalendarParseStatus | null;
  parse_error: string | null;
  parsed_events: unknown | null;
  extracted_text: string | null;
  imported_at: string | null;
  created_at: string;
}

export interface SchoolSetupInput {
  name: string;
  district: string | null;
  schoolYear: string | null;
  mascot: string | null;
  principal: string | null;
  schoolWebsite: string | null;
  ptoWebsite: string | null;
  timezone: string;
  calendarSubscribeUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  fontFamily: string | null;
}

export interface SchoolProfile {
  organization: Organization;
  brandAssets: BrandAssets | null;
  calendarImport: CalendarImport | null;
}
