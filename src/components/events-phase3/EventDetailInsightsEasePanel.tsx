"use client";

import Link from "next/link";
import { useState, useTransition, type ReactNode } from "react";
import { useEventTabMutationRefresh } from "@/components/events-phase3/EventDetailTabInvalidation";
import { syncInsightsAction } from "@/lib/insights/actions";
import {
  formatLastSyncTitle,
  formatInsightsNumber,
} from "@/lib/insights/format";
import {
  buildIntegrationSettingsPath,
  buildMetaOAuthStartPath,
} from "@/lib/integrations/oauth";
import type { EventInsightsPageData } from "@/lib/insights/types";
import { cn } from "@/lib/utils/cn";

const THUMB_TONES = [
  "linear-gradient(135deg, #2f4a3c, #449099)",
  "linear-gradient(135deg, #c4922e, #a65a3a)",
  "linear-gradient(135deg, #2a7a86, #6b8171)",
] as const;

const EVENT_KPIS: Array<{
  key: keyof EventInsightsPageData["kpis"];
  label: string;
}> = [
  { key: "views", label: "Views" },
  { key: "reach", label: "Reach" },
  { key: "interactions", label: "Interactions" },
  { key: "linkClicks", label: "Link clicks" },
  { key: "likes", label: "Likes" },
];

