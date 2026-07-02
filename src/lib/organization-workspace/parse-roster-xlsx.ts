import ExcelJS from "exceljs";
import {
  countRosterImport,
  inferRoleKind,
  isLeadershipPosition,
  type ParsedRosterRole,
} from "@/lib/organization-workspace/parse-roster";

const PRESIDENT_SECTION_HEADER = /^president committees/i;
const CHAIR_YEAR_HEADER = /^\d{4}-\d{4}\s+chair/i;
const DEFAULT_PRESIDENT_ROLE = "President";

function cellText(cell: ExcelJS.Cell): string {
  const value = cell.text?.trim() ?? "";
  if (value) {
    return value;
  }

  if (cell.value === null || cell.value === undefined) {
    return "";
  }

  if (typeof cell.value === "object" && "richText" in cell.value) {
    return (cell.value.richText ?? [])
      .map((part) => part.text)
      .join("")
      .trim();
  }

  return String(cell.value).trim();
}

function isBold(cell: ExcelJS.Cell): boolean {
  return cell.font?.bold === true;
}

function parseEmail(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed || !trimmed.includes("@")) {
    return null;
  }
  return trimmed;
}

function parseContactName(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed || /^open$/i.test(trimmed)) {
    return null;
  }
  if (parseEmail(trimmed)) {
    return null;
  }
  return trimmed.replace(/\s*\(and team\)?\s*$/i, "").trim() || null;
}

function splitContactField(value: string): {
  contactName: string | null;
  contactEmail: string | null;
} {
  const email = parseEmail(value);
  if (email) {
    return { contactName: null, contactEmail: email };
  }
  return { contactName: parseContactName(value), contactEmail: null };
}

function isHeaderRow(columnA: string, columnB: string): boolean {
  if (PRESIDENT_SECTION_HEADER.test(columnA)) {
    return true;
  }

  if (CHAIR_YEAR_HEADER.test(columnA) || CHAIR_YEAR_HEADER.test(columnB)) {
    return true;
  }

  if (/^chair$/i.test(columnB)) {
    return true;
  }

  return false;
}

function isLeadershipRow(
  columnA: string,
  columnACell: ExcelJS.Cell,
): boolean {
  if (!columnA) {
    return false;
  }

  if (PRESIDENT_SECTION_HEADER.test(columnA)) {
    return false;
  }

  if (isLeadershipPosition(columnA)) {
    return true;
  }

  return isBold(columnACell);
}

function pickCommitteeChair(row: ExcelJS.Row): {
  contactName: string | null;
  contactEmail: string | null;
} {
  const currentYear = cellText(row.getCell(4));
  const priorYear = cellText(row.getCell(3));
  return splitContactField(currentYear || priorYear);
}

function ensureRole(
  roles: ParsedRosterRole[],
  roleByName: Map<string, ParsedRosterRole>,
  name: string,
  contactName: string | null,
  contactEmail: string | null,
): ParsedRosterRole {
  const key = name.trim().toLowerCase();
  const existing = roleByName.get(key);

  if (existing) {
    if (contactName && !existing.contactName) {
      existing.contactName = contactName;
    }
    if (contactEmail && !existing.contactEmail) {
      existing.contactEmail = contactEmail;
    }
    return existing;
  }

  const role: ParsedRosterRole = {
    name: name.trim(),
    contactName,
    contactEmail,
    roleKind: inferRoleKind(name),
    committees: [],
  };

  roles.push(role);
  roleByName.set(key, role);
  return role;
}

export async function parseRosterXlsx(buffer: Buffer): Promise<ParsedRosterRole[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    return [];
  }

  const roles: ParsedRosterRole[] = [];
  const roleByName = new Map<string, ParsedRosterRole>();
  let currentRole: ParsedRosterRole | null = null;

  worksheet.eachRow((row, rowNumber) => {
    const columnACell = row.getCell(1);
    const columnA = cellText(columnACell);
    const columnB = cellText(row.getCell(2));

    if (rowNumber === 1 || isHeaderRow(columnA, columnB)) {
      if (PRESIDENT_SECTION_HEADER.test(columnA)) {
        currentRole = ensureRole(
          roles,
          roleByName,
          DEFAULT_PRESIDENT_ROLE,
          null,
          null,
        );
      }
      return;
    }

    if (isLeadershipRow(columnA, columnACell)) {
      const { contactName, contactEmail } = splitContactField(columnB);
      currentRole = ensureRole(
        roles,
        roleByName,
        columnA,
        contactName,
        contactEmail,
      );
      return;
    }

    if (!columnB) {
      return;
    }

    if (!currentRole) {
      currentRole = ensureRole(
        roles,
        roleByName,
        DEFAULT_PRESIDENT_ROLE,
        null,
        null,
      );
    }

    const chair = pickCommitteeChair(row);
    currentRole.committees.push({
      name: columnB,
      contactName: chair.contactName,
      contactEmail: chair.contactEmail,
    });
  });

  return roles;
}

export { countRosterImport };
