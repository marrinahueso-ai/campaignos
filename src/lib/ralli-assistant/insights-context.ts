import "server-only";

import {
  buildCampaignDirectorDashboard,
  buildCampaignDirectorReport,
} from "@/lib/campaign-director/server";
import type { CampaignDirectorReport } from "@/lib/campaign-director/types";
import {
  calculateCampaignIntelligence,
  fetchCampaignIntelligenceInputsForEvents,
} from "@/lib/campaign-intelligence";
import { getActiveMembership } from "@/lib/auth/membership-queries";
import { getActiveEvents } from "@/lib/events/queries";
import { getInsightsPageData } from "@/lib/insights/queries";
import { getLatestOrganization } from "@/lib/organizations/queries";
import type { ResolvableEvent } from "@/lib/ralli-assistant/event-resolver";
import {
  buildInsightsLinks,
  emptyMetaSection,
  type InsightsContextPack,
  type InsightsMetaSection,
  type InsightsNextAction,
  type InsightsRecommendationItem,
  type InsightsRiskItem,
} from "@/lib/ralli-assistant/insights-format";
import type { Event } from "@/types";

const MAX_ORG_EVENTS = 12;

function severityRank(severity: string): number {
  switch (severity) {
    case "critical":
      return 0;
    case "high":
      return 1;
    case "medium":
      return 2;
    case "low":
      return 3;
    default:
      return 4;
  }
}

function priorityRank(priority: string): number {
  switch (priority) {
    case "critical":
      return 0;
    case "high":
      return 1;
    case "medium":
      return 2;
    case "low":
      return 3;
    default:
      return 5;
  }
}

function nextActionFromReport(
  report: CampaignDirectorReport | null | undefined,
): InsightsNextAction | null {
  if (!report) return null;
  if (report.nextAction) {
    return {
      label: `${report.nextAction.verb} ${report.nextAction.description}`,
      href: report.nextAction.href,
    };
  }
  const actionable = report.recommendations.find(
    (rec) => rec.priority !== "completed",
  );
  if (actionable) {
    return {
      label: actionable.title.replace(/\.$/, ""),
      href: actionable.href ?? null,
    };
  }
  return null;
}

function recommendationsFromReport(
  report: CampaignDirectorReport,
): InsightsRecommendationItem[] {
  return report.recommendations
    .filter((rec) => rec.priority !== "completed")
    .sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority))
    .slice(0, 6)
    .map((rec) => ({
      title: rec.title.replace(/\.$/, ""),
      priority: rec.priority,
      href: rec.href ?? null,
    }));
}

async function loadMetaInsightsSection(): Promise<InsightsMetaSection> {
  try {
    const data = await getInsightsPageData({ range: "28d" });
    if (!data) {
      return emptyMetaSection(
        "I don’t have performance data yet — open Insights after connecting Meta.",
      );
    }

    const recommendation = data.recommendation;
    const hasMetrics = Boolean(recommendation) || data.topPosts.length > 0;
    if (!hasMetrics) {
      return emptyMetaSection(
        data.connection.metaConnected
          ? "I don’t have performance data yet — sync Insights to pull recent Meta metrics."
          : "I don’t have performance data yet — connect Meta under Settings → Integrations, then sync Insights.",
      );
    }

    const top = data.topPosts[0] ?? null;
    return {
      available: true,
      unavailableReason: null,
      summary: recommendation?.summary ?? null,
      topPost: top
        ? {
            title: top.title,
            reach: top.reach,
            engagement: top.engagement,
            platform: top.platform,
          }
        : null,
      items: (recommendation?.items ?? []).slice(0, 6),
    };
  } catch (error) {
    console.error("Ask Ralli insights: Meta pack failed", error);
    return emptyMetaSection(
      "I couldn’t load Meta Insights just now. Try Insights from the nav, or ask again shortly.",
    );
  }
}

async function resolveFullEvent(
  resolvable: ResolvableEvent,
  organizationId: string,
): Promise<Event | null> {
  const active = await getActiveEvents(organizationId);
  return active.find((event) => event.id === resolvable.id) ?? null;
}

/**
 * Event-scoped health / risk / recommendations pack + org Meta insights.
 */
export async function buildEventInsightsContextPack(
  resolvable: ResolvableEvent,
): Promise<InsightsContextPack> {
  const membership = await getActiveMembership();
  const organization = await getLatestOrganization().catch(() => null);
  const links = buildInsightsLinks(resolvable.id);
  const meta = await loadMetaInsightsSection();

  if (!membership) {
    return {
      scope: "event",
      organizationName: organization?.name ?? null,
      event: {
        id: resolvable.id,
        title: resolvable.title,
        date: resolvable.date,
      },
      health: {
        healthScore: null,
        readinessLabel: null,
        summary: "Join or select an organization to load campaign health.",
        missingPieces: [],
      },
      risks: [],
      recommendations: [],
      nextAction: null,
      highestImpactOpsAction: null,
      meta,
      focusEventTitle: resolvable.title,
      links,
    };
  }

  const event = await resolveFullEvent(resolvable, membership.organizationId);
  if (!event) {
    return {
      scope: "event",
      organizationName: organization?.name ?? null,
      event: {
        id: resolvable.id,
        title: resolvable.title,
        date: resolvable.date,
      },
      health: {
        healthScore: null,
        readinessLabel: null,
        summary: "I couldn’t load this event’s campaign workspace yet.",
        missingPieces: [],
      },
      risks: [],
      recommendations: [],
      nextAction: null,
      highestImpactOpsAction: null,
      meta,
      focusEventTitle: resolvable.title,
      links,
    };
  }

  const inputs = await fetchCampaignIntelligenceInputsForEvents([event]);
  const input = inputs.get(event.id);
  if (!input) {
    return {
      scope: "event",
      organizationName: organization?.name ?? null,
      event: {
        id: event.id,
        title: event.title,
        date: event.date,
      },
      health: {
        healthScore: null,
        readinessLabel: null,
        summary: "Campaign intelligence isn’t available for this event yet.",
        missingPieces: [],
      },
      risks: [],
      recommendations: [],
      nextAction: null,
      highestImpactOpsAction: null,
      meta,
      focusEventTitle: event.title,
      links,
    };
  }

  const intelligence = calculateCampaignIntelligence(input);
  const report = await buildCampaignDirectorReport(
    { input, intelligence },
    { useAi: false },
  );
  const nextAction = nextActionFromReport(report);

  return {
    scope: "event",
    organizationName: organization?.name ?? null,
    event: {
      id: event.id,
      title: event.title,
      date: event.date,
    },
    health: {
      healthScore: report.healthScore,
      readinessLabel: report.readinessLabel,
      summary: report.summary,
      missingPieces: intelligence.missingPieces.slice(0, 8),
    },
    risks: report.risks
      .slice()
      .sort((a, b) => severityRank(a.severity) - severityRank(b.severity))
      .slice(0, 6)
      .map((risk) => ({
        label: risk.label,
        severity: risk.severity,
        eventTitle: event.title,
      })),
    recommendations: recommendationsFromReport(report),
    nextAction,
    highestImpactOpsAction: nextAction,
    meta,
    focusEventTitle: event.title,
    links,
  };
}

