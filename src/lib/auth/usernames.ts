import { randomUUID } from "node:crypto";

export const SYNTHETIC_AUTH_EMAIL_DOMAIN = "users.heyralli.invalid";

const RESERVED_USERNAMES = new Set([
  "admin",
  "administrator",
  "root",
  "support",
  "help",
  "heyralli",
  "ralli",
  "system",
  "null",
  "undefined",
  "login",
  "signup",
  "owner",
]);

/** Normalize for uniqueness checks (case-insensitive). */
export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

/**
 * Generate a username candidate from a full name.
 * "Jamie Smith" → "jamie.smith"
 */
export function generateUsernameFromFullName(fullName: string): string {
  const cleaned = fullName
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "")
    .replace(/\.{2,}/g, ".");

  let candidate = cleaned.slice(0, 32);
  if (candidate.length < 3) {
    candidate = `member.${randomUUID().replace(/-/g, "").slice(0, 8)}`;
  }

  // Enforce start/end alnum for DB check constraint.
  candidate = candidate.replace(/^[^a-z0-9]+/, "").replace(/[^a-z0-9]+$/, "");
  if (candidate.length < 3) {
    candidate = `member.${randomUUID().replace(/-/g, "").slice(0, 8)}`;
  }

  return candidate.slice(0, 32);
}

export function isValidUsernameFormat(username: string): boolean {
  return /^[a-z0-9][a-z0-9._-]{1,30}[a-z0-9]$/.test(username);
}

export function isReservedUsername(username: string): boolean {
  return RESERVED_USERNAMES.has(normalizeUsername(username));
}

export function validateUsernameCandidate(username: string): string | null {
  const normalized = normalizeUsername(username);
  if (!normalized) {
    return "Choose a username.";
  }
  if (!isValidUsernameFormat(normalized)) {
    return "Use 3–32 characters: letters, numbers, dots, underscores, or hyphens.";
  }
  if (isReservedUsername(normalized)) {
    return "That username isn’t available.";
  }
  return null;
}

/** Build a non-deliverable Auth email that never collides with real invites. */
export function buildSyntheticAuthEmail(userIdHint?: string): string {
  const id = (userIdHint ?? randomUUID()).replace(/-/g, "");
  return `u_${id}@${SYNTHETIC_AUTH_EMAIL_DOMAIN}`;
}

export function isSyntheticAuthEmail(
  email: string | null | undefined,
): boolean {
  if (!email) return false;
  return email.trim().toLowerCase().endsWith(`@${SYNTHETIC_AUTH_EMAIL_DOMAIN}`);
}

/**
 * Next collision-safe username: base, base2, base3…
 * Caps length to remain within 32 chars.
 */
export function nextUsernameCandidate(
  base: string,
  attempt: number,
): string {
  const normalized = normalizeUsername(base);
  if (attempt <= 1) {
    return normalized.slice(0, 32);
  }
  const suffix = String(attempt);
  const maxBase = Math.max(3, 32 - suffix.length);
  const trimmed = normalized.slice(0, maxBase).replace(/[^a-z0-9]+$/g, "");
  const candidate = `${trimmed}${suffix}`;
  if (isValidUsernameFormat(candidate)) {
    return candidate;
  }
  return `member${randomUUID().replace(/-/g, "").slice(0, 10)}`;
}

/** Login field contains @ → treat as email; otherwise username. */
export function isEmailLoginIdentifier(identifier: string): boolean {
  return identifier.includes("@");
}
