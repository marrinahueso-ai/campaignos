import Link from "next/link";
import { InsightsSectionCard } from "@/components/insights/InsightsSectionCard";
import { PlatformIcon } from "@/components/insights/PlatformIcon";
import type { InsightsActivityEvent } from "@/lib/insights/types";

interface LiveActivityFeedProps {
  events: InsightsActivityEvent[];
}

export function LiveActivityFeed({ events }: LiveActivityFeedProps) {
  return (
    <InsightsSectionCard
      title="Recent activity"
      action={
        <Link
          href="/inbox"
          className="text-xs font-medium text-cos-accent hover:text-cos-text"
        >
          Inbox →
        </Link>
      }
    >
      {events.length === 0 ? (
        <p className="text-sm text-cos-muted">No recent social activity yet.</p>
      ) : (
        <ul className="divide-y divide-cos-border">
          {events.slice(0, 5).map((event) => (
            <li key={event.id} className="flex gap-3 py-3 first:pt-0 last:pb-0">
              <PlatformIcon platform={event.platform} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-cos-text">
                  {event.title}
                </p>
                {event.body ? (
                  <p className="mt-0.5 line-clamp-2 text-xs text-cos-muted">
                    {event.body}
                  </p>
                ) : null}
                <p className="mt-1 text-[11px] text-cos-muted">
                  {event.relativeTime}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </InsightsSectionCard>
  );
}