/**
 * Org-scoped risk / highest-impact pack across active events + Meta insights.
 */
export async function buildOrgInsightsContextPack(): Promise<InsightsContextPack> {
  const membership = await getActiveMembership();
  const organization = await getLatestOrganization().catch(() => null);
  const links = buildInsightsLinks(null);
  const meta = await loadMetaInsightsSection();

  const empty: InsightsContextPack = {
    scope: "org",
    organizationName: organization?.name ?? null,
    event: null,
    health: {
      healthScore: null,
      readinessLabel: null,
      summary: null,
      missingPieces: [],
    },
    risks: [],
    recommendations: [],
    nextAction: null,
    highestImpactOpsAction: null,
    meta,
    focusEventTitle: null,
    links,
  };

  if (!membership) {
    return empty;
  }

  let events: Event[] = [];
  try {
    const active = await getActiveEvents(membership.organizationId);
    events = active.slice(0, MAX_ORG_EVENTS);
  } catch (error) {
    console.error("Ask Ralli insights: failed to load events", error);
    return empty;
  }

  if (events.length === 0) {
    return {
      ...empty,
      health: {
        ...empty.health,
        summary: "No active campaigns yet — create an event to get health and risk signals.",
      },
    };
  }

  const inputs = await fetchCampaignIntelligenceInputsForEvents(events);
  const contexts = events
    .map((event) => {
      const input = inputs.get(event.id);
      if (!input) return null;
      return {
        input,
        intelligence: calculateCampaignIntelligence(input),
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));

  if (contexts.length === 0) {
    return {
      ...empty,
      health: {
        ...empty.health,
        summary: "Campaign intelligence isn’t available yet for your active events.",
      },
    };
  }

  const reports = await Promise.all(
    contexts.map((context) =>
      buildCampaignDirectorReport(context, { useAi: false }),
    ),
  );
  const dashboard = buildCampaignDirectorDashboard(reports);
  const focusReport =
    reports.find((report) => report.eventId === dashboard.focusEventId) ??
    reports[0] ??
    null;

  const risks: InsightsRiskItem[] = reports
    .flatMap((report) =>
      report.risks.map((risk) => ({
        label: risk.label,
        severity: risk.severity,
        eventTitle: report.eventTitle,
      })),
    )
    .sort((a, b) => severityRank(a.severity) - severityRank(b.severity))
    .slice(0, 8);

  const recommendations: InsightsRecommendationItem[] = reports
    .flatMap((report) =>
      recommendationsFromReport(report).map((rec) => ({
        ...rec,
        title: `${rec.title} (${report.eventTitle})`,
      })),
    )
    .sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority))
    .slice(0, 6);

  const missingPieces = [
    ...new Set(
      contexts.flatMap((context) =>
        context.intelligence.missingPieces.map(
          (piece) => `${piece} (${context.input.event.title})`,
        ),
      ),
    ),
  ].slice(0, 8);

  const highestImpact: InsightsNextAction | null = dashboard.nextRecommendedAction
    ? {
        label: dashboard.focusEventTitle
          ? `${dashboard.nextRecommendedAction} — ${dashboard.focusEventTitle}`
          : dashboard.nextRecommendedAction,
        href: dashboard.nextActionHref,
      }
    : nextActionFromReport(focusReport);

  if (highestImpact?.href && highestImpact.href.startsWith("/events/")) {
    links.unshift({
      label: dashboard.focusEventTitle ?? "Focus event",
      href: highestImpact.href.split("#")[0] ?? highestImpact.href,
    });
  }

  return {
    scope: "org",
    organizationName: organization?.name ?? null,
    event: focusReport
      ? {
          id: focusReport.eventId,
          title: focusReport.eventTitle,
          date:
            events.find((event) => event.id === focusReport.eventId)?.date ??
            "",
        }
      : null,
    health: {
      healthScore: dashboard.campaignHealth,
      readinessLabel: focusReport?.readinessLabel ?? null,
      summary: focusReport?.summary ?? null,
      missingPieces,
    },
    risks,
    recommendations,
    nextAction: highestImpact,
    highestImpactOpsAction: highestImpact,
    meta,
    focusEventTitle: dashboard.focusEventTitle,
    links,
  };
}
