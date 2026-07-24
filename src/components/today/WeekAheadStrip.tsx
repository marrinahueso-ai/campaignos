import Link from "next/link";
import type { TodayWeekEntry } from "@/types/today";

interface WeekAheadStripProps {
  entries: TodayWeekEntry[];
  today: string;
}

export function WeekAheadStrip({ entries, today }: WeekAheadStripProps) {
  const upcoming = entries
    .filter((entry) => entry.date >= today && entry.kind === "event")
    .slice(0, 6);

  if (upcoming.length === 0) {
    return (
      <p className="text-sm leading-relaxed text-cos-muted">
        A quiet week ahead.
      </p>
    );
  }

  return (
    <ul className="space-y-2.5">
      {upcoming.map((entry) => {
        const day = relativeDayLabel(entry.date, today);
        const title = entry.title;
        const row = (
          <>
            <span className="font-semibold text-cos-brand-navy">{day}</span>
            <span className="text-cos-muted"> · </span>
            <span className="text-cos-muted">{title}</span>
          </>
        );

        return (
          <li key={entry.id} className="text-sm leading-snug">
            {entry.href ? (
              <Link
                href={entry.href}
                className="transition-colors hover:text-cos-brand-navy [&_span:last-child]:hover:text-cos-brand-navy"
              >
                {row}
              </Link>
            ) : (
              <p>{row}</p>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function relativeDayLabel(date: string, today: string): string {
  if (date === today) return "Today";

  const todayDate = new Date(`${today}T12:00:00`);
  const target = new Date(`${date}T12:00:00`);
  const diff = Math.round(
    (target.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diff === 1) return "Tomorrow";
  return target.toLocaleDateString("en-US", { weekday: "long" });
}
