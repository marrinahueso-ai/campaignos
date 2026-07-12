import type {
  InsightsContentBreakdownItem,
  InsightsKpi,
} from "@/lib/insights/types";

export function buildInsightsRecommendation(input: {
  kpis: InsightsKpi[];
  contentBreakdown: InsightsContentBreakdownItem[];
  hasAnyMetrics: boolean;
}): string | null {
  if (!input.hasAnyMetrics) {
    return null;
  }

  const engagementKpi = input.kpis.find((kpi) => kpi.key === "engagement");
  const reachKpi = input.kpis.find((kpi) => kpi.key === "reach");

  const parts: string[] = [];

  if (
    engagementKpi?.changePercent != null &&
    engagementKpi.changePercent > 0
  ) {
    parts.push(
      `Your engagement is up ${Math.round(engagementKpi.changePercent * 10) / 10}% compared to the previous period.`,
    );
  } else if (engagementKpi?.value != null && engagementKpi.value > 0) {
    parts.push(
      `You recorded ${engagementKpi.value.toLocaleString()} engagements in this period.`,
    );
  }

  if (input.contentBreakdown.length >= 2) {
    const [top, second] = input.contentBreakdown;
    if (top.count > second.count) {
      parts.push(
        `${top.label} outperformed ${second.label.toLowerCase()} by volume (${top.percent}% vs ${second.percent}%).`,
      );
    }
  }

  if (reachKpi?.value != null && reachKpi.value > 0 && parts.length === 0) {
    parts.push(
      `Your content reached ${reachKpi.value.toLocaleString()} accounts in this period.`,
    );
  }

  return parts.length > 0 ? parts.join(" ") : null;
}
