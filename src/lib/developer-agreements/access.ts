import "server-only";

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

/** Hey Ralli owners who can upload / version developer agreements. */
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
  return ownerEmails.has(email);
}
