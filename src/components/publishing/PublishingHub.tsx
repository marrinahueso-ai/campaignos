import { CalendarRange, Send } from "lucide-react";
import { LifecycleHubPage } from "@/components/layout/LifecycleHubPage";
import { Button } from "@/components/ui/Button";
import {
  PublishingItemList,
} from "@/components/publishing/PublishingItemList";
import { publishingListSummary } from "@/lib/publishing/list-summary";
import type { PlanningCalendarItem } from "@/types/communications-calendar";

interface PublishingHubProps {
  queue: PlanningCalendarItem[];
  scheduled: PlanningCalendarItem[];
  published: PlanningCalendarItem[];
  today: string;
}

function sortByScheduledDate(items: PlanningCalendarItem[]): PlanningCalendarItem[] {
  return [...items].sort((left, right) =>
    left.scheduledDate.localeCompare(right.scheduledDate),
  );
}

export function PublishingHub({ queue, scheduled, published, today }: PublishingHubProps) {
  const sortedQueue = sortByScheduledDate(queue);
  const sortedScheduled = sortByScheduledDate(scheduled);
  const sortedPublished = [...published].sort((left, right) =>
    right.scheduledDate.localeCompare(left.scheduledDate),
  );

  return (
    <LifecycleHubPage
      title="Publishing"
      description="Schedule, send, and track communications across channels."
      icon={Send}
      sections={[
        {
          id: "queue",
          title: "Queue",
          description: "Ready to post to Facebook now.",
          count: sortedQueue.length,
          collapsible: true,
          defaultOpen: sortedQueue.length > 0 && sortedQueue.length <= 4,
          collapsedSummary: publishingListSummary(sortedQueue, today),
          content: (
            <PublishingItemList
              items={sortedQueue}
              emptyIcon="send"
              emptyMessage="Nothing in the queue."
              today={today}
            />
          ),
        },
        {
          id: "scheduled",
          title: "Scheduled",
          description: "Posts with a future send date.",
          count: sortedScheduled.length,
          collapsible: true,
          defaultOpen: sortedScheduled.length > 0 && sortedScheduled.length <= 4,
          collapsedSummary: publishingListSummary(sortedScheduled, today),
          content: (
            <PublishingItemList
              items={sortedScheduled}
              emptyIcon="clock"
              emptyMessage="No scheduled posts."
              today={today}
            />
          ),
        },
        {
          id: "calendar",
          title: "Calendar",
          description: "See publishing dates alongside your campaign timeline.",
          defaultOpen: true,
          content: (
            <div className="space-y-3">
              <p className="text-sm text-cos-muted">
                View all events, posts, and deadlines in one place.
              </p>
              <Button href="/calendar" variant="secondary" size="sm">
                <CalendarRange className="h-4 w-4" />
                Open calendar
              </Button>
            </div>
          ),
        },
        {
          id: "published-history",
          title: "Published",
          description: "Posts that already went out.",
          count: sortedPublished.length,
          collapsible: true,
          defaultOpen: false,
          collapsedSummary: publishingListSummary(sortedPublished, today),
          content: (
            <PublishingItemList
              items={sortedPublished}
              emptyIcon="check"
              emptyMessage="Nothing published yet."
              today={today}
            />
          ),
        },
      ]}
    />
  );
}
