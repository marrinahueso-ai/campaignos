import Link from "next/link";
import type { TodayWeekEntry } from "@/types/today";

interface ThisWeekSectionProps {
  entries: TodayWeekEntry[];
}

export function ThisWeekSection({ entries }: ThisWeekSectionProps) {
  const grouped = groupByDate(entries);

  return (
    <section className="space-y-6">
      <h2 className="cos-section-title">This week</h2>
      {grouped.length === 0 ? (
        <p className="text-sm text-cos-muted">A quiet week ahead.</p>
      ) : (
        <ol className="space-y-0">
          {grouped.map(({ date, items }, index) => (
            <li key={date}>
              <div className="space-y-3 py-5 first:pt-0">
                <p className="text-xs font-semibold tracking-[0.2em] text-cos-muted">
                  {weekdayLabel(date)}
                </p>
                <ul className="space-y-2">
                  {items.map((item) => (
                    <li key={item.id}>
                      {item.href ? (
                        <Link
                          href={item.href}
                          className="text-base text-cos-text hover:text-cos-primary"
                        >
                          {timelineLabel(item)}
                        </Link>
                      ) : (
                        <p className="text-base text-cos-text">
                          {timelineLabel(item)}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
              {index < grouped.length - 1 && (
                <hr className="cos-divider" />
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function groupByDate(entries: TodayWeekEntry[]) {
  const map = new Map<string, TodayWeekEntry[]>();
  for (const entry of entries) {
    const list = map.get(entry.date) ?? [];
    list.push(entry);
    map.set(entry.date, list);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, items]) => ({ date, items }));
}

function weekdayLabel(date: string): string {
  return new Date(`${date}T12:00:00`)
    .toLocaleDateString("en-US", { weekday: "long" })
    .toUpperCase();
}

function timelineLabel(item: TodayWeekEntry): string {
  if (item.kind === "event") return item.title;
  if (item.kind === "publishing") return "Ready to publish";
  return simplifyCommunicationTitle(item.title);
}

function simplifyCommunicationTitle(title: string): string {
  const channelHints: [RegExp, string][] = [
    [/facebook/i, "Facebook Feed"],
    [/instagram/i, "Instagram Story"],
    [/newsletter/i, "Newsletter"],
    [/website/i, "Website"],
    [/email/i, "Email"],
    [/flyer/i, "Flyer"],
  ];

  for (const [pattern, label] of channelHints) {
    if (pattern.test(title)) return label;
  }

  return title.length > 40 ? `${title.slice(0, 37)}…` : title;
}
