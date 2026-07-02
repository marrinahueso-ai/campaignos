import type { CampaignDirectorDashboardSummary, CampaignDirectorReport } from "@/lib/campaign-director/types";

function pickFocusReport(
  reports: CampaignDirectorReport[],
): CampaignDirectorReport | null {
  if (reports.length === 0) return null;

  const actionable = reports.filter(
    (report) =>
      report.healthScore < 100 &&
      report.recommendations.some((rec) => rec.priority !== "completed"),
  );

  const pool = actionable.length > 0 ? actionable : reports;

  return pool.sort((a, b) => a.healthScore - b.healthScore)[0] ?? reports[0] ?? null;
}

export function buildCampaignDirectorDashboard(
  reports: CampaignDirectorReport[],
): CampaignDirectorDashboardSummary {
  const focus = pickFocusReport(reports);

  const aggregateHealth =
    reports.length === 0
      ? 100
      : Math.round(
          reports.reduce((sum, report) => sum + report.healthScore, 0) /
            reports.length,
        );

  const risks = focus
    ? focus.risks.slice(0, 4).map((risk) => risk.label)
    : reports
        .flatMap((report) => report.risks)
        .slice(0, 4)
        .map((risk) => risk.label);

  const nextRecommendedAction = focus?.nextAction
    ? `${focus.nextAction.verb} ${focus.nextAction.description}`
    : focus?.recommendations.find((rec) => rec.priority !== "completed")?.title.replace(
        /\.$/,
        "",
      ) ?? "Review your campaigns";

  const readyReports = reports.filter((report) => report.readiness.total > 0);
  const readyTotal = readyReports.reduce(
    (sum, report) => sum + report.readiness.ready,
    0,
  );
  const commTotal = readyReports.reduce(
    (sum, report) => sum + report.readiness.total,
    0,
  );

  const readyToPublishLabel =
    commTotal > 0
      ? `${readyTotal} of ${commTotal} communications`
      : focus?.readiness.label ?? "No campaigns yet";

  return {
    campaignHealth: focus?.healthScore ?? aggregateHealth,
    focusEventId: focus?.eventId ?? null,
    focusEventTitle: focus?.eventTitle ?? null,
    nextRecommendedAction,
    nextActionHref: focus?.nextAction?.href ?? focus?.recommendations[0]?.href ?? null,
    risks,
    readyToPublishLabel,
    reports,
  };
}
