/**
 * Safe, non-sensitive context for Report a Problem submissions.
 */

export type ReportProblemSafeContext = {
  url: string;
  route: string;
  pageTitle: string;
  reportedAt: string;
  environment: string;
  userAgent: string;
  language: string;
  viewport: string;
  release: string | null;
  userId: string | null;
  userRole: string | null;
  organizationId: string | null;
  eventId: string | null;
  campaignId: string | null;
  playbookId: string | null;
  milestoneId: string | null;
  lastSentryEventId: string | null;
};

function firstMatch(pathname: string, patterns: RegExp[]): string | null {
  for (const pattern of patterns) {
    const match = pathname.match(pattern);
    if (match?.[1]) {
      return match[1];
    }
  }
  return null;
}

export function extractIdsFromPath(
  pathname: string,
  search: string,
): Pick<
  ReportProblemSafeContext,
  "eventId" | "campaignId" | "playbookId" | "milestoneId"
> {
  const params = new URLSearchParams(search);
  const eventId =
    params.get("eventId") ||
    firstMatch(pathname, [
      /\/events\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i,
    ]);
  const campaignId =
    params.get("campaignId") ||
    firstMatch(pathname, [/\/campaigns\/([0-9a-f-]{36})/i]);
  const playbookId =
    params.get("playbookId") ||
    firstMatch(pathname, [/\/playbooks\/([0-9a-f-]{36})/i]);
  const milestoneId =
    params.get("milestoneId") ||
    firstMatch(pathname, [
      /milestoneId=([0-9a-f-]{36})/i,
      /\/milestones\/([0-9a-f-]{36})/i,
    ]);

  return {
    eventId: eventId || null,
    campaignId: campaignId || null,
    playbookId: playbookId || null,
    milestoneId: milestoneId || null,
  };
}

export function buildReportProblemSafeContext(input: {
  userId: string | null;
  userRole: string | null;
  organizationId: string | null;
  environment: string;
  release: string | null;
  lastSentryEventId?: string | null;
}): ReportProblemSafeContext {
  const pathname = typeof window !== "undefined" ? window.location.pathname : "";
  const search = typeof window !== "undefined" ? window.location.search : "";
  const ids = extractIdsFromPath(pathname, search);

  return {
    url: typeof window !== "undefined" ? window.location.href.split("#")[0] : "",
    route: pathname,
    pageTitle: typeof document !== "undefined" ? document.title : "",
    reportedAt: new Date().toISOString(),
    environment: input.environment,
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
    language: typeof navigator !== "undefined" ? navigator.language : "",
    viewport:
      typeof window !== "undefined"
        ? `${window.innerWidth}x${window.innerHeight}`
        : "",
    release: input.release,
    userId: input.userId,
    userRole: input.userRole,
    organizationId: input.organizationId,
    eventId: ids.eventId,
    campaignId: ids.campaignId,
    playbookId: ids.playbookId,
    milestoneId: ids.milestoneId,
    lastSentryEventId: input.lastSentryEventId ?? null,
  };
}

export function formatReportProblemMessage(input: {
  tryingToDo: string;
  whatHappened: string;
  expected: string;
  notes: string;
}): string {
  return [
    "What were you trying to do?",
    input.tryingToDo.trim() || "(not provided)",
    "",
    "What happened instead?",
    input.whatHappened.trim() || "(not provided)",
    "",
    "What did you expect to happen?",
    input.expected.trim() || "(not provided)",
    "",
    "Additional notes",
    input.notes.trim() || "(none)",
  ].join("\n");
}

export function toShortReference(eventId: string | null | undefined): string {
  if (!eventId?.trim()) {
    return "pending";
  }
  return eventId.replace(/-/g, "").slice(0, 8).toUpperCase();
}
