import { ACTIVE_ORGANIZATION_COOKIE } from "../config/environments.js";

/**
 * Merge or set the active-organization cookie on a Cookie header string.
 * @param {string} cookieHeader
 * @param {string} organizationId
 */
export function withActiveOrganization(cookieHeader, organizationId) {
  const base = String(cookieHeader || "").trim();
  if (!organizationId) return base;

  const parts = base
    ? base
        .split(";")
        .map((p) => p.trim())
        .filter(Boolean)
        .filter((p) => !p.startsWith(`${ACTIVE_ORGANIZATION_COOKIE}=`))
    : [];

  parts.push(`${ACTIVE_ORGANIZATION_COOKIE}=${organizationId}`);
  return parts.join("; ");
}

/**
 * Collect all org UUIDs from the seeded roster except the expected one.
 * @param {Array<{ organizationId: string }>} schools
 * @param {string} expectedOrgId
 */
export function foreignOrganizationIds(schools, expectedOrgId) {
  const expected = String(expectedOrgId || "").toLowerCase();
  return (schools || [])
    .map((s) => String(s.organizationId || "").toLowerCase())
    .filter((id) => id && id !== expected);
}
