import type { OrganizationRoleKind } from "@/types/organization-workspace";

export interface ParsedRosterCommittee {
  name: string;
  contactName: string | null;
  contactEmail: string | null;
}

export interface ParsedRosterRole {
  name: string;
  contactName: string | null;
  contactEmail: string | null;
  roleKind: OrganizationRoleKind;
  committees: ParsedRosterCommittee[];
}

interface ParsedRosterLine {
  indent: number;
  name: string;
  contactName: string | null;
  contactEmail: string | null;
}

const HEADER_PATTERN = /^(position|committee)\/?\s*committee?\s*email/i;
const PRESIDENT_SECTION_HEADER = /^president committees/i;
const CHAIR_YEAR_HEADER = /^\d{4}-\d{4}\s+chair/i;
const PAGE_MARKER = /^--\s*\d+\s+of\s+\d+\s*--/;

const DEFAULT_PRESIDENT_ROLE = "President";

function normalizeIndent(raw: string): number {
  return raw.replace(/\t/g, "    ").length;
}

function parseEmail(value: string | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed || !trimmed.includes("@")) {
    return null;
  }
  return trimmed;
}

function parseContactName(value: string | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  if (/^open$/i.test(trimmed)) {
    return null;
  }

  if (parseEmail(trimmed)) {
    return null;
  }

  return trimmed.replace(/\s*\(and team\)?\s*$/i, "").trim() || null;
}

function splitContactField(value: string | undefined): {
  contactName: string | null;
  contactEmail: string | null;
} {
  const email = parseEmail(value);
  if (email) {
    return { contactName: null, contactEmail: email };
  }

  return {
    contactName: parseContactName(value),
    contactEmail: null,
  };
}

export function parseRosterLine(line: string): ParsedRosterLine | null {
  if (!line.trim()) {
    return null;
  }

  const indentMatch = line.match(/^(\s*)/);
  const indent = indentMatch ? normalizeIndent(indentMatch[1]) : 0;
  const content = line.trim();

  if (HEADER_PATTERN.test(content)) {
    return null;
  }

  if (content.includes("\t")) {
    const [namePart, ...rest] = content.split("\t");
    const name = namePart.trim();
    if (!name) {
      return null;
    }

    const contactField = rest.join("\t").trim();
    const { contactName, contactEmail } = splitContactField(contactField);

    return {
      indent,
      name,
      contactName,
      contactEmail,
    };
  }

  const trailingEmail = content.match(/\s+(\S+@\S+\.\S+)\s*$/);
  if (trailingEmail?.index !== undefined && trailingEmail.index > 0) {
    return {
      indent,
      name: content.slice(0, trailingEmail.index).trim(),
      contactName: null,
      contactEmail: parseEmail(trailingEmail[1]),
    };
  }

  return {
    indent,
    name: content,
    contactName: null,
    contactEmail: null,
  };
}

export function inferRoleKind(name: string): OrganizationRoleKind {
  const normalized = name.trim().toLowerCase();

  if (/^president(\s|$)/.test(normalized) && !normalized.includes("committees")) {
    return "president";
  }

  if (/^vp(\s|$)/.test(normalized) || normalized.includes(" vice president")) {
    return "vp";
  }

  return "other";
}

export function isLeadershipPosition(name: string): boolean {
  const normalized = name.trim().toLowerCase();

  if (/^vp\s/.test(normalized)) {
    return true;
  }

  if (normalized === "president") {
    return true;
  }

  if (normalized === "treasurer" || normalized === "secretary") {
    return true;
  }

  return false;
}

function shouldSkipRosterLine(name: string): boolean {
  const trimmed = name.trim();
  if (!trimmed) {
    return true;
  }

  if (PRESIDENT_SECTION_HEADER.test(trimmed)) {
    return true;
  }

  if (CHAIR_YEAR_HEADER.test(trimmed)) {
    return true;
  }

  if (PAGE_MARKER.test(trimmed)) {
    return true;
  }

  if (/^chair$/i.test(trimmed)) {
    return true;
  }

  return false;
}

function detectTabularRoster(lines: string[]): boolean {
  const meaningful = lines
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !PAGE_MARKER.test(line));

  if (meaningful.length === 0) {
    return false;
  }

  const tabbedCount = meaningful.filter((line) => line.includes("\t")).length;
  return tabbedCount / meaningful.length >= 0.4;
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

export function buildTabularRosterTree(lines: string[]): ParsedRosterRole[] {
  const roles: ParsedRosterRole[] = [];
  const roleByName = new Map<string, ParsedRosterRole>();
  let currentRole: ParsedRosterRole | null = null;
  let inPresidentSection = false;

  for (const line of lines) {
    if (!line.includes("\t")) {
      continue;
    }

    const parsed = parseRosterLine(line);
    if (!parsed) {
      continue;
    }

    if (shouldSkipRosterLine(parsed.name)) {
      if (PRESIDENT_SECTION_HEADER.test(parsed.name)) {
        inPresidentSection = true;
        currentRole = ensureRole(
          roles,
          roleByName,
          DEFAULT_PRESIDENT_ROLE,
          null,
          null,
        );
      }
      continue;
    }

    if (isLeadershipPosition(parsed.name)) {
      inPresidentSection = false;
      currentRole = ensureRole(
        roles,
        roleByName,
        parsed.name,
        parsed.contactName,
        parsed.contactEmail,
      );
      continue;
    }

    if (!currentRole) {
      if (inPresidentSection) {
        currentRole = ensureRole(
          roles,
          roleByName,
          DEFAULT_PRESIDENT_ROLE,
          null,
          null,
        );
      } else {
        currentRole = ensureRole(
          roles,
          roleByName,
          DEFAULT_PRESIDENT_ROLE,
          null,
          null,
        );
      }
    }

    currentRole.committees.push({
      name: parsed.name,
      contactName: parsed.contactName,
      contactEmail: parsed.contactEmail,
    });
  }

  return roles;
}

export function buildRosterTree(lines: string[]): ParsedRosterRole[] {
  if (detectTabularRoster(lines)) {
    return buildTabularRosterTree(lines);
  }

  const roles: ParsedRosterRole[] = [];
  let currentRole: ParsedRosterRole | null = null;

  for (const line of lines) {
    const parsed = parseRosterLine(line);
    if (!parsed) {
      continue;
    }

    if (parsed.indent === 0) {
      currentRole = {
        name: parsed.name,
        contactName: parsed.contactName,
        contactEmail: parsed.contactEmail,
        roleKind: inferRoleKind(parsed.name),
        committees: [],
      };
      roles.push(currentRole);
      continue;
    }

    if (!currentRole) {
      currentRole = {
        name: "Unassigned",
        contactName: null,
        contactEmail: null,
        roleKind: "other",
        committees: [],
      };
      roles.push(currentRole);
    }

    currentRole.committees.push({
      name: parsed.name,
      contactName: parsed.contactName,
      contactEmail: parsed.contactEmail,
    });
  }

  return roles;
}

export function parseRosterText(text: string): ParsedRosterRole[] {
  return buildRosterTree(text.split(/\r?\n/));
}

export function countRosterImport(roles: ParsedRosterRole[]): {
  roleCount: number;
  committeeCount: number;
} {
  return {
    roleCount: roles.length,
    committeeCount: roles.reduce((sum, role) => sum + role.committees.length, 0),
  };
}
