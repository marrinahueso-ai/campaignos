import Link from "next/link";
import type { TodayWeekEntry } from "@/types/today";

interface WeekAheadStripProps {
  entries: TodayWeekEntry[];
  today: string;
}

export function WeekAheadStrip({ entries, today }: WeekAheadStripProps) {
  const upcoming = entries.filter((entry) => entry.date >= today);
  if (upcoming.length === 0) {
    return (
      <p className="text-xs leading-relaxed text-cos-muted">A quiet week ahead.</p>
    );
  }

  const grouped = groupByDate(upcoming.slice(0, 8));

  return (
    <div className="space-y-3">
      {grouped.map((group) => (
        <div key={group.date}>
          <p className="mb-1 text-[11px] font-medium tracking-wide text-cos-muted">
            {relativeDayLabel(group.date, today)}
          </p>
          <ul className="space-y-1">
            {group.items.map((entry) => (
              <li key={entry.id}>
                {entry.href ? (
                  <Link
                    href={entry.href}
                    className="block min-h-11 py-2.5 text-sm leading-snug text-cos-text/90 transition-colors hover:text-cos-primary"
                  >
                    {entryLabel(entry)}
                  </Link>
                ) : (
                  <p className="py-2.5 text-sm leading-snug text-cos-text/90">{entryLabel(entry)}</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function groupByDate(entries: TodayWeekEntry[]): Array<{
  date: string;
  items: TodayWeekEntry[];
}> {
  const map = new Map<string, TodayWeekEntry[]>();
  for (const entry of entries) {
    const list = map.get(entry.date) ?? [];
    list.push(entry);
    map.set(entry.date, list);
  }
  return [...map.entries()].map(([date, items]) => ({ date, items }));
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

function entryLabel(entry: TodayWeekEntry): string {
  if (entry.kind === "event") return entry.title;
  if (entry.kind === "publishing") return "Ready to publish";
  if (entry.eventTitle && !entry.title.includes(entry.eventTitle)) {
    return `${entry.title} · ${entry.eventTitle}`;
  }
  return entry.title.length > 48 ? `${entry.title.slice(0, 45)}…` : entry.title;
}
