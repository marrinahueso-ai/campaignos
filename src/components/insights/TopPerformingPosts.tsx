"use client";

import {
  ChevronLeft,
  ChevronRight,
  Eye,
  Heart,
  MessageCircle,
  Share2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { InsightsSectionCard } from "@/components/insights/InsightsSectionCard";
import { PlatformIcon } from "@/components/insights/PlatformIcon";
import { formatInsightsNumber } from "@/lib/insights/format";
import type { InsightsPlatform, InsightsTopPost } from "@/lib/insights/types";
import { cn } from "@/lib/utils/cn";

interface TopPerformingPostsProps {
  posts: InsightsTopPost[];
  platformFilter?: InsightsPlatform;
}

function formatPublishedAt(iso: string | null): string {
  if (!iso) {
    return "—";
  }

  const date = new Date(iso);
  const weekday = date.toLocaleString("en-US", { weekday: "short" });
  const month = date.toLocaleString("en-US", { month: "short" });
  const day = date.getDate();
  const time = date
    .toLocaleString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
    .replace(/\s/g, "")
    .toLowerCase();

  return `${weekday} ${month} ${day}, ${time}`;
}

function SectionTitle({ platformFilter }: { platformFilter: InsightsPlatform }) {
  return (
    <span className="inline-flex items-center gap-2">
      {platformFilter === "all" ? (
        <span className="inline-flex items-center gap-1">
          <PlatformIcon platform="facebook" className="h-5 w-5" />
          <PlatformIcon platform="instagram" className="h-5 w-5" />
        </span>
      ) : (
        <PlatformIcon platform={platformFilter} className="h-5 w-5" />
      )}
      <span>Top content by views</span>
    </span>
  );
}

function MetricCell({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof Eye;
  value: number | null;
  label: string;
}) {
  return (
    <span
      className="inline-flex min-w-0 items-center gap-1.5 tabular-nums"
      title={label}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} aria-hidden />
      <span className="truncate">{formatInsightsNumber(value ?? 0)}</span>
      <span className="sr-only">{label}</span>
    </span>
  );
}

export function TopPerformingPosts({
  posts,
  platformFilter = "all",
}: TopPerformingPostsProps) {
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
    if (!el) {
      return;
    }
    const onScroll = () => updateScrollState();
    el.addEventListener("scroll", onScroll, { passive: true });
    const observer = new ResizeObserver(() => updateScrollState());
    observer.observe(el);
    return () => {
      el.removeEventListener("scroll", onScroll);
      observer.disconnect();
    };
  }, [posts]);

  function scrollByCard(direction: -1 | 1) {
    const el = scrollerRef.current;
    if (!el) {
      return;
    }
    el.scrollBy({ left: direction * 260, behavior: "smooth" });
  }

  return (
    <InsightsSectionCard title={<SectionTitle platformFilter={platformFilter} />}>
      {posts.length === 0 ? (
        <p className="text-sm text-cos-muted">
          No top content for this period yet. Tap Refresh to pull recent Facebook
          and Instagram posts from your connected Page, or widen the date range.
        </p>
      ) : (
        <div className="relative">
          {canScrollLeft ? (
            <button
              type="button"
              onClick={() => scrollByCard(-1)}
              className="absolute left-0 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-cos-border bg-cos-card text-cos-text shadow-sm transition-opacity hover:bg-cos-bg"
              aria-label="Scroll top content left"
            >
              <ChevronLeft className="h-4 w-4" strokeWidth={1.75} />
            </button>
          ) : null}
          {canScrollRight ? (
            <button
              type="button"
              onClick={() => scrollByCard(1)}
              className="absolute right-0 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-cos-border bg-cos-card text-cos-text shadow-sm transition-opacity hover:bg-cos-bg"
              aria-label="Scroll top content right"
            >
              <ChevronRight className="h-4 w-4" strokeWidth={1.75} />
            </button>
          ) : null}

          <div
            ref={scrollerRef}
            className={cn(
              "-mx-1 flex gap-3 overflow-x-auto px-1 pb-1 scroll-smooth",
              "[scrollbar-width:thin]",
            )}
          >
            {posts.map((post) => (
              <article
                key={post.id}
                className="w-[15.5rem] shrink-0 overflow-hidden rounded-xl border border-cos-border bg-cos-bg/40"
              >
                <div className="relative aspect-[4/3] bg-cos-bg">
                  {post.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- remote Meta/event artwork URLs vary by storage host
                    <img
                      src={post.thumbnailUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <PlatformIcon
                        platform={post.platform}
                        className="h-10 w-10 rounded-lg text-xs"
                      />
                    </div>
                  )}
                  <div className="absolute left-2 top-2">
                    <PlatformIcon
                      platform={post.platform}
                      className="h-6 w-6 rounded-md text-[9px] shadow-sm"
                    />
                  </div>
                </div>

                <div className="space-y-2.5 px-3 py-3">
                  <p className="line-clamp-2 text-sm font-semibold leading-snug text-cos-text">
                    {post.captionSnippet ?? post.title}
                  </p>
                  <p className="text-[11px] text-cos-muted">
                    {formatPublishedAt(post.publishedAt)}
                  </p>

                  <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 border-t border-cos-border/70 pt-2.5 text-xs text-cos-muted">
                    <MetricCell
                      icon={Eye}
                      value={post.views}
                      label="Views"
                    />
                    <MetricCell
                      icon={Heart}
                      value={post.likes}
                      label="Reactions"
                    />
                    <MetricCell
                      icon={MessageCircle}
                      value={post.comments}
                      label="Comments"
                    />
                    <MetricCell
                      icon={Share2}
                      value={post.shares}
                      label="Shares"
                    />
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}
    </InsightsSectionCard>
  );
}
