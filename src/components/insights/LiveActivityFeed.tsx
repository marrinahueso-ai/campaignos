import Link from "next/link";
import { InsightsSectionCard } from "@/components/insights/InsightsSectionCard";
import { PlatformIcon } from "@/components/insights/PlatformIcon";
import type { InsightsActivityEvent } from "@/lib/insights/types";

interface LiveActivityFeedProps {
  events: InsightsActivityEvent[];
}

export function LiveActivityFeed({ events }: LiveActivityFeedProps) {
  return (
    <InsightsSectionCard title="Recent Activity">
      {events.length === 0 ? (
        <p className="text-sm text-cos-muted">
          No recent social activity synced yet.
        </p>
      ) : (
        <ul className="space-y-4">
          {events.map((event) => (
            <li key={event.id} className="flex gap-3">
              <PlatformIcon platform={event.platform} />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-cos-text">{event.title}</p>
                {event.body ? (
                  <p className="mt-1 line-clamp-2 text-xs text-cos-muted">{event.body}</p>
                ) : null}
                <p className="mt-1 text-[11px] text-cos-muted">{event.relativeTime}</p>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Link
        href="/communications"
        className="inline-flex text-xs font-medium text-cos-accent hover:text-cos-text"
      >
        View all activity →
      </Link>
    </InsightsSectionCard>
  );
}
