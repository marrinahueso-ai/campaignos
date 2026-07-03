import type {
  BrandAssets,
  BrandAssetsRow,
  CalendarImport,
  CalendarImportRow,
  Organization,
  OrganizationRow,
  SchoolSetupInput,
} from "@/types";

export function mapOrganizationRow(row: OrganizationRow): Organization {
  return {
    id: row.id,
    name: row.name,
    district: row.district,
    schoolYear: row.school_year,
    mascot: row.mascot,
    principal: row.principal,
    schoolWebsite: row.school_website,
    ptoWebsite: row.pto_website,
    timezone: row.timezone ?? "America/Chicago",
    preferredPostingHours: row.preferred_posting_hours ?? null,
    createdAt: row.created_at,
  };
}

export function mapBrandAssetsRow(row: BrandAssetsRow): BrandAssets {
  return {
    id: row.id,
    organizationId: row.organization_id,
    ptoLogo: row.pto_logo,
    schoolLogo: row.school_logo,
    primaryColor: row.primary_color,
    secondaryColor: row.secondary_color,
    fontFamily: row.font_family,
    createdAt: row.created_at,
  };
}

export function mapCalendarImportRow(row: CalendarImportRow): CalendarImport {
  return {
    id: row.id,
    organizationId: row.organization_id,
    filename: row.filename,
    fileType: row.file_type,
    uploadStatus: row.upload_status,
    storagePath: row.storage_path,
    parseStatus: row.parse_status ?? "pending",
    parseError: row.parse_error ?? null,
    parsedEvents: row.parsed_events ?? null,
    extractedText: row.extracted_text ?? null,
    importedAt: row.imported_at ?? null,
    createdAt: row.created_at,
  };
}

export function toOrganizationInsert(input: SchoolSetupInput) {
  return {
    name: input.name,
    district: input.district,
    school_year: input.schoolYear,
    mascot: input.mascot,
    principal: input.principal,
    school_website: input.schoolWebsite,
    pto_website: input.ptoWebsite,
  };
}

export function toBrandAssetsInsert(
  organizationId: string,
  input: SchoolSetupInput,
  logos: { ptoLogo: string | null; schoolLogo: string | null },
) {
  return {
    organization_id: organizationId,
    pto_logo: logos.ptoLogo,
    school_logo: logos.schoolLogo,
    primary_color: input.primaryColor,
    secondary_color: input.secondaryColor,
    font_family: input.fontFamily,
  };
}

export function getCalendarFileType(filename: string): string | null {
  const extension = filename.split(".").pop()?.toLowerCase();

  switch (extension) {
    case "pdf":
      return "pdf";
    case "docx":
      return "docx";
    case "xlsx":
    case "xls":
      return "excel";
    case "csv":
      return "csv";
    case "ics":
      return "ics";
    default:
      return null;
  }
}

export const CALENDAR_ACCEPTED_EXTENSIONS = ["pdf", "docx", "xlsx", "xls", "csv", "ics"];
