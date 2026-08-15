"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEventTabMutationRefresh } from "@/components/events-phase3/EventDetailTabInvalidation";
import { syncInsightsAction } from "@/lib/insights/actions";
import { shouldAutoSyncInsights } from "@/lib/insights/auto-sync";
import { formatMissingInsightsPermissionsMessage } from "@/lib/insights/connection-messages";
import {
  formatLastSyncTitle,
  formatInsightsNumber,
} from "@/lib/insights/format";
import {
  buildIntegrationSettingsPath,
  buildMetaOAuthStartPath,
} from "@/lib/integrations/oauth";
import type {
  EventInsightsPageData,
  EventInsightsPost,
} from "@/lib/insights/types";
import { cn } from "@/lib/utils/cn";

const THUMB_TONES = [
  "linear-gradient(135deg, #2f4a3c, #449099)",
  "linear-gradient(135deg, #c4922e, #a65a3a)",
  "linear-gradient(135deg, #2a7a86, #6b8171)",
] as const;

function postInitials(post: EventInsightsPost): string {
  const source = (post.captionSnippet ?? post.title).trim();
  if (!source) return post.platform === "instagram" ? "IG" : "FB";
  const words = source.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return `${words[0]![0] ?? ""}${words[1]![0] ?? ""}`.toUpperCase();
  }
  return source.slice(0, 3);
}

function formatPostDate(iso: string | null): string {
  if (!iso) return "Unpublished";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Unpublished";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function engagementRead(post: EventInsightsPost): {
  tone: "positive" | "mixed" | "quiet";
  summary: string;
} {
  const reach = Math.max(post.reach, 1);
  const rate = post.interactions / reach;
  if (post.views === 0 && post.reach === 0 && post.interactions === 0) {
    return {
      tone: "quiet",
      summary:
        "No organic metrics yet for this creative. Refresh after Meta syncs, or check back once the post has had time to gather reach.",
    };
  }
  if (rate >= 0.08 || post.shares >= 20) {
    return {
      tone: "positive",
      summary: `Response looks highly engaged — ${formatInsightsNumber(post.interactions)} interactions on ${formatInsightsNumber(post.reach)} reach, with ${formatInsightsNumber(post.shares)} shares.`,
    };
  }
  if (rate >= 0.03) {
    return {
      tone: "mixed",
      summary: `Solid mid-range engagement — ${formatInsightsNumber(post.likes)} likes and ${formatInsightsNumber(post.comments)} comments relative to reach. Worth boosting the strongest line of copy.`,
    };
  }
  return {
    tone: "quiet",
    summary: `Quiet so far on this creative — ${formatInsightsNumber(post.views)} views and ${formatInsightsNumber(post.interactions)} interactions. Try a follow-up post or a clearer CTA.`,
  };
}

function EmptyCard({
  title,
  body,
  testId,
  children,
}: {
  title: string;
  body: string;
  testId: string;
  children?: ReactNode;
}) {
  return (
    <div
      className="mx-auto mt-2 flex max-w-xl flex-col items-center rounded-[22px] border border-[rgba(42,38,34,0.1)] bg-[#fffcf7] px-7 py-12 text-center shadow-[0_8px_28px_rgba(28,36,48,0.06)]"
      data-testid={testId}
    >
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
      <h2 className="font-display text-[28px] font-semibold tracking-[-0.02em] text-[#2a2622]">
        {title}
      </h2>
      <p className="mt-2.5 max-w-[38ch] text-sm leading-relaxed text-[#5c554c]">
        {body}
      </p>
      {children}
    </div>
  );
}

