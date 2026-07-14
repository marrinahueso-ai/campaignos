import type { CampaignRole } from "@/lib/auth/campaign-roles";
import { getSentryEnvironment } from "@/lib/monitoring/sentry-privacy";

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

/** Non-production app environments where feedback is allowed for all signed-in users. */
export function isNonProductionReportEnvironment(): boolean {
  const environment = getSentryEnvironment();
  return (
    environment === "development" ||
    environment === "preview" ||
    environment === "staging" ||
    process.env.NODE_ENV === "development"
  );
}

/**
 * Whether the Report a Problem control should render for this signed-in user.
 * Production: owner / admin / allowlisted test emails only.
 * Dev / preview / staging: all authenticated dashboard users (unless disabled).
 */
export function canSeeReportAProblem(input: {
  email: string | null | undefined;
  role: CampaignRole | null | undefined;
}): boolean {
  if (process.env.REPORT_A_PROBLEM_ENABLED === "false") {
    return false;
  }
  if (process.env.NEXT_PUBLIC_REPORT_A_PROBLEM === "false") {
    return false;
  }
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN?.trim()) {
    return false;
  }

  const email = input.email?.trim().toLowerCase() ?? "";
  const ownerEmails = parseEmailList(
    process.env.REPORT_A_PROBLEM_OWNER_EMAILS ||
      process.env.HEY_RALLI_OWNER_EMAILS,
  );
  const testEmails = parseEmailList(
    process.env.REPORT_A_PROBLEM_TEST_EMAILS ||
      process.env.HEY_RALLI_TEST_EMAILS,
  );

  if (email && (ownerEmails.has(email) || testEmails.has(email))) {
    return true;
  }

  if (input.role === "admin") {
    return true;
  }

  if (isNonProductionReportEnvironment()) {
    return true;
  }

  return false;
}
