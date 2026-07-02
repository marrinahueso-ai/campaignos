const BLOCKED_GREETING_NAMES = new Set([
  "engine",
  "campaignos",
  "campaign",
  "workspace",
  "sprint",
  "system",
  "project",
  "verify",
  "test",
  "member",
  "role",
  "committee",
  "organization",
  "school",
  "pto",
]);

const BLOCKED_GREETING_PATTERNS = [
  /^engine\b/i,
  /\bengine\s*[\d.]/i,
  /\bverify\b/i,
  /\btest\b/i,
  /\bsystem\b/i,
  /\bworkspace\b/i,
  /\bsprint\b/i,
];

export interface GreetingMemberCandidate {
  name: string;
  email: string;
  roleName: string | null;
}

export interface ResolveTodayGreetingNameInput {
  memberCandidates: GreetingMemberCandidate[];
  organizationContactName: string | null;
  organizationName: string | null;
  blockedRoleNames: string[];
}

function normalizeName(value: string): string {
  return value.trim().toLowerCase();
}

export function extractFirstName(fullName: string): string | null {
  const trimmed = fullName.trim();
  if (!trimmed) {
    return null;
  }

  const [first] = trimmed.split(/\s+/);
  return first || null;
}

function formatDisplayFirstName(firstName: string): string {
  if (firstName.length === 0) {
    return firstName;
  }

  return firstName.charAt(0).toUpperCase() + firstName.slice(1);
}

function looksLikeTestMember(name: string, email: string): boolean {
  const normalizedEmail = email.trim().toLowerCase();

  if (normalizedEmail.endsWith("@campaignos.test")) {
    return true;
  }

  if (/\btest member\b/i.test(name)) {
    return true;
  }

  if (/\bverify\b/i.test(name)) {
    return true;
  }

  return /^engine[\s.\d]/i.test(name.trim());
}

function isBlockedGreetingName(
  firstName: string,
  context: {
    organizationName: string | null;
    blockedRoleNames: string[];
  },
): boolean {
  const normalized = normalizeName(firstName);
  if (!normalized) {
    return true;
  }

  if (BLOCKED_GREETING_NAMES.has(normalized)) {
    return true;
  }

  for (const pattern of BLOCKED_GREETING_PATTERNS) {
    if (pattern.test(firstName)) {
      return true;
    }
  }

  if (context.organizationName) {
    const orgNormalized = normalizeName(context.organizationName);
    if (normalized === orgNormalized) {
      return true;
    }

    const orgFirst = extractFirstName(context.organizationName);
    if (orgFirst && normalized === normalizeName(orgFirst)) {
      return true;
    }
  }

  if (
    context.blockedRoleNames.some(
      (roleName) => normalized === normalizeName(roleName),
    )
  ) {
    return true;
  }

  return false;
}

function resolveFromFullName(
  fullName: string,
  context: {
    organizationName: string | null;
    blockedRoleNames: string[];
  },
): string | null {
  const firstName = extractFirstName(fullName);
  if (!firstName || isBlockedGreetingName(firstName, context)) {
    return null;
  }

  return formatDisplayFirstName(firstName);
}

export function resolveTodayGreetingName(
  input: ResolveTodayGreetingNameInput,
): string {
  const context = {
    organizationName: input.organizationName,
    blockedRoleNames: input.blockedRoleNames,
  };

  for (const member of input.memberCandidates) {
    if (looksLikeTestMember(member.name, member.email)) {
      continue;
    }

    if (
      member.roleName &&
      normalizeName(member.name) === normalizeName(member.roleName)
    ) {
      continue;
    }

    const greetingName = resolveFromFullName(member.name, context);
    if (greetingName) {
      return greetingName;
    }
  }

  if (input.organizationContactName) {
    const greetingName = resolveFromFullName(
      input.organizationContactName,
      context,
    );
    if (greetingName) {
      return greetingName;
    }
  }

  return "there";
}
