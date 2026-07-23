import { Eye, Heart, MessageCircle } from "lucide-react";
import { InsightsSectionCard } from "@/components/insights/InsightsSectionCard";
import { PlatformIcon } from "@/components/insights/PlatformIcon";
import { formatInsightsNumber } from "@/lib/insights/format";
import type { InsightsTopPost } from "@/lib/insights/types";

interface TopPerformingPostsProps {
  posts: InsightsTopPost[];
}

function formatPublishedAt(iso: string | null): string {
  if (!iso) {
    return "—";
  }

  return new Date(iso).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function TopPerformingPosts({ posts }: TopPerformingPostsProps) {
  return (
    <InsightsSectionCard title="Top content by views">
      {posts.length === 0 ? (
        <p className="text-sm text-cos-muted">
          No post-level insights stored for this period. Publish through Hey Ralli
          and refresh Insights to see individual post stats.
        </p>
      ) : (
        <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
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

              <div className="space-y-2 px-3 py-3">
                <p className="line-clamp-2 text-sm font-medium leading-snug text-cos-text">
                  {post.captionSnippet ?? post.title}
                </p>
                <p className="text-[11px] text-cos-muted">
                  {formatPublishedAt(post.publishedAt)}
                  {post.placement ? ` · ${post.placement}` : ""}
                </p>

                <div className="flex items-center gap-3 pt-1 text-xs text-cos-muted">
                  <span
                    className="inline-flex items-center gap-1 tabular-nums"
                    title="Views"
                  >
                    <Eye className="h-3.5 w-3.5" strokeWidth={1.75} />
                    {formatInsightsNumber(post.views)}
                  </span>
                  <span
                    className="inline-flex items-center gap-1 tabular-nums"
                    title="Comments"
                  >
                    <MessageCircle className="h-3.5 w-3.5" strokeWidth={1.75} />
                    {formatInsightsNumber(post.comments)}
                  </span>
                  <span
                    className="inline-flex items-center gap-1 tabular-nums"
                    title="Reactions"
                  >
                    <Heart className="h-3.5 w-3.5" strokeWidth={1.75} />
                    {formatInsightsNumber(post.likes)}
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </InsightsSectionCard>
  );
}