function postInitials(post: EventInsightsPageData["posts"][number]): string {
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
  const refreshInsightsTab = useEventTabMutationRefresh("insights");

  const returnTo = `/events/${encodeURIComponent(data.eventId)}?tab=insights`;
  const orgInsightsHref = "/insights?view=org";
  const eventTitle = data.eventTitle?.trim() || "This event";

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
      <EmptyCard
        testId="event-insights-empty-connect"
        title="Connect Meta to see Insights"
        body="Event Insights use the same Meta connection as publishing and the org Insights hub. Connect once to pull organic views, reach, and interactions for this event’s posts. No ads data."
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
    return (
      <EmptyCard
        testId="event-insights-empty-sync"
        title="Sync insights from Meta"
        body={`This event has ${data.publishedSlotCount} published post${data.publishedSlotCount === 1 ? "" : "s"}, but metrics haven’t been pulled yet. Sync to load organic views, reach, and interactions.`}
      >
        {data.connection.missingInsightsScopes.length > 0 ? (
          <p className="mt-3 max-w-md text-xs text-[#a65a3a]">
            Missing scopes: {data.connection.missingInsightsScopes.join(", ")}.
            Reconnect Meta, then sync again.
          </p>
        ) : null}
        <div className="mt-[22px] flex flex-wrap items-center justify-center gap-2.5">
          <button
            type="button"
            onClick={handleSync}
            disabled={isPending || data.syncInProgress}
            className="inline-flex items-center rounded-full bg-[#2a2622] px-[18px] py-[11px] text-[13px] font-bold text-[#fffcf7] transition-transform hover:-translate-y-px disabled:opacity-60"
          >
            {isPending || data.syncInProgress ? "Syncing…" : "Sync now"}
          </button>
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

  return (
    <div
      className="rounded-[22px] border border-[rgba(42,38,34,0.1)] bg-[rgba(255,252,247,0.55)] p-[18px] shadow-[0_8px_28px_rgba(28,36,48,0.06)]"
      data-testid="event-insights-panel"
    >
      <div className="mb-1.5 text-[11px] font-extrabold tracking-[0.08em] text-[#7a7166] uppercase">
        Event Insights · organic Meta metrics
      </div>

      {/* Mockup `.kpi-strip`: 5 → 3 → 2 columns; no sparklines / deltas on event */}
      <div
        className="mb-0 grid grid-cols-2 gap-2.5 md:grid-cols-3 xl:grid-cols-5"
        data-testid="event-insights-kpi-strip"
      >
        {EVENT_KPIS.map((kpi) => (
          <div
            key={kpi.key}
            className="min-w-0 cursor-default rounded-[18px] border border-[rgba(42,38,34,0.1)] bg-[#fffcf7] px-3.5 pt-3.5 pb-3 text-left shadow-[0_8px_28px_rgba(28,36,48,0.06)]"
            data-testid={`event-insights-kpi-${kpi.key}`}
          >
            <div className="text-xs font-bold tracking-[0.01em] text-[#7a7166]">
              {kpi.label}
            </div>
            <div className="insights-ease-kpi-val text-[#2a2622]">
              {formatInsightsNumber(data.kpis[kpi.key])}
            </div>
          </div>
        ))}
      </div>

      {/* Mockup posts `.section` with box-shadow:none (no comparison banner) */}
      <section className="mt-3.5 mb-3 rounded-[22px] border border-[rgba(42,38,34,0.1)] bg-[#fffcf7] px-5 pt-[18px] pb-5 shadow-none">
        <div className="mb-3.5">
          <h2 className="font-display m-0 text-[22px] font-semibold tracking-[-0.02em] text-[#2a2622]">
            Posts for this event
          </h2>
          <p className="m-0 mt-0.5 text-[13px] text-[#7a7166]">
            Published slots linked to {eventTitle}
          </p>
        </div>

        {data.posts.length === 0 ? (
          <p className="text-sm text-[#5c554c]">
            No published posts for this event yet.
          </p>
        ) : (
          <div
            className="flex flex-col gap-2.5"
            data-testid="event-insights-posts"
          >
            {data.posts.map((post, index) => {
              const body = (
                <>
                  <div
                    className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-xl font-display text-sm font-bold text-[#f6f2eb]"
                    style={{
                      background: THUMB_TONES[index % THUMB_TONES.length],
                    }}
                    aria-hidden
                  >
                    {post.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- remote Meta/event artwork URLs vary by host
                      <img
                        src={post.thumbnailUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      postInitials(post)
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="m-0 truncate text-sm font-bold text-[#2a2622]">
                      {post.captionSnippet ?? post.title}
                    </h3>
                    <p className="mt-[3px] text-xs font-semibold text-[#7a7166]">
                      {post.platform === "facebook" ? "Facebook" : "Instagram"}{" "}
                      · {formatPostDate(post.publishedAt)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right text-xs font-bold whitespace-nowrap text-[#5c554c] max-sm:col-start-2 max-sm:row-start-2 max-sm:flex max-sm:gap-3.5 max-sm:text-left max-sm:whitespace-normal">
                    <div>
                      <strong className="font-display block text-lg font-semibold text-[#2a2622] max-sm:mr-1 max-sm:inline max-sm:text-[15px]">
                        {formatInsightsNumber(post.views)}
                      </strong>{" "}
                      views
                    </div>
                    <div className="mt-1 max-sm:mt-0">
                      {formatInsightsNumber(post.likes)} likes
                    </div>
                  </div>
                </>
              );

              const className =
                "grid grid-cols-[64px_1fr_auto] items-center gap-3 rounded-2xl border border-[rgba(42,38,34,0.1)] bg-[#fffcf7] p-2.5 max-sm:grid-cols-[56px_1fr]";

              if (post.externalUrl) {
                return (
                  <a
                    key={post.id}
                    href={post.externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(className, "hover:bg-[#f6f2eb]")}
                  >
                    {body}
                  </a>
                );
              }

              return (
                <article key={post.id} className={className}>
                  {body}
                </article>
              );
            })}
          </div>
        )}
      </section>

      <div
        className="mt-3.5 flex flex-wrap items-center justify-end gap-2.5"
        data-testid="event-insights-sync-footer"
      >
        <button
          type="button"
          onClick={handleSync}
          disabled={isPending || data.syncInProgress}
          title={formatLastSyncTitle(data.lastSyncAt)}
          className="inline-flex items-center rounded-full border-[1.5px] border-[rgba(42,38,34,0.1)] bg-[#fffcf7] px-4 py-2.5 text-[13px] font-bold text-[#2a2622] transition-transform hover:-translate-y-px disabled:opacity-60"
        >
          {isPending || data.syncInProgress ? "Syncing…" : "Refresh"}
        </button>
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
