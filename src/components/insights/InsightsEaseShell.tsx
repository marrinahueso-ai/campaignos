"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { EventDetailInsightsEasePanel } from "@/components/events-phase3/EventDetailInsightsEasePanel";
import { ConnectionHealthBanner } from "@/components/insights/ConnectionHealthBanner";
import { InsightsRecommendationsDrawer } from "@/components/insights/InsightsRecommendationsDrawer";
import { MetricSparkline } from "@/components/insights/MetricSparkline";
import {
  loadEventInsightsAction,
  loadInsightsPageDataAction,
  syncInsightsAction,
} from "@/lib/insights/actions";
import {
  INSIGHTS_DATE_PRESETS,
  addDays,
  formatDateRangeLabel,
  formatDateYmd,
} from "@/lib/insights/date-range";
import {
  formatChangePercent,
  formatInsightsNumber,
  formatLastSyncTitle,
} from "@/lib/insights/format";
import {
  buildIntegrationSettingsPath,
  buildMetaOAuthStartPath,
} from "@/lib/integrations/oauth";
import type {
  EventInsightsPageData,
  InsightsKpiKey,
  InsightsPageData,
  InsightsPlatform,
  InsightsTimeSeriesPoint,
  InsightsTopPost,
} from "@/lib/insights/types";
import { cn } from "@/lib/utils/cn";

type InsightsEaseView = "org" | "connect" | "event";

export type InsightsEventOption = {
  id: string;
  title: string;
  date: string | null;
};

const VIEW_OPTIONS: { id: InsightsEaseView; label: string }[] = [
  { id: "org", label: "Org Insights" },
  { id: "connect", label: "Connect Meta" },
  { id: "event", label: "Event Insights" },
];

const PLATFORM_OPTIONS: { id: InsightsPlatform; label: string }[] = [
  { id: "all", label: "All" },
  { id: "facebook", label: "Facebook" },
  { id: "instagram", label: "Instagram" },
];

type TopContentSort =
  | "views"
  | "newest"
  | "oldest"
  | "reactions"
  | "comments"
  | "shares"
  | "engagement";

const TOP_CONTENT_SORT_OPTIONS: { id: TopContentSort; label: string }[] = [
  { id: "views", label: "Highest views" },
  { id: "newest", label: "Newest" },
  { id: "oldest", label: "Oldest" },
  { id: "reactions", label: "Most reactions" },
  { id: "comments", label: "Most comments" },
  { id: "shares", label: "Most shares" },
  { id: "engagement", label: "Most engagement" },
];

const DATE_PILL_LABELS: Record<string, string> = {
  "7d": "7 days",
  "14d": "14 days",
  "28d": "28 days",
  "30d": "30 days",
};

const KPI_ORDER: InsightsKpiKey[] = [
  "views",
  "reach",
  "engagement",
  "likes",
  "comments",
];

const THUMB_TONES = [
  "linear-gradient(135deg, rgba(47,74,60,0.92), rgba(42,122,134,0.55)), #2f4a3c",
  "linear-gradient(135deg, rgba(196,146,46,0.9), rgba(166,90,58,0.55)), #c4922e",
  "linear-gradient(135deg, rgba(42,122,134,0.9), rgba(107,129,113,0.55)), #2a7a86",
] as const;

function parsePlatform(value: string | null): InsightsPlatform {
  if (value === "facebook" || value === "instagram") return value;
  return "all";
}

function parseTopContentSort(value: string | null): TopContentSort {
  if (
    value === "views" ||
    value === "newest" ||
    value === "oldest" ||
    value === "reactions" ||
    value === "comments" ||
    value === "shares" ||
    value === "engagement"
  ) {
    return value;
  }
  return "views";
}

function parseInsightsView(
  value: string | null,
  metaConnected: boolean,
): InsightsEaseView {
  if (value === "org" || value === "connect" || value === "event") return value;
  return metaConnected ? "org" : "connect";
}

function metricOrZero(value: number | null | undefined): number {
  return value ?? 0;
}

function publishedAtMs(iso: string | null): number {
  if (!iso) return 0;
  const ms = new Date(iso).getTime();
  return Number.isNaN(ms) ? 0 : ms;
}

function sortTopPosts(
  posts: InsightsTopPost[],
  sort: TopContentSort,
): InsightsTopPost[] {
  const next = [...posts];
  next.sort((a, b) => {
    switch (sort) {
      case "newest":
        return publishedAtMs(b.publishedAt) - publishedAtMs(a.publishedAt);
      case "oldest":
        return publishedAtMs(a.publishedAt) - publishedAtMs(b.publishedAt);
      case "reactions":
        return metricOrZero(b.likes) - metricOrZero(a.likes);
      case "comments":
        return metricOrZero(b.comments) - metricOrZero(a.comments);
      case "shares":
        return metricOrZero(b.shares) - metricOrZero(a.shares);
      case "engagement":
        return metricOrZero(b.engagement) - metricOrZero(a.engagement);
      case "views":
      default: {
        const viewsDelta = metricOrZero(b.views) - metricOrZero(a.views);
        if (viewsDelta !== 0) return viewsDelta;
        return metricOrZero(b.engagement) - metricOrZero(a.engagement);
      }
    }
  });
  return next;
}

