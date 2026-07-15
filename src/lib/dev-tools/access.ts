import "server-only";

import { getCurrentCampaignRole } from "@/lib/auth/get-current-role";
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
 * Owner/Admin only for developer clear tools (smallest safe version).
 * Admin campaign role maps to Owner in Team & Access.
 */
export async function canUseDeveloperClearTools(): Promise<boolean> {
  const role = await getCurrentCampaignRole();
  if (role === "admin") {
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

export async function requireDeveloperClearAccess(): Promise<{
  allowed: boolean;
  userId: string | null;
  organizationId: string | null;
  message?: string;
}> {
  const membership = await getActiveMembership();
  const user = await getAuthUser();
  const organizationId = membership?.organizationId ?? null;
  const userId = user?.id ?? null;

  if (!organizationId || !userId) {
    return {
      allowed: false,
      userId,
      organizationId,
      message: "Sign in with an active organization to use developer tools.",
    };
  }

  if (!(await canUseDeveloperClearTools())) {
    return {
      allowed: false,
      userId,
      organizationId,
      message: "Developer clear tools are limited to Owner / Admin accounts.",
    };
  }

  return { allowed: true, userId, organizationId };
}
