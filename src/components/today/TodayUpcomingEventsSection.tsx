import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { TodayEventProgress } from "@/types/today";

interface TodayUpcomingEventsSectionProps {
  events: TodayEventProgress[];
}

export function TodayUpcomingEventsSection({
  events,
}: TodayUpcomingEventsSectionProps) {
  return (
    <section className="space-y-6">
      <h2 className="cos-section-title">Upcoming events</h2>
      {events.length === 0 ? (
        <p className="text-sm text-cos-muted">
          Nothing scheduled yet — add one when you&apos;re ready.
        </p>
      ) : (
        <ul>
          {events.map((event, index) => (
            <li key={event.eventId}>
              <div className="space-y-2 py-6 first:pt-0">
                <div className="flex items-start gap-2">
                  <span className="text-lg leading-none" aria-hidden>
                    {eventEmoji(event.title)}
                  </span>
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="text-base font-semibold text-cos-text">
                      {event.title}
                    </p>
                    <p className="text-sm text-cos-muted">{event.statusLine}</p>
                    {event.progressLabel && (
                      <p className="text-sm text-cos-muted">
                        {event.progressLabel}
                      </p>
                    )}
                  </div>
                </div>
                <Link
                  href={event.href}
                  className="inline-flex items-center gap-1 text-sm font-medium text-cos-primary hover:text-cos-primary-hover"
                >
                  Open workspace
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
              {index < events.length - 1 && <hr className="cos-divider" />}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function eventEmoji(title: string): string {
  const lower = title.toLowerCase();
  if (lower.includes("book")) return "📚";
  if (lower.includes("spirit")) return "👕";
  if (lower.includes("teacher")) return "🍎";
  if (lower.includes("fair")) return "🎡";
  if (lower.includes("fundrais")) return "💛";
  if (lower.includes("family")) return "👨‍👩‍👧";
  return "📅";
}
