"use client";

import {
  BarChart3,
  Download,
  Eye,
  Heart,
  MessageCircle,
  Share2,
  TrendingUp,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { ConnectionHealthBanner } from "@/components/insights/ConnectionHealthBanner";
import { InsightsAiFooter } from "@/components/insights/InsightsAiFooter";
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
import {
  formatDateRangeLabel,
  getPreviousPeriod,
} from "@/lib/insights/date-range";
import { formatInsightsNumber } from "@/lib/insights/format";
import type { InsightsPageData, InsightsPlatform } from "@/lib/insights/types";
import { cn } from "@/lib/utils/cn";

interface InsightsHubProps {
  data: InsightsPageData;
}

const KPI_ICONS = {
  reach: Eye,
  engagement: TrendingUp,
  likes: Heart,
  comments: MessageCircle,
  shares: Share2,
} as const;

export function InsightsHub({ data }: InsightsHubProps) {
  const router = useRouter();
  const [platformFilter, setPlatformFilter] = useState<InsightsPlatform>("all");
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const previousPeriod = useMemo(
    () => getPreviousPeriod(data.dateRange.from, data.dateRange.to),
    [data.dateRange.from, data.dateRange.to],
  );
  const previousLabel = formatDateRangeLabel(previousPeriod.from, previousPeriod.to);

  const exportHref = `/api/insights/export?from=${encodeURIComponent(data.dateRange.from)}&to=${encodeURIComponent(data.dateRange.to)}`;

  const showConnectEmpty = !data.connection.metaConnected;
  const showSyncEmpty =
    data.connection.metaConnected &&
    !data.hasAnyMetrics &&
    !data.syncInProgress;

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
    <div className="studio-page space-y-8 pb-12">
      <header className="flex flex-col gap-6 border-b border-cos-border pb-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <p className="studio-eyebrow">Analytics</p>
          <div className="flex items-center gap-3">
            <BarChart3 className="h-6 w-6 text-cos-accent" strokeWidth={1.5} />
            <h1 className="font-display text-4xl text-cos-text sm:text-5xl">
              Insights &amp; Analytics
            </h1>
          </div>
          <p className="max-w-2xl text-sm leading-relaxed text-cos-muted sm:text-base">
            Track performance across your social channels and content.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <InsightsDateRangeSelector
            currentFrom={data.dateRange.from}
            currentTo={data.dateRange.to}
            currentLabel={data.dateRange.label}
          />
          <Button href={exportHref} variant="primary" size="md">
            <Download className="mr-2 h-4 w-4" strokeWidth={1.5} />
            Export Report
          </Button>
        </div>
      </header>

      <ConnectionHealthBanner connection={data.connection} />

      {syncMessage ? (
        <p className="text-sm text-cos-muted" role="status">
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

      {!showConnectEmpty ? (
        <>
          <InsightsKpiCards
            kpis={data.kpis}
            icons={KPI_ICONS}
            comparisonLabel={`vs ${previousLabel}`}
          />

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
            <InsightsSectionCard
              title="Performance Over Time"
              action={
                <div className="flex items-center gap-1 rounded-full border border-cos-border bg-cos-bg p-1 text-xs">
                  {(["all", "facebook", "instagram"] as const).map((platform) => (
                    <button
                      key={platform}
                      type="button"
                      onClick={() => setPlatformFilter(platform)}
                      className={cn(
                        "rounded-full px-3 py-1 capitalize transition-colors",
                        platformFilter === platform
                          ? "bg-cos-primary text-[#f6f2eb]"
                          : "text-cos-muted hover:text-cos-text",
                      )}
                    >
                      {platform}
                    </button>
                  ))}
                </div>
              }
            >
              <PerformanceChart
                series={data.timeSeries}
                platform={platformFilter}
                emptyMessage={
                  data.timeSeries.all.length === 0
                    ? "No daily metrics stored for this period. Sync insights from Meta to populate this chart."
                    : null
                }
              />
            </InsightsSectionCard>

            <LiveActivityFeed events={data.activity} />
          </div>

          <div
            className={cn(
              "grid gap-6",
              data.audienceAvailable ? "lg:grid-cols-3" : "lg:grid-cols-2",
            )}
          >
            {data.audienceAvailable ? (
              <InsightsSectionCard title="Audience Overview">
                <p className="text-sm text-cos-muted">
                  Audience demographics are not available for this account.
                </p>
              </InsightsSectionCard>
            ) : null}

            <InsightsSectionCard title="Content Breakdown">
              {data.contentBreakdown.length > 0 ? (
                <div className="space-y-3">
                  {data.contentBreakdown.map((item) => (
                    <div key={item.label} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-cos-text">{item.label}</span>
                        <span className="text-cos-muted">
                          {item.count} post{item.count === 1 ? "" : "s"} ·{" "}
                          {formatInsightsNumber(item.engagement)} eng · {item.percent}%
                        </span>
                      </div>
                      <div className="h-2 bg-cos-bg">
                        <div
                          className="h-full bg-cos-accent"
                          style={{ width: `${item.percent}%` }}
                        />
                      </div>
                    </div>
                  ))}
                  <p className="pt-2 text-[11px] text-cos-muted">
                    Based on synced post insights in this date range.
                  </p>
                </div>
              ) : (
                <p className="text-sm text-cos-muted">
                  No post-level insights stored for this period.
                </p>
              )}
            </InsightsSectionCard>

            <PlatformComparison platforms={data.platformComparison} />
          </div>

          <TopPerformingPosts posts={data.topPosts} />

          {!showSyncEmpty ? (
            <div className="flex justify-end">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleSync}
                disabled={isPending || data.syncInProgress}
              >
                {isPending || data.syncInProgress ? "Syncing…" : "Refresh from Meta"}
              </Button>
            </div>
          ) : null}

          <InsightsAiFooter recommendation={data.recommendation} />
        </>
      ) : null}
    </div>
  );
}
