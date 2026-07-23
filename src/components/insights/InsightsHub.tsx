"use client";

import { BarChart3, Download, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { ConnectionHealthBanner } from "@/components/insights/ConnectionHealthBanner";
import { InsightsRecommendationsFooter } from "@/components/insights/InsightsRecommendationsFooter";
import { InsightsDateRangeSelector } from "@/components/insights/InsightsDateRangeSelector";
import { InsightsEmptyState } from "@/components/insights/InsightsEmptyState";
import { InsightsKpiCards } from "@/components/insights/InsightsKpiCards";
import { InsightsSectionCard } from "@/components/insights/InsightsSectionCard";
import { LiveActivityFeed } from "@/components/insights/LiveActivityFeed";
import { PerformanceChart } from "@/components/insights/PerformanceChart";
import { PlatformComparison } from "@/components/insights/PlatformComparison";
import { TopPerformingPosts } from "@/components/insights/TopPerformingPosts";
import { Button } from "@/components/ui/Button";
import { syncInsightsAction } from "@/lib/insights/actions";
import { getInsightsDataNote } from "@/lib/insights/connection-messages";
import { formatInsightsNumber } from "@/lib/insights/format";
import type {
  InsightsKpiKey,
  InsightsPageData,
  InsightsPlatform,
} from "@/lib/insights/types";
import { cn } from "@/lib/utils/cn";

interface InsightsHubProps {
  data: InsightsPageData;
}

function filterTopPosts(
  posts: InsightsPageData["topPosts"],
  platform: InsightsPlatform,
) {
  if (platform === "all") {
    return posts;
  }
  return posts.filter((post) => post.platform === platform);
}

function filterKpisForPlatform(
  data: InsightsPageData,
  platform: InsightsPlatform,
): InsightsPageData["kpis"] {
  if (platform === "all") {
    return data.kpis;
  }

  // Recompute sparkline/value display from platform-filtered time series.
  return data.kpis.map((kpi) => {
    const series = data.timeSeries[platform];
    const sparkline = series.map((point) => {
      switch (kpi.key) {
        case "views":
          return point.views;
        case "reach":
          return point.reach;
        case "engagement":
          return point.engagement;
        case "likes":
          return point.likes;
        case "comments":
          return point.comments;
        default:
          return 0;
      }
    });
    const value = sparkline.reduce((sum, entry) => sum + entry, 0);
    return {
      ...kpi,
      value,
      sparkline,
      // Prior-period comparison stays org-wide; avoid misleading platform deltas.
      changePercent: null,
      previousValue: null,
    };
  });
}

export function InsightsHub({ data }: InsightsHubProps) {
  const router = useRouter();
  const [platformFilter, setPlatformFilter] = useState<InsightsPlatform>("all");
  const [selectedMetric, setSelectedMetric] = useState<InsightsKpiKey>("views");
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const exportHref = `/api/insights/export?from=${encodeURIComponent(data.dateRange.from)}&to=${encodeURIComponent(data.dateRange.to)}`;

  const showConnectEmpty = !data.connection.metaConnected;
  const showSyncEmpty =
    data.connection.metaConnected &&
    !data.hasAnyMetrics &&
    !data.syncInProgress;
  const dataNote = getInsightsDataNote(data.connection);

  const filteredKpis = useMemo(
    () => filterKpisForPlatform(data, platformFilter),
    [data, platformFilter],
  );
  const filteredTopPosts = useMemo(
    () => filterTopPosts(data.topPosts, platformFilter),
    [data.topPosts, platformFilter],
  );

  function handleSync() {
    startTransition(async () => {
      setSyncMessage(null);
      const result = await syncInsightsAction({
        since: data.dateRange.from,
        until: data.dateRange.to,
      });

      if (result.ok) {
        setSyncMessage(
          `Synced ${result.daysSynced} day(s) and ${result.postsSynced} post(s) from Meta.`,
        );
        router.refresh();
        return;
      }

      setSyncMessage(result.error ?? "Insights sync failed.");
    });
  }

  return (
    <div className="studio-page space-y-6 pb-12">
      <header className="flex flex-col gap-4 border-b border-cos-border pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 space-y-2">
          <p className="studio-eyebrow">Analytics</p>
          <div className="flex items-center gap-2.5">
            <BarChart3 className="h-6 w-6 text-cos-accent" strokeWidth={1.75} />
            <h1 className="font-display text-3xl text-cos-text sm:text-4xl">
              Insights
            </h1>
          </div>
          <p className="max-w-xl text-sm text-cos-muted">
            How your Facebook and Instagram posts performed for{" "}
            {data.organizationName || "your organization"}.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-0.5 rounded-full border border-cos-border bg-cos-bg p-0.5 text-xs">
            {(["all", "facebook", "instagram"] as const).map((platform) => (
              <button
                key={platform}
                type="button"
                onClick={() => setPlatformFilter(platform)}
                className={cn(
                  "rounded-full px-3 py-1.5 capitalize transition-colors",
                  platformFilter === platform
                    ? "bg-cos-dark text-[#f6f2eb]"
                    : "text-cos-muted hover:text-cos-text",
                )}
              >
                {platform === "all" ? "All" : platform}
              </button>
            ))}
          </div>
          <InsightsDateRangeSelector
            currentFrom={data.dateRange.from}
            currentTo={data.dateRange.to}
            currentLabel={data.dateRange.label}
          />
          {!showConnectEmpty ? (
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={handleSync}
              disabled={isPending || data.syncInProgress}
            >
              <RefreshCw
                className={cn(
                  "mr-2 h-4 w-4",
                  (isPending || data.syncInProgress) && "animate-spin",
                )}
                strokeWidth={1.5}
              />
              {isPending || data.syncInProgress ? "Syncing…" : "Refresh"}
            </Button>
          ) : null}
          <Button href={exportHref} variant="primary" size="md">
            <Download className="mr-2 h-4 w-4" strokeWidth={1.5} />
            Export
          </Button>
        </div>
      </header>

      <ConnectionHealthBanner connection={data.connection} />

      {syncMessage ? (
        <p
          className="rounded-lg border border-cos-border bg-cos-card px-3 py-2 text-sm text-cos-muted"
          role="status"
        >
          {syncMessage}
        </p>
      ) : null}

      {showConnectEmpty ? (
        <InsightsEmptyState
          variant="connect"
          organizationName={data.organizationName}
        />
      ) : null}

      {showSyncEmpty ? (
        <InsightsEmptyState
          variant="sync"
          onSync={handleSync}
          syncing={isPending}
          missingScopes={data.connection.missingInsightsScopes}
        />
      ) : null}

      {!showConnectEmpty && !showSyncEmpty ? (
        <div className="space-y-6">
          <InsightsKpiCards
            kpis={filteredKpis}
            comparisonLabel="vs prior period"
            selectedKey={selectedMetric}
            onSelect={setSelectedMetric}
          />

          <InsightsRecommendationsFooter
            recommendation={data.recommendation}
            dataNote={dataNote}
            pageName={data.connection.pageName}
          />

          <InsightsSectionCard title="Content overview">
            <PerformanceChart
              series={data.timeSeries}
              platform={platformFilter}
              metric={selectedMetric}
              kpis={filteredKpis}
              emptyMessage={
                data.timeSeries.all.every(
                  (point) =>
                    point.views === 0 &&
                    point.reach === 0 &&
                    point.engagement === 0,
                )
                  ? "No daily metrics stored for this period. Sync insights from Meta to populate this chart."
                  : "No data for this metric in the selected range."
              }
            />
          </InsightsSectionCard>

          <TopPerformingPosts
            posts={filteredTopPosts}
            platformFilter={platformFilter}
          />

          <div className="grid gap-4 lg:grid-cols-3">
            <InsightsSectionCard title="Content breakdown">
              {data.contentBreakdown.length > 0 ? (
                <div className="space-y-3">
                  {data.contentBreakdown.map((item) => (
                    <div key={item.label} className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2 text-sm">
                        <span className="truncate font-medium text-cos-text">
                          {item.label}
                        </span>
                        <span className="shrink-0 tabular-nums text-cos-muted">
                          {item.percent}%
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-cos-bg">
                        <div
                          className="h-full rounded-full bg-cos-accent"
                          style={{ width: `${item.percent}%` }}
                        />
                      </div>
                      <p className="text-[11px] text-cos-muted">
                        {item.count} post{item.count === 1 ? "" : "s"} ·{" "}
                        {formatInsightsNumber(item.engagement)} eng
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-cos-muted">
                  No post-level insights for this period.
                </p>
              )}
            </InsightsSectionCard>

            <PlatformComparison platforms={data.platformComparison} />

            <LiveActivityFeed events={data.activity} />
          </div>

          {data.unavailableMetricNotes.length > 0 ? (
            <p className="text-xs leading-relaxed text-cos-muted">
              {data.unavailableMetricNotes.join(" ")}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
