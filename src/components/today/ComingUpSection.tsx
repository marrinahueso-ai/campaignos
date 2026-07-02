import Link from "next/link";
import type { TodayWeekEntry } from "@/types/today";

interface ComingUpSectionProps {
  entries: TodayWeekEntry[];
}

export function ComingUpSection({ entries }: ComingUpSectionProps) {
  return (
    <section className="space-y-5">
      <h2 className="cos-section-title">Coming up</h2>
      {entries.length === 0 ? (
        <p className="text-sm text-cos-muted">A quiet week ahead.</p>
      ) : (
        <ul className="space-y-4">
          {entries.map((entry) => (
            <li key={entry.id}>
              {entry.href ? (
                <Link
                  href={entry.href}
                  className="block space-y-0.5 transition-opacity duration-200 hover:opacity-80"
                >
                  <p className="text-xs font-medium tracking-wide text-cos-muted">
                    {weekdayLabel(entry.date)}
                  </p>
                  <p className="text-sm text-cos-text">{comingUpLabel(entry)}</p>
                </Link>
              ) : (
                <div className="space-y-0.5">
                  <p className="text-xs font-medium tracking-wide text-cos-muted">
                    {weekdayLabel(entry.date)}
                  </p>
                  <p className="text-sm text-cos-text">{comingUpLabel(entry)}</p>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function weekdayLabel(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
  });
}

function comingUpLabel(entry: TodayWeekEntry): string {
  if (entry.kind === "event") return entry.title;
  if (entry.kind === "publishing") return "Ready to publish";
  return entry.title.length > 40 ? `${entry.title.slice(0, 37)}…` : entry.title;
}