function MetricProfileChart({ post }: { post: EventInsightsPost }) {
  const bars = [
    { label: "Views", value: post.views, color: "#c4922e" },
    { label: "Reach", value: post.reach, color: "#2f4a3c" },
    { label: "Engage", value: post.interactions, color: "#6b8171" },
    { label: "Clicks", value: post.linkClicks, color: "#a87a22" },
  ];
  const max = Math.max(...bars.map((b) => b.value), 1);
  const width = 320;
  const height = 160;
  const padX = 28;
  const padY = 16;
  const barW = 36;
  const gap =
    (width - padX * 2 - barW * bars.length) / Math.max(bars.length - 1, 1);
  const innerH = height - padY * 2 - 18;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-[200px] w-full"
      role="img"
      aria-label="Performance profile for selected creative"
    >
      {bars.map((bar, index) => {
        const h = (bar.value / max) * innerH;
        const x = padX + index * (barW + gap);
        const y = padY + innerH - h;
        return (
          <g key={bar.label}>
            <rect
              x={x}
              y={y}
              width={barW}
              height={Math.max(h, 2)}
              rx={8}
              fill={bar.color}
              opacity={0.85}
            />
            <text
              x={x + barW / 2}
              y={height - 4}
              textAnchor="middle"
              className="fill-[#6b8171]"
              style={{ fontSize: 10, fontFamily: "DM Sans, sans-serif" }}
            >
              {bar.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function EngagementDonut({ post }: { post: EventInsightsPost }) {
  const slices = [
    { label: "Likes", value: post.likes, color: "#2f4a3c" },
    { label: "Comments", value: post.comments, color: "#6b8171" },
    { label: "Shares", value: post.shares, color: "#c4922e" },
    { label: "Clicks", value: post.linkClicks, color: "#e8e3da" },
  ];
  const total = slices.reduce((sum, s) => sum + s.value, 0);
  const size = 140;
  const cx = size / 2;
  const cy = size / 2;
  const r = 48;
  const stroke = 22;

  if (total <= 0) {
    return (
      <p className="py-10 text-center text-xs text-[#6b8171]">
        No engagement breakdown yet for this creative.
      </p>
    );
  }

  let angle = -Math.PI / 2;
  const arcs = slices
    .filter((s) => s.value > 0)
    .map((slice) => {
      const portion = (slice.value / total) * Math.PI * 2;
      const start = angle;
      angle += portion;
      const end = angle;
      const large = portion > Math.PI ? 1 : 0;
      const x1 = cx + r * Math.cos(start);
      const y1 = cy + r * Math.sin(start);
      const x2 = cx + r * Math.cos(end);
      const y2 = cy + r * Math.sin(end);
      return {
        ...slice,
        d: `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`,
      };
    });

  return (
    <div className="flex flex-col items-center gap-3">
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="h-[160px] w-[160px]"
        role="img"
        aria-label="Engagement mix for selected creative"
      >
        {arcs.map((arc) => (
          <path
            key={arc.label}
            d={arc.d}
            fill="none"
            stroke={arc.color}
            strokeWidth={stroke}
            strokeLinecap="butt"
          />
        ))}
        <circle cx={cx} cy={cy} r={r - stroke / 2 - 2} fill="#fffcf7" />
        <text
          x={cx}
          y={cy - 2}
          textAnchor="middle"
          className="fill-[#2f4a3c]"
          style={{ fontSize: 16, fontWeight: 600, fontFamily: "Fraunces, serif" }}
        >
          {formatInsightsNumber(total)}
        </text>
        <text
          x={cx}
          y={cy + 14}
          textAnchor="middle"
          className="fill-[#6b8171]"
          style={{ fontSize: 9, fontFamily: "DM Sans, sans-serif" }}
        >
          signals
        </text>
      </svg>
      <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-[10px] font-bold tracking-wide text-[#6b8171] uppercase">
        {slices.map((s) => (
          <span key={s.label} className="inline-flex items-center gap-1.5">
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: s.color }}
              aria-hidden
            />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function VelocityChart({
  series,
  selectedPublishedAt,
}: {
  series: EventInsightsPageData["viewsSeries"];
  selectedPublishedAt: string | null;
}) {
  if (!series || series.length < 2) {
    return null;
  }

  const width = 480;
  const height = 220;
  const padX = 36;
  const padY = 20;
  const max = Math.max(...series.map((p) => p.eventViews), 1);
  const step =
    series.length > 1 ? (width - padX * 2) / (series.length - 1) : 0;
  const points = series.map((point, index) => {
    const x = padX + index * step;
    const y =
      padY +
      (height - padY * 2) -
      (point.eventViews / max) * (height - padY * 2);
    return { ...point, x, y };
  });
  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`)
    .join(" ");
  const area = `${path} L${points[points.length - 1]!.x},${height - padY} L${points[0]!.x},${height - padY} Z`;

  const selectedDay = selectedPublishedAt
    ? selectedPublishedAt.slice(0, 10)
    : null;
  const highlight = selectedDay
    ? points.find((p) => p.date === selectedDay)
    : null;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-[240px] w-full"
      role="img"
      aria-label="Event views over publish days"
    >
      <path d={area} fill="rgba(196, 146, 46, 0.08)" />
      <path
        d={path}
        fill="none"
        stroke="#c4922e"
        strokeWidth={3.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {highlight ? (
        <circle
          cx={highlight.x}
          cy={highlight.y}
          r={6}
          fill="#2f4a3c"
          stroke="#fffcf7"
          strokeWidth={2}
        />
      ) : null}
    </svg>
  );
}

export function EventDetailInsightsEasePanel({
  data,
  onOpenOrgInsights,
}: {
  data: EventInsightsPageData;
  /** When set (e.g. Insights hub Event view), switch in-page instead of navigating. */
  onOpenOrgInsights?: () => void;
}) {
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const autoSyncAttemptedForEventRef = useRef<string | null>(null);
  const refreshInsightsTab = useEventTabMutationRefresh("insights");

  const posts = data.posts;
  const safeIndex =
    posts.length === 0 ? 0 : Math.min(selectedIndex, posts.length - 1);
  const selected = posts[safeIndex] ?? null;

  useEffect(() => {
    setSelectedIndex(0);
    setSyncMessage(null);
  }, [data.eventId, posts.length]);

  function handleSync() {
    setSyncMessage(null);
    startTransition(async () => {
      const result = await syncInsightsAction();
      if (!result.ok) {
        setSyncMessage(result.error ?? "Couldn't refresh your Page numbers.");
        return;
      }
      setSyncMessage(
        result.postsSynced > 0
          ? `Updated ${result.postsSynced} post${result.postsSynced === 1 ? "" : "s"} from your Page.`
          : "Your Page numbers are up to date.",
      );
      await refreshInsightsTab();
    });
  }

  // Auto-pull once when the tab opens empty/stale (Meta App Review shouldn't hunt Refresh).
  useEffect(() => {
    if (autoSyncAttemptedForEventRef.current === data.eventId) return;
    if (data.emptyState === "connect" || data.emptyState === "no_posts") {
      return;
    }
    if (
      !shouldAutoSyncInsights({
        metaConnected: data.connection.metaConnected,
        insightsScopesGranted: data.connection.insightsScopesGranted,
        hasMetrics: data.hasSyncedMetrics,
        lastSyncAt: data.lastSyncAt,
        syncInProgress: data.syncInProgress,
      })
    ) {
      return;
    }
    autoSyncAttemptedForEventRef.current = data.eventId;
    handleSync();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot per event payload
  }, [
    data.eventId,
    data.emptyState,
    data.connection.metaConnected,
    data.connection.insightsScopesGranted,
    data.hasSyncedMetrics,
    data.lastSyncAt,
    data.syncInProgress,
  ]);

  const scrollToIndex = useCallback((index: number) => {
    const root = scrollerRef.current;
    if (!root) return;
    const card = root.children[index] as HTMLElement | undefined;
    card?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, []);

  const selectPost = useCallback(
    (index: number) => {
      if (posts.length === 0) return;
      const next = Math.max(0, Math.min(index, posts.length - 1));
      setSelectedIndex(next);
      scrollToIndex(next);
    },
    [posts.length, scrollToIndex],
  );

  const returnTo = `/events/${encodeURIComponent(data.eventId)}?tab=insights`;
  const orgInsightsHref = "/insights?view=org";
  const eventTitle = data.eventTitle?.trim() || "This event";

  const openOrgInsightsGhost = onOpenOrgInsights ? (
    <button
      type="button"
      onClick={onOpenOrgInsights}
      className="inline-flex items-center rounded-full px-3 py-2 text-[13px] font-bold text-[#5c554c] transition-colors hover:text-[#2a2622]"
    >
      Open Org Insights
    </button>
  ) : (
    <Link
      href={orgInsightsHref}
      className="inline-flex items-center rounded-full px-3 py-2 text-[13px] font-bold text-[#5c554c] transition-colors hover:text-[#2a2622]"
    >
      Open Org Insights
    </Link>
  );

  const openOrgInsightsSecondary = onOpenOrgInsights ? (
    <button
      type="button"
      onClick={onOpenOrgInsights}
      className="inline-flex items-center rounded-full border-[1.5px] border-[rgba(42,38,34,0.1)] bg-[#fffcf7] px-[18px] py-[11px] text-[13px] font-bold text-[#2a2622] transition-transform hover:-translate-y-px"
    >
      Open Org Insights
    </button>
  ) : (
    <Link
      href={orgInsightsHref}
      className="inline-flex items-center rounded-full border-[1.5px] border-[rgba(42,38,34,0.1)] bg-[#fffcf7] px-[18px] py-[11px] text-[13px] font-bold text-[#2a2622] transition-transform hover:-translate-y-px"
    >
      Open Org Insights
    </Link>
  );

  const avgReach = useMemo(() => {
    if (posts.length === 0) return 0;
    return posts.reduce((sum, p) => sum + p.reach, 0) / posts.length;
  }, [posts]);

  if (data.emptyState === "connect") {
    return (
      <EmptyCard
        testId="event-insights-empty-connect"
        title="Connect Meta to see Insights"
        body="Event Insights use the same Meta connection as publishing and organization Insights. Connect once to pull organic views, reach, and interactions for this event’s posts. No ads data."
      >
        <div className="mt-[22px] flex flex-wrap items-center justify-center gap-2.5">
          <Link
            href={buildMetaOAuthStartPath({ returnTo })}
            className="inline-flex items-center rounded-full bg-[#2a2622] px-[18px] py-[11px] text-[13px] font-bold text-[#fffcf7] transition-transform hover:-translate-y-px"
          >
            Connect with Facebook
          </Link>
          <Link
            href={buildIntegrationSettingsPath("meta", returnTo)}
            className="inline-flex items-center rounded-full border-[1.5px] border-[rgba(42,38,34,0.1)] bg-[#fffcf7] px-[18px] py-[11px] text-[13px] font-bold text-[#2a2622] transition-transform hover:-translate-y-px"
          >
            Meta settings
          </Link>
        </div>
      </EmptyCard>
    );
  }

  if (data.emptyState === "no_posts") {
    return (
      <EmptyCard
        testId="event-insights-empty-no-posts"
        title="No published posts yet"
        body="Insights appear after posts for this event are published to Facebook or Instagram through Hey Ralli."
      />
    );
  }

  if (data.emptyState === "sync") {
    const needsReconnect = data.connection.missingInsightsScopes.length > 0;
    return (
      <EmptyCard
        testId="event-insights-empty-sync"
        title={
          needsReconnect
            ? "Finish Insights permissions"
            : "Refresh your Page numbers"
        }
        body={
          needsReconnect
            ? `This event has ${data.publishedSlotCount} published post${data.publishedSlotCount === 1 ? "" : "s"}, but Page Insights still needs one more Facebook approval before we can pull organic numbers.`
            : `This event has ${data.publishedSlotCount} published post${data.publishedSlotCount === 1 ? "" : "s"}, but numbers haven’t been pulled yet. Refresh to load organic views, reach, and interactions.`
        }
      >
        {needsReconnect ? (
          <p className="mt-3 max-w-md text-xs text-[#a65a3a]">
            {formatMissingInsightsPermissionsMessage(
              data.connection.missingInsightsScopes,
            )}
          </p>
        ) : null}
        <div className="mt-[22px] flex flex-wrap items-center justify-center gap-2.5">
          {needsReconnect ? (
            <Link
              href={buildMetaOAuthStartPath({
                returnTo,
                authType: "rerequest",
              })}
              className="inline-flex items-center rounded-full bg-[#2a2622] px-[18px] py-[11px] text-[13px] font-bold text-[#fffcf7] transition-transform hover:-translate-y-px"
            >
              Reconnect Facebook
            </Link>
          ) : (
            <button
              type="button"
              onClick={handleSync}
              disabled={isPending || data.syncInProgress}
              className="inline-flex items-center rounded-full bg-[#2a2622] px-[18px] py-[11px] text-[13px] font-bold text-[#fffcf7] transition-transform hover:-translate-y-px disabled:opacity-60"
            >
              {isPending || data.syncInProgress
                ? "Refreshing…"
                : "Refresh your Page numbers"}
            </button>
          )}
          {openOrgInsightsSecondary}
        </div>
        {syncMessage ? (
          <p className="mt-3 text-sm text-[#5c554c]" role="status">
            {syncMessage}
          </p>
        ) : null}
      </EmptyCard>
    );
  }

  if (!selected) {
    return (
      <EmptyCard
        testId="event-insights-empty-no-posts"
        title="No published posts yet"
        body="Insights appear after posts for this event are published to Facebook or Instagram through Hey Ralli."
      />
    );
  }

  const read = engagementRead(selected);
  const reachDelta =
    avgReach > 0 ? Math.round(((selected.reach - avgReach) / avgReach) * 100) : null;

  return (
    <div data-testid="event-insights-panel">
      <div className="mb-8">
        <h2 className="font-display text-4xl text-[#2f4a3c]">
          Event Performance
        </h2>
        <p className="mt-1 text-[#6b8171]">
          Organic Meta stats for each published creative on {eventTitle}. Scroll
          the flyer card — numbers and charts follow the selected post.
        </p>
      </div>

      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
        {/* Left: creative carousel */}
        <div className="space-y-6 lg:col-span-4">
          <div
            className="overflow-hidden rounded-3xl border border-[#e8e3da] bg-white p-2 shadow-sm"
            data-testid="event-insights-creative-carousel"
          >
            <div className="relative">
              <div
                ref={scrollerRef}
                className="flex snap-x snap-mandatory gap-2 overflow-x-auto scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                onScroll={(event) => {
                  const root = event.currentTarget;
                  const width = root.clientWidth;
                  if (width <= 0) return;
                  const index = Math.round(root.scrollLeft / width);
                  if (index !== safeIndex && index >= 0 && index < posts.length) {
                    setSelectedIndex(index);
                  }
                }}
              >
                {posts.map((post, index) => (
                  <article
                    key={post.id}
                    className="relative w-full shrink-0 snap-center"
                    data-testid={`event-insights-creative-${index}`}
                    aria-current={index === safeIndex ? "true" : undefined}
                  >
                    <div className="relative">
                      <div
                        className="aspect-[4/5] w-full overflow-hidden rounded-2xl"
                        style={{
                          background: THUMB_TONES[index % THUMB_TONES.length],
                        }}
                      >
                        {post.thumbnailUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element -- remote Meta/event artwork URLs vary by host
                          <img
                            src={post.thumbnailUrl}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="grid h-full place-items-center font-display text-3xl font-semibold text-[#f6f2eb]">
                            {postInitials(post)}
                          </div>
                        )}
                      </div>
                      <div className="absolute inset-x-0 bottom-0 rounded-b-2xl bg-gradient-to-t from-black/80 to-transparent p-4">
                        <p className="mb-1 text-[10px] font-bold tracking-widest text-white/70 uppercase">
                          {post.platform === "facebook" ? "Facebook" : "Instagram"}{" "}
                          · {formatPostDate(post.publishedAt)}
                        </p>
                        <h4 className="line-clamp-2 font-medium text-white">
                          {post.captionSnippet ?? post.title}
                        </h4>
                      </div>
                      <div className="absolute top-4 right-4 flex items-center gap-1 rounded-full bg-emerald-500 px-2 py-1 text-[10px] font-bold text-white shadow-lg">
                        <span
                          className="inline-block h-1.5 w-1.5 rounded-full bg-white"
                          aria-hidden
                        />
                        Live
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              {posts.length > 1 ? (
                <>
                  <button
                    type="button"
                    aria-label="Previous creative"
                    onClick={() => selectPost(safeIndex - 1)}
                    disabled={safeIndex === 0}
                    className="absolute top-1/2 left-2 z-10 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-white/40 bg-black/35 text-white backdrop-blur disabled:opacity-30"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    aria-label="Next creative"
                    onClick={() => selectPost(safeIndex + 1)}
                    disabled={safeIndex >= posts.length - 1}
                    className="absolute top-1/2 right-2 z-10 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-white/40 bg-black/35 text-white backdrop-blur disabled:opacity-30"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </>
              ) : null}
            </div>

            <div
              className="grid grid-cols-3 gap-4 p-4 text-center"
              data-testid="event-insights-creative-metrics"
            >
              <div>
                <p className="text-[10px] font-bold tracking-tighter text-[#6b8171] uppercase">
                  Views
                </p>
                <p className="font-display text-lg font-semibold text-[#2f4a3c]">
                  {formatInsightsNumber(selected.views)}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold tracking-tighter text-[#6b8171] uppercase">
                  Shares
                </p>
                <p className="font-display text-lg font-semibold text-[#2f4a3c]">
                  {formatInsightsNumber(selected.shares)}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold tracking-tighter text-[#6b8171] uppercase">
                  Clicks
                </p>
                <p className="font-display text-lg font-semibold text-[#2f4a3c]">
                  {formatInsightsNumber(selected.linkClicks)}
                </p>
              </div>
            </div>

            {posts.length > 1 ? (
              <div className="flex items-center justify-center gap-1.5 pb-3">
                {posts.map((post, index) => (
                  <button
                    key={post.id}
                    type="button"
                    aria-label={`Show creative ${index + 1}`}
                    onClick={() => selectPost(index)}
                    className={cn(
                      "h-1.5 rounded-full transition-all",
                      index === safeIndex
                        ? "w-5 bg-[#c4922e]"
                        : "w-1.5 bg-[#e8e3da]",
                    )}
                  />
                ))}
              </div>
            ) : null}
          </div>

          <div
            className="rounded-2xl border border-[#d4ddd6] bg-[#d4ddd6]/20 p-5"
            data-testid="event-insights-engagement-read"
          >
            <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-[#2f4a3c]">
              <span className="text-[#c4922e]" aria-hidden>
                ✦
              </span>
              Engagement read
            </h4>
            <p className="text-xs leading-relaxed text-[#6b8171]">
              Overall response to this creative is{" "}
              <span
                className={cn(
                  "font-bold italic",
                  read.tone === "positive" && "text-emerald-700",
                  read.tone === "mixed" && "text-[#a87a22]",
                  read.tone === "quiet" && "text-[#6b8171]",
                )}
              >
                {read.tone === "positive"
                  ? "highly engaged"
                  : read.tone === "mixed"
                    ? "moderately engaged"
                    : "still quiet"}
              </span>
              . {read.summary}
            </p>
          </div>
        </div>

        {/* Right: rotating stats + charts */}
        <div className="space-y-8 lg:col-span-8">
          <div
            className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
            data-testid="event-insights-kpi-strip"
          >
            <div
              className="rounded-2xl border border-[#e8e3da] bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-[#c4922e]"
              data-testid="event-insights-kpi-reach"
            >
              <div className="mb-4 flex items-start justify-between">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#f6f2eb] text-[#c4922e]">
                  <span aria-hidden>◎</span>
                </div>
                {reachDelta != null ? (
                  <span
                    className={cn(
                      "rounded px-2 py-0.5 text-[10px] font-bold",
                      reachDelta >= 0
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-[#f6f2eb] text-[#6b8171]",
                    )}
                  >
                    {reachDelta >= 0 ? "+" : ""}
                    {reachDelta}% vs avg
                  </span>
                ) : null}
              </div>
              <p className="font-display text-3xl font-semibold text-[#2f4a3c]">
                {formatInsightsNumber(selected.reach)}
              </p>
              <p className="mt-1 text-xs font-medium tracking-widest text-[#6b8171] uppercase">
                Reach
              </p>
            </div>

            <div
              className="rounded-2xl border border-[#e8e3da] bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-[#c4922e]"
              data-testid="event-insights-kpi-interactions"
            >
              <div className="mb-4 flex items-start justify-between">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#f6f2eb] text-[#2f4a3c]">
                  <span aria-hidden>✦</span>
                </div>
                <span className="rounded bg-[#f6f2eb] px-2 py-0.5 text-[10px] font-bold text-[#6b8171]">
                  {formatInsightsNumber(selected.likes)} likes
                </span>
              </div>
              <p className="font-display text-3xl font-semibold text-[#2f4a3c]">
                {formatInsightsNumber(selected.interactions)}
              </p>
              <p className="mt-1 text-xs font-medium tracking-widest text-[#6b8171] uppercase">
                Interactions
              </p>
            </div>

            <div
              className="rounded-2xl border border-[#e8e3da] bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-[#c4922e]"
              data-testid="event-insights-kpi-linkClicks"
            >
              <div className="mb-4 flex items-start justify-between">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#f6f2eb] text-[#6b8171]">
                  <span aria-hidden>→</span>
                </div>
                <span className="rounded bg-[#c4922e]/10 px-2 py-0.5 text-[10px] font-bold text-[#a87a22]">
                  {selected.platform === "facebook" ? "Facebook" : "Instagram"}
                </span>
              </div>
              <p className="font-display text-3xl font-semibold text-[#2f4a3c]">
                {formatInsightsNumber(selected.linkClicks)}
              </p>
              <p className="mt-1 text-xs font-medium tracking-widest text-[#6b8171] uppercase">
                Link clicks
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-[#e8e3da] bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-[#2f4a3c]">
                  {data.viewsSeries && data.viewsSeries.length >= 2
                    ? "Engagement velocity"
                    : "Performance profile"}
                </h3>
                <p className="text-xs text-[#6b8171]">
                  {data.viewsSeries && data.viewsSeries.length >= 2
                    ? "Event views by publish day — selected creative highlighted when dates align"
                    : "Views, reach, interactions, and clicks for the selected creative"}
                </p>
              </div>
              {selected.externalUrl ? (
                <a
                  href={selected.externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg border border-[#c4922e] bg-white px-3 py-1 text-xs font-bold text-[#c4922e]"
                >
                  Open post
                </a>
              ) : null}
            </div>
            {data.viewsSeries && data.viewsSeries.length >= 2 ? (
              <VelocityChart
                series={data.viewsSeries}
                selectedPublishedAt={selected.publishedAt}
              />
            ) : (
              <MetricProfileChart post={selected} />
            )}
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-[#e8e3da] bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-sm font-bold text-[#2f4a3c]">
                Engagement mix
              </h3>
              <EngagementDonut post={selected} />
            </div>
            <div className="rounded-2xl border border-[#e8e3da] bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-sm font-bold text-[#2f4a3c]">
                Creative snapshot
              </h3>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between gap-3 border-b border-[#e8e3da] pb-2">
                  <dt className="text-[#6b8171]">Comments</dt>
                  <dd className="font-semibold text-[#2f4a3c]">
                    {formatInsightsNumber(selected.comments)}
                  </dd>
                </div>
                <div className="flex justify-between gap-3 border-b border-[#e8e3da] pb-2">
                  <dt className="text-[#6b8171]">Shares</dt>
                  <dd className="font-semibold text-[#2f4a3c]">
                    {formatInsightsNumber(selected.shares)}
                  </dd>
                </div>
                <div className="flex justify-between gap-3 border-b border-[#e8e3da] pb-2">
                  <dt className="text-[#6b8171]">Placement</dt>
                  <dd className="font-semibold text-[#2f4a3c] capitalize">
                    {selected.placement ?? "Feed"}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-[#6b8171]">Event totals</dt>
                  <dd className="text-right text-xs font-semibold text-[#6b8171]">
                    {formatInsightsNumber(data.kpis.views)} views ·{" "}
                    {formatInsightsNumber(data.kpis.reach)} reach
                  </dd>
                </div>
              </dl>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[#e8e3da] pt-4 text-xs">
                <span className="text-[#6b8171]">
                  Creative {safeIndex + 1} of {posts.length}
                </span>
                <button
                  type="button"
                  onClick={handleSync}
                  disabled={isPending || data.syncInProgress}
                  title={formatLastSyncTitle(data.lastSyncAt)}
                  className="font-bold text-[#a87a22] hover:underline disabled:opacity-60"
                >
                  {isPending || data.syncInProgress ? "Refreshing…" : "Refresh"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        className="mt-8 flex flex-wrap items-center justify-end gap-2.5"
        data-testid="event-insights-sync-footer"
      >
        {openOrgInsightsGhost}
      </div>

      {syncMessage ? (
        <p className="mt-2 text-sm text-[#5c554c]" role="status">
          {syncMessage}
        </p>
      ) : null}
    </div>
  );
}
