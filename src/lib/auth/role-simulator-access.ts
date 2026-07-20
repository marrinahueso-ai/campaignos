import "server-only";

import { getActiveMembership } from "@/lib/auth/membership-queries";
import { getAuthUser } from "@/lib/auth/queries";
import { isRoleSimulatorEnvironmentAllowed } from "@/lib/auth/role-simulator-env";

export { isRoleSimulatorEnvironmentAllowed } from "@/lib/auth/role-simulator-env";

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
 * Uses the real membership role (never the simulated cookie) so cookie
 * elevation cannot unlock the simulator or developer tooling.
 */
export async function canUseRoleSimulator(): Promise<boolean> {
  if (!isRoleSimulatorEnvironmentAllowed()) {
    return false;
  }

  const membership = await getActiveMembership();
  const role = membership?.user.campaignRole;
  if (role === "admin" || role === "developer") {
    return true;
  }

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
