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
    year: "numeric",
  });
}

export function TopPerformingPosts({ posts }: TopPerformingPostsProps) {
  return (
    <InsightsSectionCard title="Top Performing Posts">
      {posts.length === 0 ? (
        <p className="text-sm text-cos-muted">
          No post-level insights stored for this period.
        </p>
      ) : (
        <ul className="space-y-4">
          {posts.map((post) => (
            <li
              key={post.id}
              className="border-b border-cos-border pb-4 last:border-b-0 last:pb-0"
            >
              <div className="flex items-start gap-3">
                <PlatformIcon platform={post.platform} className="h-10 w-10 rounded-none text-xs" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-cos-text">
                    {post.title}
                  </p>
                  <p className="text-[11px] text-cos-muted">
                    {formatPublishedDate(post.publishedAt)}
                  </p>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-cos-muted">Reach</p>
                      <p className="font-medium text-cos-text">
                        {formatInsightsNumber(post.reach)}
                      </p>
                    </div>
                    <div>
                      <p className="text-cos-muted">Eng.</p>
                      <p className="font-medium text-cos-text">
                        {formatInsightsNumber(post.engagement)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </InsightsSectionCard>
  );
}
