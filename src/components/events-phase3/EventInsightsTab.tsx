"use client";

import Link from "next/link";
import {
  ArrowDownRight,
  ArrowUpRight,
  Eye,
  Heart,
  Info,
  Link2,
  MessageCircle,
  RefreshCw,
  Users,
} from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { PlatformIcon } from "@/components/insights/PlatformIcon";
import { Button } from "@/components/ui/Button";
import { useEventTabMutationRefresh } from "@/components/events-phase3/EventDetailTabInvalidation";
import { syncInsightsAction } from "@/lib/insights/actions";
import { formatEventInsightsSyncLabel, formatInsightsNumber } from "@/lib/insights/format";
import {
  buildIntegrationSettingsPath,
  buildMetaOAuthStartPath,
} from "@/lib/integrations/oauth";
import type {
  EventInsightsKpiKey,
  EventInsightsPageData,
  EventInsightsViewsSeriesPoint,
} from "@/lib/insights/types";
import { cn } from "@/lib/utils/cn";

interface EventInsightsTabProps {
  data: EventInsightsPageData;
}

const KPI_META: Array<{
  key: EventInsightsKpiKey;
  label: string;
  info: string;
  icon: typeof Eye;
}> = [
  {
    key: "views",
    label: "Views",
    info: "Total media views across published posts for this event.",
    icon: Eye,
  },
  {
    key: "reach",
    label: "Reach",
    info: "Unique accounts that saw these posts (Meta unique view / reach).",
    icon: Users,
  },
  {
    key: "interactions",
    label: "Interactions",
    info: "Likes, comments, and shares combined.",
    icon: MessageCircle,
  },
  {
    key: "linkClicks",
    label: "Link clicks",
    info: "Clicks on links in these posts (when Meta reports them).",
    icon: Link2,
  },
  {
    key: "likes",
    label: "Likes",
    info: "Reactions / likes on published posts for this event.",
    icon: Heart,
  },
];

