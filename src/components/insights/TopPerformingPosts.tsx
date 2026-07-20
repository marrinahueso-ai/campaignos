import { InsightsSectionCard } from "@/components/insights/InsightsSectionCard";
import { PlatformIcon } from "@/components/insights/PlatformIcon";
import { formatInsightsNumber } from "@/lib/insights/format";
import type { InsightsTopPost } from "@/lib/insights/types";

interface TopPerformingPostsProps {
  posts: InsightsTopPost[];
}

function formatPublishedDate(iso: string | null): string {
  if (!iso) {
    return "—";
  }

  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function TopPerformingPosts({ posts }: TopPerformingPostsProps) {
  return (
    <InsightsSectionCard title="Top performing posts">
      {posts.length === 0 ? (
        <p className="text-sm text-cos-muted">
          No post-level insights stored for this period.
        </p>
      ) : (
        <ul className="divide-y divide-cos-border">
          {posts.map((post, index) => (
            <li
              key={post.id}
              className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cos-bg text-xs font-semibold text-cos-muted">
                {index + 1}
              </span>
              <PlatformIcon
                platform={post.platform}
                className="h-8 w-8 shrink-0 rounded-md text-[10px]"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-cos-text">
                  {post.title}
                </p>
                <p className="text-[11px] text-cos-muted">
                  {formatPublishedDate(post.publishedAt)}
                  {post.placement ? ` · ${post.placement}` : ""}
                </p>
              </div>
              <div className="hidden shrink-0 text-right sm:block">
                <p className="text-sm font-medium tabular-nums text-cos-text">
                  {formatInsightsNumber(post.reach)}
                </p>
                <p className="text-[11px] text-cos-muted">reach</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-medium tabular-nums text-cos-text">
                  {formatInsightsNumber(post.engagement)}
                </p>
                <p className="text-[11px] text-cos-muted">eng</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </InsightsSectionCard>
  );
}
