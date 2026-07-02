import { CheckCircle2, Circle } from "lucide-react";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { formatDateTime } from "@/lib/utils/dates";
import { cn } from "@/lib/utils/cn";
import type { ActivityLogEntry } from "@/types/event-workspace";

interface TimelineSectionProps {
  timeline: ActivityLogEntry[];
}

export function TimelineSection({ timeline }: TimelineSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity</CardTitle>
        <CardDescription>
          Recent campaign activity from setup through approval and publication.
        </CardDescription>
      </CardHeader>

      <ol className="space-y-0">
        {timeline.map((entry, index) => {
          const isLast = index === timeline.length - 1;
          const isComplete = index < timeline.length - 2;

          return (
            <li key={entry.id} className="relative flex gap-4 pb-8 last:pb-0">
              {!isLast && (
                <span
                  aria-hidden
                  className="absolute left-[15px] top-8 h-[calc(100%-1rem)] w-px bg-cos-border"
                />
              )}

              <div
                className={cn(
                  "relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border",
                  isComplete
                    ? "border-emerald-200 bg-emerald-50 text-emerald-600"
                    : "border-cos-border bg-white text-cos-dark-muted",
                )}
              >
                {isComplete ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <Circle className="h-4 w-4" />
                )}
              </div>

              <div className="min-w-0 pt-0.5">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <p className="font-medium text-cos-text">{entry.title}</p>
                  <p className="text-xs text-cos-dark-muted">
                    {formatDateTime(entry.occurredAt)}
                  </p>
                </div>
                {entry.description && (
                  <p className="mt-1 text-sm text-cos-muted">{entry.description}</p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}