function formatEventPickerLabel(event: InsightsEventOption): string {
  if (!event.date) return event.title;
  const parsed = new Date(`${event.date}T12:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return event.title;
  const label = parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
  return `${event.title} · ${label}`;
}

function filterTopPosts(
  posts: InsightsPageData["topPosts"],
  platform: InsightsPlatform,
) {
  if (platform === "all") return posts;
  return posts.filter((post) => post.platform === platform);
}

function filterKpisForPlatform(
  data: InsightsPageData,
  platform: InsightsPlatform,
): InsightsPageData["kpis"] {
  if (platform === "all") return data.kpis;

  return data.kpis.map((kpi) => {
    const series = data.timeSeries[platform];
    const sparkline = series.map((point) => valueForMetric(point, kpi.key));
    const value = sparkline.reduce((sum, entry) => sum + entry, 0);
    return {
      ...kpi,
      value,
      sparkline,
      changePercent: null,
      previousValue: null,
    };
  });
}

function valueForMetric(
  point: InsightsTimeSeriesPoint,
  metric: InsightsKpiKey,
): number {
  switch (metric) {
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
}

function buildSvgPath(
  values: number[],
  width: number,
  height: number,
  paddingX: number,
  paddingY: number,
  maxValue: number,
): { line: string; area: string } {
  if (values.length === 0) return { line: "", area: "" };

  const innerWidth = width - paddingX * 2;
  const innerHeight = height - paddingY * 2;
  const step = values.length > 1 ? innerWidth / (values.length - 1) : 0;
  const coords = values.map((value, index) => {
    const x = paddingX + index * step;
    const normalized = maxValue > 0 ? value / maxValue : 0;
    const y = paddingY + innerHeight - normalized * innerHeight;
    return { x, y };
  });

  const line = coords
    .map((point, index) => `${index === 0 ? "M" : "L"}${point.x},${point.y}`)
    .join(" ");
  const last = coords[coords.length - 1]!;
  const first = coords[0]!;
  const area = `${line} L${last.x},${paddingY + innerHeight} L${first.x},${paddingY + innerHeight} Z`;
  return { line, area };
}

function pickDateTicks(
  dates: string[],
  maxLabels = 4,
): Array<{ index: number; label: string }> {
  if (dates.length === 0) return [];
  if (dates.length <= maxLabels) {
    return dates.map((date, index) => ({
      index,
      label: formatAxisDate(date),
    }));
  }
  const last = dates.length - 1;
  const ticks: Array<{ index: number; label: string }> = [];
  for (let i = 0; i < maxLabels; i += 1) {
    const index = Math.round((i * last) / (maxLabels - 1));
    ticks.push({ index, label: formatAxisDate(dates[index]!) });
  }
  return ticks;
}

function formatAxisDate(date: string): string {
  const parsed = new Date(`${date}T12:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return date.slice(5);
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function formatPublishedAt(iso: string | null): string {
  if (!iso) return "Unpublished date";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Unpublished date";
  const month = date.toLocaleString("en-US", { month: "short" });
  const day = date.getDate();
  const time = date
    .toLocaleString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
    .replace(/\s/g, " ");
  return `Published ${month} ${day} · ${time}`;
}

function postInitials(post: InsightsTopPost): string {
  const source = (post.captionSnippet ?? post.title).trim();
  if (!source) return post.platform === "instagram" ? "IG" : "FB";
  const words = source.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return `${words[0]![0] ?? ""}${words[1]![0] ?? ""}`.toUpperCase();
  }
  return source.slice(0, 4);
}

function TopContentCarousel({ posts }: { posts: InsightsTopPost[] }) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  function updateScrollState() {
    const el = scrollerRef.current;
    if (!el) {
      setCanScrollLeft(false);
      setCanScrollRight(false);
      return;
    }
    const maxScroll = el.scrollWidth - el.clientWidth;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(maxScroll - el.scrollLeft > 4);
  }

  useEffect(() => {
    updateScrollState();
    const el = scrollerRef.current;
    if (!el) return;
    const onScroll = () => updateScrollState();
    el.addEventListener("scroll", onScroll, { passive: true });
    if (typeof ResizeObserver === "undefined") {
      return () => el.removeEventListener("scroll", onScroll);
    }
    const observer = new ResizeObserver(() => updateScrollState());
    observer.observe(el);
    return () => {
      el.removeEventListener("scroll", onScroll);
      observer.disconnect();
    };
  }, [posts]);

  function scrollByCard(direction: -1 | 1) {
    const el = scrollerRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>("[data-top-content-card]");
    const step = card ? card.offsetWidth + 12 : 300;
    el.scrollBy({ left: direction * step, behavior: "smooth" });
  }

  return (
    <div className="relative">
      {canScrollLeft ? (
        <button
          type="button"
          onClick={() => scrollByCard(-1)}
          className="absolute top-1/2 left-0 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-cos-border bg-cos-card text-cos-text shadow-[0_8px_28px_rgba(28,36,48,0.06)] transition-opacity hover:bg-[#f6f2eb]"
          aria-label="Scroll top content left"
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={1.75} />
        </button>
      ) : null}
      {canScrollRight ? (
        <button
          type="button"
          onClick={() => scrollByCard(1)}
          className="absolute top-1/2 right-0 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-cos-border bg-cos-card text-cos-text shadow-[0_8px_28px_rgba(28,36,48,0.06)] transition-opacity hover:bg-[#f6f2eb]"
          aria-label="Scroll top content right"
        >
          <ChevronRight className="h-4 w-4" strokeWidth={1.75} />
        </button>
      ) : null}

      <div
        ref={scrollerRef}
        className={cn(
          "-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth px-1 pb-1",
          "[scrollbar-width:thin]",
        )}
        aria-label="Top content posts"
      >
        {posts.map((post, index) => (
          <article
            key={post.id}
            data-top-content-card
            className="flex w-[min(19rem,85vw)] shrink-0 snap-start flex-col overflow-hidden rounded-[18px] border border-cos-border bg-[#f6f2eb] transition-transform hover:-translate-y-0.5 hover:bg-cos-card hover:shadow-[0_8px_28px_rgba(28,36,48,0.06)]"
          >
            <div
              className="relative grid aspect-[16/10] place-items-center font-display text-[28px] font-semibold text-[#f6f2eb]"
              style={{
                background: THUMB_TONES[index % THUMB_TONES.length],
              }}
              aria-hidden
            >
              {post.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- remote Meta artwork URLs vary by host
                <img
                  src={post.thumbnailUrl}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                postInitials(post)
              )}
              <span className="absolute top-2.5 left-2.5 inline-flex items-center gap-1.5 rounded-full bg-[rgba(255,252,247,0.92)] px-2.5 py-1 text-[11px] font-extrabold text-cos-text">
                <i
                  className={cn(
                    "inline-block h-1.5 w-1.5 rounded-full",
                    post.platform === "facebook"
                      ? "bg-[#1877f2]"
                      : "bg-[#c13584]",
                  )}
                />
                {post.platform === "facebook" ? "Facebook" : "Instagram"}
              </span>
            </div>
            <div className="px-3.5 pt-3 pb-3.5">
              <h3 className="line-clamp-2 text-sm font-bold leading-snug text-cos-text">
                {post.captionSnippet ?? post.title}
              </h3>
              <p className="mt-1.5 text-xs font-semibold text-cos-muted">
                {formatPublishedAt(post.publishedAt)}
              </p>
              <div className="mt-3 flex flex-wrap gap-x-3 gap-y-2 text-xs font-bold text-cos-muted">
                <span>
                  {formatInsightsNumber(post.views ?? 0)}
                  <em className="ml-1 font-semibold not-italic text-cos-muted">
                    views
                  </em>
                </span>
                <span>
                  {formatInsightsNumber(post.likes ?? 0)}
                  <em className="ml-1 font-semibold not-italic text-cos-muted">
                    reactions
                  </em>
                </span>
                <span>
                  {formatInsightsNumber(post.comments ?? 0)}
                  <em className="ml-1 font-semibold not-italic text-cos-muted">
                    comments
                  </em>
                </span>
                <span>
                  {formatInsightsNumber(post.shares ?? 0)}
                  <em className="ml-1 font-semibold not-italic text-cos-muted">
                    shares
                  </em>
                </span>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function findBestDay(
  series: InsightsTimeSeriesPoint[],
  metric: InsightsKpiKey,
): { value: number; date: string } | null {
  if (series.length === 0) return null;
  let best = series[0]!;
  let bestValue = valueForMetric(best, metric);
  for (const point of series.slice(1)) {
    const value = valueForMetric(point, metric);
    if (value > bestValue) {
      best = point;
      bestValue = value;
    }
  }
  if (bestValue <= 0) return null;
  return { value: bestValue, date: best.date };
}

function activePresetId(from: string, to: string): string | null {
  for (const preset of INSIGHTS_DATE_PRESETS) {
    const end = new Date();
    end.setUTCHours(12, 0, 0, 0);
    const start = addDays(end, -(preset.days - 1));
    if (from === formatDateYmd(start) && to === formatDateYmd(end)) {
      return preset.id;
    }
  }
  return null;
}

interface InsightsEaseShellProps {
  data: InsightsPageData;
  events?: InsightsEventOption[];
  eventInsights?: EventInsightsPageData | null;
  initialEventId?: string | null;
}

export function InsightsEaseShell({
  data,
  events = [],
  eventInsights = null,
  initialEventId = null,
}: InsightsEaseShellProps) {
  const searchParams = useSearchParams();
  // Local chrome + page payload — URL synced via history.replaceState
  // (router.replace would refetch the whole RSC Insights page and feel laggy),
  // same pattern as TasksEaseShell / FilesEaseShell.
  const [pageData, setPageData] = useState<InsightsPageData>(data);
  const [dateFrom, setDateFrom] = useState(data.dateRange.from);
  const [dateTo, setDateTo] = useState(data.dateRange.to);
  const [dataLoading, setDataLoading] = useState(false);
  const rangeRequestIdRef = useRef(0);
  const eventRequestIdRef = useRef(0);
  const [view, setView] = useState<InsightsEaseView>(() =>
    parseInsightsView(
      searchParams.get("view"),
      data.connection.metaConnected,
    ),
  );
  const [selectedEventId, setSelectedEventId] = useState<string | null>(
    () => searchParams.get("event") ?? initialEventId,
  );
  const [eventPanelData, setEventPanelData] =
    useState<EventInsightsPageData | null>(eventInsights);
  const [eventLoading, setEventLoading] = useState(false);
  const [platformFilter, setPlatformFilter] = useState<InsightsPlatform>(() =>
    parsePlatform(searchParams.get("platform")),
  );
  const [contentSort, setContentSort] = useState<TopContentSort>(() =>
    parseTopContentSort(searchParams.get("contentSort")),
  );
  const [selectedMetric, setSelectedMetric] = useState<InsightsKpiKey>("views");
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [recOpen, setRecOpen] = useState(false);
  const [whyOpen, setWhyOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const exportHref = `/api/insights/export?from=${encodeURIComponent(dateFrom)}&to=${encodeURIComponent(dateTo)}`;
  const showConnectEmpty = !pageData.connection.metaConnected;
  const showSyncEmpty =
    pageData.connection.metaConnected &&
    !pageData.hasAnyMetrics &&
    !pageData.syncInProgress;
  const activeRange = activePresetId(dateFrom, dateTo);
  const topContentTitle =
    TOP_CONTENT_SORT_OPTIONS.find((option) => option.id === contentSort)
      ?.label ?? "Highest views";
  const selectedEvent =
    events.find((event) => event.id === selectedEventId) ?? events[0] ?? null;

  useEffect(() => {
    setPageData(data);
    setDateFrom(data.dateRange.from);
    setDateTo(data.dateRange.to);
  }, [data]);

  useEffect(() => {
    setEventPanelData(eventInsights);
  }, [eventInsights]);

  useEffect(() => {
    if (initialEventId && !selectedEventId) {
      setSelectedEventId(initialEventId);
    }
  }, [initialEventId, selectedEventId]);

  const filteredKpis = useMemo(
    () => filterKpisForPlatform(pageData, platformFilter),
    [pageData, platformFilter],
  );
  const orderedKpis = useMemo(() => {
    const byKey = new Map(filteredKpis.map((kpi) => [kpi.key, kpi]));
    return KPI_ORDER.map((key) => byKey.get(key)).filter(
      (kpi): kpi is NonNullable<typeof kpi> => Boolean(kpi),
    );
  }, [filteredKpis]);

  const filteredTopPosts = useMemo(
    () =>
      sortTopPosts(
        filterTopPosts(pageData.topPosts, platformFilter),
        contentSort,
      ),
    [pageData.topPosts, platformFilter, contentSort],
  );

  const series = pageData.timeSeries[platformFilter];
  const metricValues = series.map((point) => valueForMetric(point, selectedMetric));
  const selectedKpi =
    orderedKpis.find((kpi) => kpi.key === selectedMetric) ?? orderedKpis[0] ?? null;
  const bestDay = findBestDay(series, selectedMetric);
  const chartMax = Math.max(1, ...metricValues, 0);
  const chartPaths = buildSvgPath(metricValues, 560, 200, 40, 20, chartMax);
  const dateTicks = pickDateTicks(series.map((point) => point.date));
  const hasChartSignal = metricValues.some((value) => value > 0);

  function syncChromeUrl(next: {
    view: InsightsEaseView;
    platform: InsightsPlatform;
    eventId: string | null;
    contentSort: TopContentSort;
    from: string;
    to: string;
  }) {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    params.set("view", next.view);
    params.set("from", next.from);
    params.set("to", next.to);
    params.delete("range");
    if (next.platform === "all") params.delete("platform");
    else params.set("platform", next.platform);
    if (next.eventId) params.set("event", next.eventId);
    else params.delete("event");
    if (next.contentSort === "views") params.delete("contentSort");
    else params.set("contentSort", next.contentSort);
    const query = params.toString();
    const href = query ? `/insights?${query}` : "/insights";
    window.history.replaceState(window.history.state, "", href);
  }

  function chromeSnapshot(overrides?: {
    view?: InsightsEaseView;
    platform?: InsightsPlatform;
    eventId?: string | null;
    contentSort?: TopContentSort;
    from?: string;
    to?: string;
  }) {
    return {
      view: overrides?.view ?? view,
      platform: overrides?.platform ?? platformFilter,
      eventId: overrides?.eventId !== undefined ? overrides.eventId : selectedEventId,
      contentSort: overrides?.contentSort ?? contentSort,
      from: overrides?.from ?? dateFrom,
      to: overrides?.to ?? dateTo,
    };
  }

  function handleViewChange(next: InsightsEaseView) {
    const eventId =
      next === "event"
        ? selectedEventId ?? events[0]?.id ?? null
        : selectedEventId;
    setView(next);
    if (next === "event" && eventId && eventId !== selectedEventId) {
      setSelectedEventId(eventId);
    }
    syncChromeUrl(chromeSnapshot({ view: next, eventId }));
    // View chrome is client-only; fetch event panel only when missing.
    if (
      next === "event" &&
      eventId &&
      eventPanelData?.eventId !== eventId
    ) {
      const requestId = ++eventRequestIdRef.current;
      setEventLoading(true);
      startTransition(async () => {
        const nextData = await loadEventInsightsAction(eventId);
        if (requestId !== eventRequestIdRef.current) return;
        setEventPanelData(nextData);
        setEventLoading(false);
      });
    }
  }

  function handlePlatformChange(platform: InsightsPlatform) {
    setPlatformFilter(platform);
    syncChromeUrl(chromeSnapshot({ platform }));
  }

  function handleContentSortChange(next: TopContentSort) {
    setContentSort(next);
    syncChromeUrl(chromeSnapshot({ contentSort: next }));
  }

  function handleEventChange(eventId: string) {
    setSelectedEventId(eventId);
    setView("event");
    syncChromeUrl(chromeSnapshot({ view: "event", eventId }));
    if (eventPanelData?.eventId === eventId) return;
    const requestId = ++eventRequestIdRef.current;
    setEventLoading(true);
    startTransition(async () => {
      const next = await loadEventInsightsAction(eventId);
      if (requestId !== eventRequestIdRef.current) return;
      setEventPanelData(next);
      setEventLoading(false);
    });
  }

  function handleRangeChange(days: number) {
    const end = new Date();
    end.setUTCHours(12, 0, 0, 0);
    const start = addDays(end, -(days - 1));
    const from = formatDateYmd(start);
    const to = formatDateYmd(end);
    if (from === dateFrom && to === dateTo) return;
    // Optimistic chrome: highlight pills immediately; soft-load content only.
    setDateFrom(from);
    setDateTo(to);
    syncChromeUrl(chromeSnapshot({ from, to }));
    const requestId = ++rangeRequestIdRef.current;
    setDataLoading(true);
    startTransition(async () => {
      const next = await loadInsightsPageDataAction({ from, to });
      if (requestId !== rangeRequestIdRef.current) return;
      if (next) setPageData(next);
      setDataLoading(false);
    });
  }

  function handleSync() {
    startTransition(async () => {
      setSyncMessage(null);
      const result = await syncInsightsAction({
        since: dateFrom,
        until: dateTo,
      });
      if (result.ok) {
        setSyncMessage(
          `Synced ${result.daysSynced} day(s) and ${result.postsSynced} post(s) from Meta.`,
        );
        setDataLoading(true);
        const next = await loadInsightsPageDataAction({
          from: dateFrom,
          to: dateTo,
        });
        if (next) setPageData(next);
        setDataLoading(false);
        return;
      }
      setSyncMessage(result.error ?? "Insights sync failed.");
    });
  }

  const metaChipLabel = pageData.connection.pageName
    ? `Meta connected · ${pageData.connection.pageName}`
    : "Meta connected";

  return (
    <div className="relative overflow-hidden rounded-[22px] before:pointer-events-none before:absolute before:top-0 before:left-[-2rem] before:h-60 before:w-60 before:rounded-full before:bg-[radial-gradient(circle,rgba(107,129,113,0.12),transparent_70%)] before:content-[''] after:pointer-events-none after:absolute after:top-10 after:right-0 after:h-52 after:w-52 after:rounded-full after:bg-[radial-gradient(circle,rgba(196,146,46,0.1),transparent_70%)] after:content-['']">
      <div className="relative space-y-4 pb-10">
        <div
          className="inline-flex flex-wrap gap-0.5 rounded-full border border-cos-border bg-[rgba(255,252,247,0.55)] p-[3px]"
          role="tablist"
          aria-label="Insights surfaces"
        >
          {VIEW_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              role="tab"
              aria-selected={view === option.id}
              onClick={() => handleViewChange(option.id)}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-[13px] font-bold transition-colors",
                view === option.id
                  ? "bg-cos-card text-cos-text shadow-[0_8px_28px_rgba(28,36,48,0.06)]"
                  : "text-cos-muted hover:text-cos-text",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        {view === "connect" ? (
          <>
            <header className="flex flex-wrap items-end justify-between gap-3.5">
              <div className="min-w-0">
                <h1 className="font-display text-[clamp(2rem,4vw,2.75rem)] tracking-[-0.02em] text-cos-text">
                  Insights
                </h1>
                <p className="mt-1.5 max-w-[52ch] text-sm leading-relaxed text-cos-muted">
                  See how your school’s Facebook Page and Instagram posts perform
                  — after you connect Meta once.
                </p>
              </div>
            </header>
            <ConnectMetaEmpty
              organizationName={pageData.organizationName}
              whyOpen={whyOpen}
              onToggleWhy={() => setWhyOpen((open) => !open)}
            />
          </>
        ) : null}

        {view === "event" ? (
          <>
            <header className="mb-4 flex flex-wrap items-end justify-between gap-3.5">
              <div className="min-w-0">
                <h1 className="font-display text-[clamp(1.625rem,3vw,2.125rem)] font-semibold tracking-[-0.02em] text-[#2a2622]">
                  {selectedEvent?.title ??
                    eventPanelData?.eventTitle ??
                    "Event Insights"}
                </h1>
                <p className="mt-1.5 max-w-[52ch] text-sm leading-[1.45] text-[#5c554c]">
                  Event → Insights tab — Meta performance for this event’s
                  published posts only. Same org Meta connection.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {events.length > 0 ? (
                  <>
                    <label className="sr-only" htmlFor="insights-event-picker">
                      Event
                    </label>
                    <select
                      id="insights-event-picker"
                      value={selectedEvent?.id ?? ""}
                      onChange={(event) => handleEventChange(event.target.value)}
                      className="max-w-[min(100%,15rem)] rounded-full border border-transparent bg-transparent px-2.5 py-1.5 text-[12px] font-semibold text-[#7a7166] hover:border-[rgba(42,38,34,0.1)] hover:bg-[rgba(255,252,247,0.7)]"
                    >
                      {events.map((event) => (
                        <option key={event.id} value={event.id}>
                          {formatEventPickerLabel(event)}
                        </option>
                      ))}
                    </select>
                  </>
                ) : null}
                <button
                  type="button"
                  onClick={() => handleViewChange("org")}
                  className="inline-flex items-center rounded-full px-3 py-2 text-[13px] font-bold text-[#5c554c] transition-colors hover:text-[#2a2622]"
                >
                  ← Org Insights
                </button>
              </div>
            </header>

            {events.length === 0 ? (
              <div className="mx-auto mt-2 flex max-w-xl flex-col items-center rounded-[22px] border border-[rgba(42,38,34,0.1)] bg-[#fffcf7] px-7 py-12 text-center shadow-[0_8px_28px_rgba(28,36,48,0.06)]">
                <h2 className="font-display text-[28px] font-semibold tracking-[-0.02em] text-[#2a2622]">
                  No events yet
                </h2>
                <p className="mt-2.5 max-w-[38ch] text-sm leading-relaxed text-[#5c554c]">
                  Create an event to see Meta performance for its published posts
                  here.
                </p>
                <Link
                  href="/events"
                  className="mt-5 inline-flex items-center rounded-full bg-[#2a2622] px-[18px] py-[11px] text-[13px] font-bold text-[#fffcf7]"
                >
                  Go to Events
                </Link>
              </div>
            ) : null}

            {events.length > 0 && eventLoading ? (
              <div className="min-h-[16rem] animate-pulse rounded-[22px] bg-[rgba(246,242,235,0.6)]" />
            ) : null}

            {events.length > 0 && !eventLoading && eventPanelData ? (
              <EventDetailInsightsEasePanel
                data={{
                  ...eventPanelData,
                  eventTitle:
                    eventPanelData.eventTitle ||
                    selectedEvent?.title ||
                    "This event",
                }}
                onOpenOrgInsights={() => handleViewChange("org")}
              />
            ) : null}

            {events.length > 0 && !eventLoading && !eventPanelData ? (
              <p className="text-sm text-[#5c554c]" role="status">
                Couldn’t load insights for this event. Try another event or open
                the full event Insights tab.
              </p>
            ) : null}
          </>
        ) : null}

        {view === "org" ? (
          <>
        <header className="flex flex-wrap items-end justify-between gap-3.5">
          <div className="min-w-0">
            <h1 className="font-display text-[clamp(2rem,4vw,2.75rem)] tracking-[-0.02em] text-cos-text">
              Insights
            </h1>
            <p className="mt-1.5 max-w-[52ch] text-sm leading-relaxed text-cos-muted">
              {showConnectEmpty
                ? "See how your school’s Facebook Page and Instagram posts perform — after you connect Meta once."
                : "Organic performance from your Facebook Page and Instagram account — views, reach, and engagement parents actually saw."}
            </p>
          </div>

          {!showConnectEmpty ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-[rgba(47,74,60,0.16)] bg-[rgba(47,74,60,0.08)] px-3 py-1.5 text-xs font-bold text-[#2f4a3c]">
                <span
                  className="h-1.5 w-1.5 rounded-full bg-[#6b8171] shadow-[0_0_0_3px_rgba(107,129,113,0.18)]"
                  aria-hidden
                />
                {metaChipLabel}
              </span>
              <button
                type="button"
                onClick={handleSync}
                disabled={isPending || pageData.syncInProgress}
                title={formatLastSyncTitle(pageData.connection.lastSyncAt)}
                className="inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-cos-border bg-cos-card px-[18px] py-[11px] text-[13px] font-bold text-cos-text transition-transform hover:-translate-y-px disabled:opacity-60"
              >
                <svg
                  viewBox="0 0 24 24"
                  className={cn(
                    "h-4 w-4 stroke-current",
                    (isPending || pageData.syncInProgress) && "animate-spin",
                  )}
                  fill="none"
                  strokeWidth={1.8}
                  aria-hidden
                >
                  <path d="M20 12a8 8 0 1 1-2.3-5.7" />
                  <path d="M20 4v5h-5" />
                </svg>
                {isPending || pageData.syncInProgress ? "Syncing…" : "Refresh"}
              </button>
              <a
                href={exportHref}
                className="inline-flex items-center gap-1.5 rounded-full bg-cos-text px-[18px] py-[11px] text-[13px] font-bold text-[#fffcf7] transition-transform hover:-translate-y-px"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4 stroke-current"
                  fill="none"
                  strokeWidth={1.8}
                  aria-hidden
                >
                  <path d="M12 4v10" />
                  <path d="m8 10 4 4 4-4" />
                  <path d="M5 19h14" />
                </svg>
                Export CSV
              </a>
            </div>
          ) : null}
        </header>

        <ConnectionHealthBanner connection={pageData.connection} />

        {syncMessage ? (
          <p
            className="rounded-full border border-cos-border bg-cos-card px-4 py-2 text-sm text-cos-muted shadow-[0_8px_28px_rgba(28,36,48,0.06)]"
            role="status"
          >
            {syncMessage}
          </p>
        ) : null}

        {showConnectEmpty ? (
          <ConnectMetaEmpty
            organizationName={pageData.organizationName}
            whyOpen={whyOpen}
            onToggleWhy={() => setWhyOpen((open) => !open)}
          />
        ) : null}

        {showSyncEmpty ? (
          <SyncMetaEmpty
            onSync={handleSync}
            syncing={isPending || pageData.syncInProgress}
            missingScopes={pageData.connection.missingInsightsScopes}
          />
        ) : null}

        {!showConnectEmpty && !showSyncEmpty ? (
          <>
            <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2.5">
              <div className="inline-flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-extrabold tracking-[0.08em] text-cos-muted uppercase">
                  Platform
                </span>
                <div
                  className="inline-flex gap-0.5 rounded-full border border-cos-border bg-[rgba(255,252,247,0.7)] p-[3px]"
                  role="group"
                  aria-label="Platform filter"
                >
                  {PLATFORM_OPTIONS.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => handlePlatformChange(option.id)}
                      className={cn(
                        "rounded-full px-3.5 py-1.5 text-[13px] font-bold transition-colors",
                        platformFilter === option.id
                          ? "bg-cos-text text-[#f6f2eb]"
                          : "text-cos-muted hover:text-cos-text",
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="inline-flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-extrabold tracking-[0.08em] text-cos-muted uppercase">
                  Date range
                </span>
                <div
                  className="inline-flex gap-0.5 rounded-full border border-cos-border bg-[rgba(255,252,247,0.7)] p-[3px]"
                  role="group"
                  aria-label="Date range"
                  id="insights-date-range"
                >
                  {INSIGHTS_DATE_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleRangeChange(preset.days)}
                      className={cn(
                        "rounded-full px-3.5 py-1.5 text-[13px] font-bold transition-colors",
                        activeRange === preset.id
                          ? "bg-cos-card text-cos-text shadow-[0_8px_28px_rgba(28,36,48,0.06)]"
                          : "text-cos-muted hover:text-cos-text",
                      )}
                    >
                      {DATE_PILL_LABELS[preset.id] ?? preset.label}
                    </button>
                  ))}
                </div>
                {!activeRange ? (
                  <span className="text-xs font-semibold text-cos-muted">
                    Custom · {formatDateRangeLabel(dateFrom, dateTo)}
                  </span>
                ) : null}
              </div>
            </div>

            <div
              className={cn(
                "space-y-4 transition-opacity duration-150",
                dataLoading && "pointer-events-none opacity-55",
              )}
              aria-busy={dataLoading}
            >
            <div
              className="grid grid-cols-2 gap-2.5 md:grid-cols-3 xl:grid-cols-5"
              role="list"
              aria-label="Overview metrics"
            >
              {orderedKpis.map((kpi) => {
                const selected = kpi.key === selectedMetric;
                const delta = formatChangePercent(kpi.changePercent);
                const up = (kpi.changePercent ?? 0) >= 0;
                return (
                  <button
                    key={kpi.key}
                    type="button"
                    role="listitem"
                    onClick={() => setSelectedMetric(kpi.key)}
                    data-testid={`insights-kpi-${kpi.key}`}
                    className={cn(
                      // Mockup `.kpi`: quiet cream card → forest inversion when selected
                      "min-w-0 rounded-[18px] border px-3.5 pt-3.5 pb-3 text-left shadow-[0_8px_28px_rgba(28,36,48,0.06)] transition-[transform,border-color,background-color,box-shadow] duration-150 hover:-translate-y-px",
                      selected
                        ? "border-[#2f4a3c] bg-[#2f4a3c] text-[#f6f2eb] shadow-[0_20px_48px_rgba(42,38,34,0.12)]"
                        : "border-[rgba(42,38,34,0.1)] bg-[#fffcf7] text-[#2a2622]",
                    )}
                  >
                    <div
                      className={cn(
                        "text-xs font-bold tracking-[0.01em]",
                        selected
                          ? "text-[rgba(246,242,235,0.72)]"
                          : "text-[#7a7166]",
                      )}
                    >
                      {kpi.label}
                    </div>
                    <div
                      className={cn(
                        "insights-ease-kpi-val",
                        selected && "insights-ease-kpi-val--selected",
                      )}
                    >
                      {kpi.value == null && kpi.unavailableReason
                        ? "—"
                        : formatInsightsNumber(kpi.value)}
                    </div>
                    {delta ? (
                      <div
                        className={cn(
                          "mt-2 flex items-center gap-1 text-[11px] font-bold",
                          selected
                            ? "text-[rgba(246,242,235,0.78)]"
                            : up
                              ? "text-[#6b8171]"
                              : "text-[#a65a3a]",
                        )}
                      >
                        <span aria-hidden>{up ? "↑" : "↓"}</span>
                        {delta.replace("+", "")} vs prior
                      </div>
                    ) : (
                      <div
                        className={cn(
                          "mt-2 text-[11px] font-bold",
                          selected
                            ? "text-[rgba(246,242,235,0.78)]"
                            : "text-[#7a7166]",
                        )}
                      >
                        {kpi.unavailableReason ? "Unavailable" : "This period"}
                      </div>
                    )}
                    <MetricSparkline
                      values={kpi.sparkline}
                      className="mt-2.5 h-7 w-full"
                      stroke={
                        selected ? "rgba(246,242,235,0.85)" : "#2a7a86"
                      }
                    />
                  </button>
                );
              })}
            </div>

            {pageData.recommendation ? (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[rgba(47,74,60,0.14)] bg-[rgba(47,74,60,0.05)] px-4 py-3">
                <p className="max-w-[62ch] text-[13px] leading-relaxed text-cos-muted">
                  <strong className="font-bold text-[#2f4a3c]">
                    From your metrics:
                  </strong>{" "}
                  {pageData.recommendation.summary}
                </p>
                <button
                  type="button"
                  onClick={() => setRecOpen(true)}
                  className="rounded-full px-3 py-2 text-[13px] font-bold text-cos-muted transition-colors hover:text-cos-text"
                >
                  Details
                </button>
              </div>
            ) : null}

            <section
              className="rounded-[22px] border border-cos-border bg-cos-card p-5 shadow-[0_8px_28px_rgba(28,36,48,0.06)]"
              aria-labelledby="insights-overview-title"
            >
              <div className="mb-3.5 flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <h2
                    id="insights-overview-title"
                    className="font-display text-[22px] font-semibold tracking-[-0.02em] text-cos-text"
                  >
                    Content overview
                  </h2>
                  <p className="mt-0.5 text-[13px] text-cos-muted">
                    Daily{" "}
                    <strong className="font-bold text-cos-text">
                      {selectedKpi?.label ?? "Views"}
                    </strong>{" "}
                    for the selected range
                  </p>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-[1fr_160px]">
                <div className="min-h-[220px] rounded-2xl border border-cos-border bg-[linear-gradient(180deg,rgba(246,242,235,0.65),transparent_40%),#f6f2eb] px-2 pt-4 pb-3">
                  {hasChartSignal ? (
                    <>
                      <svg
                        viewBox="0 0 560 200"
                        className="block h-[200px] w-full"
                        role="img"
                        aria-label={`${selectedKpi?.label ?? "Metric"} over time chart`}
                      >
                        <g stroke="rgba(42,38,34,0.08)" strokeWidth="1">
                          <line x1="40" y1="20" x2="540" y2="20" />
                          <line x1="40" y1="70" x2="540" y2="70" />
                          <line x1="40" y1="120" x2="540" y2="120" />
                          <line x1="40" y1="170" x2="540" y2="170" />
                        </g>
                        {chartPaths.area ? (
                          <path
                            d={chartPaths.area}
                            fill="rgba(42,122,134,0.12)"
                          />
                        ) : null}
                        {chartPaths.line ? (
                          <path
                            d={chartPaths.line}
                            fill="none"
                            stroke="#2a7a86"
                            strokeWidth="2.4"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        ) : null}
                      </svg>
                      <div className="mt-1.5 flex justify-between px-2 text-[11px] font-semibold text-cos-muted">
                        {dateTicks.map((tick) => (
                          <span key={`${tick.index}-${tick.label}`}>
                            {tick.label}
                          </span>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="flex h-[200px] items-center justify-center px-4 text-center text-sm text-cos-muted">
                      No daily metrics stored for this period. Sync insights from
                      Meta to populate this chart.
                    </div>
                  )}
                </div>

                <aside
                  className="flex flex-row flex-wrap gap-2.5 lg:flex-col lg:justify-center"
                  aria-label="Period totals"
                >
                  <div className="min-w-[140px] flex-1 rounded-[14px] border border-cos-border bg-[#f6f2eb] px-3.5 py-3">
                    <div className="text-[11px] font-extrabold tracking-[0.06em] text-cos-muted uppercase">
                      Period total
                    </div>
                    <div className="insights-ease-stat-val">
                      {formatInsightsNumber(selectedKpi?.value ?? 0)}
                    </div>
                    <div className="mt-0.5 text-xs text-cos-muted">
                      {selectedKpi?.label ?? "Views"}
                    </div>
                  </div>
                  <div className="min-w-[140px] flex-1 rounded-[14px] border border-cos-border bg-[#f6f2eb] px-3.5 py-3">
                    <div className="text-[11px] font-extrabold tracking-[0.06em] text-cos-muted uppercase">
                      Best day
                    </div>
                    <div className="insights-ease-stat-val">
                      {bestDay
                        ? formatInsightsNumber(bestDay.value)
                        : "—"}
                    </div>
                    <div className="mt-0.5 text-xs text-cos-muted">
                      {bestDay ? formatAxisDate(bestDay.date) : "No peak yet"}
                    </div>
                  </div>
                </aside>
              </div>
            </section>

            <section
              className="rounded-[22px] border border-cos-border bg-cos-card p-5 shadow-[0_8px_28px_rgba(28,36,48,0.06)]"
              aria-labelledby="insights-top-title"
            >
              <div className="mb-3.5 flex flex-wrap items-center justify-between gap-3">
                <h2
                  id="insights-top-title"
                  className="font-display text-[22px] font-semibold tracking-[-0.02em] text-cos-text"
                >
                  {topContentTitle}
                </h2>
                <label className="inline-flex shrink-0 items-center gap-2">
                  <span className="text-[11px] font-extrabold tracking-[0.08em] text-cos-muted uppercase">
                    Sort
                  </span>
                  <select
                    value={contentSort}
                    onChange={(event) =>
                      handleContentSortChange(
                        parseTopContentSort(event.target.value),
                      )
                    }
                    aria-label="Sort top content"
                    className="appearance-none rounded-full border-0 bg-[rgba(47,74,60,0.12)] px-3.5 py-2 text-xs font-bold text-[#2f4a3c] outline-none"
                  >
                    {TOP_CONTENT_SORT_OPTIONS.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {filteredTopPosts.length === 0 ? (
                <p className="text-sm text-cos-muted">
                  No top content for this period yet. Tap Refresh to pull recent
                  Facebook and Instagram posts, or widen the date range.
                </p>
              ) : (
                <TopContentCarousel posts={filteredTopPosts} />
              )}
            </section>
            </div>

          </>
        ) : null}

        {pageData.recommendation ? (
          <InsightsRecommendationsDrawer
            open={recOpen}
            onClose={() => setRecOpen(false)}
            recommendation={pageData.recommendation}
          />
        ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}

function ConnectMetaEmpty({
  organizationName,
  whyOpen,
  onToggleWhy,
}: {
  organizationName: string;
  whyOpen: boolean;
  onToggleWhy: () => void;
}) {
  return (
    <div className="mx-auto mt-2 flex max-w-xl flex-col items-center rounded-[22px] border border-cos-border bg-cos-card px-7 py-12 text-center shadow-[0_8px_28px_rgba(28,36,48,0.06)]">
      <div
        className="mb-3.5 grid h-14 w-14 place-items-center rounded-[18px] bg-[rgba(196,146,46,0.14)] text-[#8a6418]"
        aria-hidden
      >
        <svg
          viewBox="0 0 24 24"
          className="h-[26px] w-[26px] stroke-current"
          fill="none"
          strokeWidth={1.7}
        >
          <path d="M4 19h16" />
          <path d="M7 16V10" />
          <path d="M12 16V6" />
          <path d="M17 16v-5" />
        </svg>
      </div>
      <h2 className="font-display text-[28px] font-semibold tracking-[-0.02em] text-cos-text">
        Connect Meta to get started
      </h2>
      <p className="mt-2.5 max-w-[38ch] text-sm leading-relaxed text-cos-muted">
        Insights pulls organic performance — Views, Reach, Interactions, Likes,
        and Comments — from your Facebook Page and Instagram account for{" "}
        {organizationName || "your organization"}. The same connection powers
        publishing and inbox. No ads data. No audience demographics on this page.
      </p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
        <Link
          href={buildMetaOAuthStartPath({ returnTo: "/insights" })}
          className="inline-flex items-center rounded-full bg-cos-text px-[18px] py-[11px] text-[13px] font-bold text-[#fffcf7] transition-transform hover:-translate-y-px"
        >
          Connect with Facebook
        </Link>
        <Link
          href={buildIntegrationSettingsPath("meta", "/insights")}
          className="inline-flex items-center rounded-full border-[1.5px] border-cos-border bg-cos-card px-[18px] py-[11px] text-[13px] font-bold text-cos-text transition-transform hover:-translate-y-px"
        >
          Meta settings
        </Link>
      </div>
      <p className="mt-3.5 text-xs text-cos-muted">
        You’ll return here after connecting ·{" "}
        <button
          type="button"
          onClick={onToggleWhy}
          className="font-bold text-[#2f4a3c] hover:underline"
        >
          Why we ask for Page Insights
        </button>
      </p>
      {whyOpen ? (
        <p className="mt-3 max-w-[40ch] text-xs leading-relaxed text-cos-muted">
          Page Insights permissions show organic post performance for your school
          Page — so committees can see what parents actually saw, without ad or
          demographic theater on this screen.
        </p>
      ) : null}
    </div>
  );
}

function SyncMetaEmpty({
  onSync,
  syncing,
  missingScopes,
}: {
  onSync: () => void;
  syncing: boolean;
  missingScopes: string[];
}) {
  return (
    <div className="mx-auto mt-2 flex max-w-xl flex-col items-center rounded-[22px] border border-cos-border bg-cos-card px-7 py-12 text-center shadow-[0_8px_28px_rgba(28,36,48,0.06)]">
      <div
        className="mb-3.5 grid h-14 w-14 place-items-center rounded-[18px] bg-[rgba(196,146,46,0.14)] text-[#8a6418]"
        aria-hidden
      >
        <svg
          viewBox="0 0 24 24"
          className="h-[26px] w-[26px] stroke-current"
          fill="none"
          strokeWidth={1.7}
        >
          <path d="M20 12a8 8 0 1 1-2.3-5.7" />
          <path d="M20 4v5h-5" />
        </svg>
      </div>
      <h2 className="font-display text-[28px] font-semibold tracking-[-0.02em] text-cos-text">
        Sync insights from Meta
      </h2>
      <p className="mt-2.5 max-w-[38ch] text-sm leading-relaxed text-cos-muted">
        Meta is connected, but no analytics are stored yet. Run a sync to pull
        organic views, reach, and post performance into Hey Ralli.
      </p>
      {missingScopes.length > 0 ? (
        <p className="mt-3 max-w-md text-xs text-[#a65a3a]">
          Missing scopes: {missingScopes.join(", ")}. Reconnect Meta after adding
          them in your Meta app, then sync again.
        </p>
      ) : null}
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
        <button
          type="button"
          onClick={onSync}
          disabled={syncing}
          className="inline-flex items-center rounded-full bg-cos-text px-[18px] py-[11px] text-[13px] font-bold text-[#fffcf7] transition-transform hover:-translate-y-px disabled:opacity-60"
        >
          {syncing ? "Syncing…" : "Sync now"}
        </button>
        <Link
          href={buildIntegrationSettingsPath("meta", "/insights")}
          className="inline-flex items-center rounded-full border-[1.5px] border-cos-border bg-cos-card px-[18px] py-[11px] text-[13px] font-bold text-cos-text"
        >
          Review Meta connection
        </Link>
      </div>
    </div>
  );
}
