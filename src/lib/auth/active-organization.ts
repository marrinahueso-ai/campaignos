/**
 * Phase D — active organization preference.
 *
 * Isolation contract:
 * - Cookie value is never trusted alone.
 * - Preferred org is used only when it appears in the caller's active memberships.
 * - Invalid / foreign / malformed ids fall back to oldest active membership.
 */

import type { CampaignRole } from "@/lib/auth/campaign-roles";

export const ACTIVE_ORGANIZATION_COOKIE = "campaignos-active-organization-id";

/** Lean org option for the multi-tenant switcher (safe for client props). */
export type ActiveOrganizationOption = {
  organizationId: string;
  organizationName: string;
  campaignRole: CampaignRole;
  roleLabel: string | null;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isOrganizationId(value: string | null | undefined): value is string {
  return Boolean(value && UUID_RE.test(value.trim()));
}

export function normalizeOrganizationId(
  value: string | null | undefined,
): string | null {
  if (!isOrganizationId(value)) {
    return null;
  }
  return value.trim().toLowerCase();
}

/**
 * Pick the active org id from memberships (oldest-first) + optional preference.
 * Preference wins only when it is an exact membership match (case-insensitive).
 */
export function resolveActiveOrganizationId(input: {
  preferredOrganizationId: string | null | undefined;
  /** Active membership org ids, oldest first. */
  membershipOrganizationIds: string[];
}): string | null {
  const membershipIds = input.membershipOrganizationIds
    .map((id) => normalizeOrganizationId(id))
    .filter((id): id is string => Boolean(id));

  if (membershipIds.length === 0) {
    return null;
  }

  const preferred = normalizeOrganizationId(input.preferredOrganizationId);
  if (preferred && membershipIds.includes(preferred)) {
    return preferred;
  }

  return membershipIds[0] ?? null;
}

export function activeOrganizationCookieOptions(maxAgeSeconds: number) {
  return {
    path: "/",
    sameSite: "lax" as const,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: maxAgeSeconds,
  };
}
