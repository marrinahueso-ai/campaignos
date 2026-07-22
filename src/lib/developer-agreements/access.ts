import "server-only";

import { getActiveMembership } from "@/lib/auth/membership-queries";
import { getAuthUser } from "@/lib/auth/queries";

function parseEmailList(raw: string | undefined): Set<string> {
  if (!raw?.trim()) {
    return new Set();
  }
  return new Set(
    raw
      .split(",")
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean),
  );
}

/**
 * Platform owner tools (agreements manage/counter-sign, /ops dashboard).
 * Requires:
 * 1) Email on HEY_RALLI_OWNER_EMAILS (or REPORT_A_PROBLEM_OWNER_EMAILS)
 * 2) Active membership with Owner access (= campaign_role admin)
 */
export async function canManageDeveloperAgreements(): Promise<boolean> {
  const user = await getAuthUser();
  const email = user?.email?.trim().toLowerCase() ?? "";
  if (!email) {
    return false;
  }

  const ownerEmails = parseEmailList(
    process.env.HEY_RALLI_OWNER_EMAILS ||
      process.env.REPORT_A_PROBLEM_OWNER_EMAILS,
  );
  if (!ownerEmails.has(email)) {
    return false;
  }

  const membership = await getActiveMembership();
  return membership?.user.campaignRole === "admin";
}