function EventViewsChart({
  series,
  mode,
  posts,
}: {
  series: EventInsightsViewsSeriesPoint[] | null;
  mode: "total" | "by-post";
  posts: EventInsightsPageData["posts"];
}) {
  if (mode === "by-post") {
    if (posts.length === 0) {
      return (
        <p className="flex h-48 items-center justify-center text-sm text-cos-muted">
          No posts to break down yet.
        </p>
      );
    }

    const maxViews = Math.max(1, ...posts.map((post) => post.views));
    return (
      <ul className="space-y-3" data-testid="event-insights-by-post">
        {posts.map((post) => (
          <li key={post.id} className="space-y-1">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="truncate text-cos-text">
                {post.captionSnippet ?? post.title}
              </span>
              <span className="shrink-0 tabular-nums text-cos-muted">
                {formatInsightsNumber(post.views)}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-cos-bg">
              <div
                className="h-full rounded-full bg-cos-brand-navy/80"
                style={{ width: `${(post.views / maxViews) * 100}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    );
  }

  if (!series || series.length < 2) {
    return (
      <p
        className="flex h-48 items-center justify-center text-sm text-cos-muted"
        data-testid="event-insights-chart-empty"
      >
        Daily view trends need at least two dated posts. Use By post for a
        breakdown of period totals.
      </p>
    );
  }

  const width = 560;
  const height = 200;
  const paddingX = 24;
  const paddingY = 16;
  const maxValue = Math.max(
    1,
    ...series.flatMap((point) => [point.eventViews, point.typicalViews]),
  );

  function pathFor(values: number[]): string {
    const innerWidth = width - paddingX * 2;
    const innerHeight = height - paddingY * 2;
    const step = values.length > 1 ? innerWidth / (values.length - 1) : 0;
    return values
      .map((value, index) => {
        const x = paddingX + index * step;
        const y =
          paddingY +
          innerHeight -
          (maxValue > 0 ? value / maxValue : 0) * innerHeight;
        return `${index === 0 ? "M" : "L"}${x},${y}`;
      })
      .join(" ");
  }

  const eventPath = pathFor(series.map((point) => point.eventViews));
  const typicalPath = pathFor(series.map((point) => point.typicalViews));

  return (
    <div data-testid="event-insights-views-chart">
      <div className="mb-2 flex flex-wrap items-center gap-4 text-xs text-cos-muted">
        <span className="inline-flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-cos-brand-navy" />
          This event
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-cos-muted/50" />
          Typical
        </span>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="block h-48 w-full"
        role="img"
        aria-label="Views over time for this event versus typical"
        preserveAspectRatio="xMidYMid meet"
      >
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const y = paddingY + (height - paddingY * 2) * ratio;
          return (
            <line
              key={ratio}
              x1={paddingX}
              x2={width - paddingX}
              y1={y}
              y2={y}
              stroke="rgba(42,38,34,0.08)"
            />
          );
        })}
        <path
          d={typicalPath}
          fill="none"
          stroke="#a8a29e"
          strokeWidth="2"
          strokeOpacity="0.85"
        />
        <path
          d={eventPath}
          fill="none"
          stroke="#2a2622"
          strokeWidth="2.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <div className="mt-1 flex justify-between text-[11px] text-cos-muted">
        {series.map((point) => (
          <span key={point.date}>Day {point.dayIndex}</span>
        ))}
      </div>
    </div>
  );
}

function PostRow({
  post,
}: {
  post: EventInsightsPageData["posts"][number];
}) {
  const content = (
    <>
      <div className="flex min-w-0 items-center gap-2.5">
        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-cos-bg">
          {post.thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- remote Meta/event artwork URLs vary by storage host
            <img
              src={post.thumbnailUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-cos-muted">
              <Eye className="h-4 w-4" aria-hidden />
            </span>
          )}
        </div>
        <span className="line-clamp-2 text-sm text-cos-text">
          {post.captionSnippet ?? post.title}
        </span>
      </div>
      <PlatformIcon platform={post.platform} className="h-5 w-5 justify-self-center" />
      <span className="text-sm tabular-nums text-cos-muted">
        {formatInsightsNumber(post.views)}
      </span>
      <span className="text-sm tabular-nums text-cos-muted">
        {formatInsightsNumber(post.likes)}
      </span>
    </>
  );

  const className =
    "grid grid-cols-[minmax(0,1fr)_2rem_3.5rem_3.5rem] items-center gap-2 border-b border-cos-border/70 py-3 last:border-0";

  if (post.externalUrl) {
    return (
      <a
        href={post.externalUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(className, "hover:bg-cos-bg/50")}
      >
        {content}
      </a>
    );
  }

  return <div className={className}>{content}</div>;
}

export function EventInsightsTab({ data }: EventInsightsTabProps) {
  const [mode, setMode] = useState<"total" | "by-post">("total");
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const refreshInsightsTab = useEventTabMutationRefresh("insights");

  const returnTo = `/events/${encodeURIComponent(data.eventId)}?tab=insights`;
  const syncLabel = useMemo(
    () => formatEventInsightsSyncLabel(data.lastSyncAt),
    [data.lastSyncAt],
  );

  function handleSync() {
    setSyncMessage(null);
    startTransition(async () => {
      const result = await syncInsightsAction();
      if (!result.ok) {
        setSyncMessage(result.error ?? "Sync failed.");
        return;
      }
      setSyncMessage(
        result.postsSynced > 0
          ? `Synced ${result.postsSynced} post${result.postsSynced === 1 ? "" : "s"}.`
          : "Sync complete.",
      );
      await refreshInsightsTab();
    });
  }

  if (data.emptyState === "connect") {
    return (
      <div
        className="flex flex-col items-center rounded-xl border border-cos-border bg-cos-card px-6 py-14 text-center shadow-sm"
        data-testid="event-insights-empty-connect"
      >
        <h2 className="font-display text-2xl text-cos-text">
          Connect Meta to see Insights
        </h2>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-cos-muted">
          Event Insights use the same Meta connection as publishing and the org
          Insights hub. Connect once to pull views, reach, and interactions for
          this event&apos;s posts.
        </p>
        <Button href={buildMetaOAuthStartPath({ returnTo })} className="mt-6">
          Connect with Facebook
        </Button>
        <p className="mt-3 text-xs text-cos-muted">
          Or manage in{" "}
          <Link
            href={buildIntegrationSettingsPath("meta", returnTo)}
            className="font-medium text-cos-accent hover:text-cos-muted"
          >
            Meta settings
          </Link>
          .
        </p>
      </div>
    );
  }

  if (data.emptyState === "no_posts") {
    return (
      <div
        className="flex flex-col items-center rounded-xl border border-cos-border bg-cos-card px-6 py-14 text-center shadow-sm"
        data-testid="event-insights-empty-no-posts"
      >
        <h2 className="font-display text-2xl text-cos-text">
          No published posts yet
        </h2>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-cos-muted">
          Insights appear after posts for this event are published to Facebook
          or Instagram through Hey Ralli.
        </p>
      </div>
    );
  }

  if (data.emptyState === "sync") {
    return (
      <div
        className="flex flex-col items-center rounded-xl border border-cos-border bg-cos-card px-6 py-14 text-center shadow-sm"
        data-testid="event-insights-empty-sync"
      >
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-cos-bg text-cos-muted">
          <RefreshCw className="h-5 w-5" strokeWidth={1.75} />
        </span>
        <h2 className="font-display mt-4 text-2xl text-cos-text">
          Sync insights from Meta
        </h2>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-cos-muted">
          This event has {data.publishedSlotCount} published post
          {data.publishedSlotCount === 1 ? "" : "s"}, but metrics haven&apos;t
          been pulled yet. Sync to load views, reach, and interactions.
        </p>
        {data.connection.missingInsightsScopes.length > 0 ? (
          <p className="mt-3 max-w-md text-xs text-cos-warning-text">
            Missing scopes: {data.connection.missingInsightsScopes.join(", ")}.
            Reconnect Meta, then sync again.
          </p>
        ) : null}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Button onClick={handleSync} disabled={isPending || data.syncInProgress}>
            {isPending || data.syncInProgress ? "Syncing…" : "Sync now"}
          </Button>
          <Link
            href="/insights"
            className="text-sm text-cos-muted hover:text-cos-text"
          >
            Open org Insights
          </Link>
        </div>
        {syncMessage ? (
          <p className="mt-3 text-sm text-cos-muted" role="status">
            {syncMessage}
          </p>
        ) : null}
      </div>
    );
  }

  const interactions = data.kpis.interactions;
  const likes = data.kpis.likes;
  const comments = data.posts.reduce((sum, post) => sum + post.comments, 0);
  const shares = data.posts.reduce((sum, post) => sum + post.shares, 0);
  const ComparisonIcon =
    data.comparison?.direction === "more" ? ArrowUpRight : ArrowDownRight;

  return (
    <div className="space-y-5" data-testid="event-insights-panel">
      <div
        className="grid grid-cols-2 gap-3 lg:grid-cols-5"
        data-testid="event-insights-kpi-strip"
      >
        {KPI_META.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div
              key={kpi.key}
              className="rounded-2xl bg-cos-bg-alt px-4 py-4 shadow-[0_1px_0_rgba(255,252,247,0.9)_inset,0_2px_4px_rgba(42,38,34,0.06),0_10px_22px_rgba(42,38,34,0.08)] ring-1 ring-black/[0.04]"
              data-testid={`event-insights-kpi-${kpi.key}`}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="inline-flex items-center gap-1 text-xs font-medium tracking-wide text-cos-muted uppercase">
                  {kpi.label}
                  <span title={kpi.info} className="text-cos-muted/80">
                    <Info className="h-3 w-3" aria-label={kpi.info} />
                  </span>
                </p>
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-cos-accent-soft text-cos-accent">
                  <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                </span>
              </div>
              <p className="mt-3 font-display text-3xl leading-none text-cos-text tabular-nums">
                {formatInsightsNumber(data.kpis[kpi.key])}
              </p>
            </div>
          );
        })}
      </div>

      {data.comparison ? (
        <div
          className={cn(
            "flex items-start gap-3 rounded-xl border px-4 py-3",
            data.comparison.direction === "more"
              ? "border-cos-success/25 bg-cos-success-bg/70"
              : "border-cos-border bg-cos-bg/60",
          )}
          data-testid="event-insights-comparison"
          role="status"
        >
          <ComparisonIcon
            className={cn(
              "mt-0.5 h-5 w-5 shrink-0",
              data.comparison.direction === "more"
                ? "text-cos-success"
                : "text-cos-muted",
            )}
            aria-hidden
          />
          <p className="text-sm text-cos-text">
            {data.comparison.messageBefore}
            <span
              className={cn(
                "font-semibold",
                data.comparison.direction === "more"
                  ? "text-cos-success-text"
                  : "text-cos-text",
              )}
            >
              {data.comparison.highlight}
            </span>
            {data.comparison.messageAfter}
          </p>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <section className="rounded-xl border border-cos-border bg-cos-card p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-cos-text">Views</h2>
              <p className="mt-1 font-display text-3xl text-cos-text tabular-nums">
                {formatInsightsNumber(data.kpis.views)}
              </p>
            </div>
            <div
              className="inline-flex rounded-lg bg-cos-bg p-0.5"
              role="group"
              aria-label="Views breakdown"
            >
              {(
                [
                  ["total", "Total"],
                  ["by-post", "By post"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setMode(value)}
                  aria-pressed={mode === value}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                    mode === value
                      ? "bg-cos-accent-soft text-cos-text shadow-sm"
                      : "text-cos-muted hover:text-cos-text",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-4">
            <EventViewsChart
              series={data.viewsSeries}
              mode={mode}
              posts={data.posts}
            />
          </div>
        </section>

        <div className="space-y-4">
          <section className="rounded-xl border border-cos-border bg-cos-card p-5 shadow-sm sm:p-6">
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="text-sm font-semibold text-cos-text">
                Interactions
              </h2>
              <p className="font-display text-2xl text-cos-text tabular-nums">
                {formatInsightsNumber(interactions)}
              </p>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-[11px] tracking-wide text-cos-muted uppercase">
                  Likes
                </p>
                <p className="mt-1 font-display text-xl text-cos-text tabular-nums">
                  {formatInsightsNumber(likes)}
                </p>
              </div>
              <div>
                <p className="text-[11px] tracking-wide text-cos-muted uppercase">
                  Comments
                </p>
                <p className="mt-1 font-display text-xl text-cos-text tabular-nums">
                  {formatInsightsNumber(comments)}
                </p>
              </div>
              <div>
                <p className="text-[11px] tracking-wide text-cos-muted uppercase">
                  Shares
                </p>
                <p className="mt-1 font-display text-xl text-cos-text tabular-nums">
                  {formatInsightsNumber(shares)}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-cos-border bg-cos-card p-5 shadow-sm sm:p-6">
            <h2 className="text-sm font-semibold text-cos-text">
              Posts for this event
            </h2>
            {data.posts.length === 0 ? (
              <p className="mt-3 text-sm text-cos-muted">
                No post metrics available yet.
              </p>
            ) : (
              <div className="mt-3" data-testid="event-insights-posts">
                <div className="grid grid-cols-[minmax(0,1fr)_2rem_3.5rem_3.5rem] gap-2 border-b border-cos-border pb-2 text-[11px] tracking-wide text-cos-muted uppercase">
                  <span>Post</span>
                  <span className="sr-only">Platform</span>
                  <span>Views</span>
                  <span>Likes</span>
                </div>
                {data.posts.map((post) => (
                  <PostRow key={post.id} post={post} />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-xs text-cos-muted">
        <p data-testid="event-insights-sync-footer">
          Synced from Meta · Last sync: {syncLabel}
        </p>
        <button
          type="button"
          onClick={handleSync}
          disabled={isPending || data.syncInProgress}
          className="inline-flex items-center gap-1 font-medium text-cos-accent hover:text-cos-text disabled:opacity-50"
        >
          <RefreshCw
            className={cn("h-3.5 w-3.5", isPending && "animate-spin")}
            aria-hidden
          />
          {isPending ? "Syncing…" : "Refresh"}
        </button>
        <Link href="/insights" className="hover:text-cos-text">
          Org Insights
        </Link>
      </div>
      {syncMessage ? (
        <p className="text-center text-sm text-cos-muted" role="status">
          {syncMessage}
        </p>
      ) : null}
    </div>
  );
}
