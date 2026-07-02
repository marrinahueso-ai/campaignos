import { normalizeEventNameKey } from "@/lib/calendar-import/import-preferences";

export function calendarEventDedupeKey(name: string, date: string): string {
  return `${date}::${normalizeEventNameKey(name)}`;
}

export function buildCalendarEventDedupeKeySet(
  events: { name?: string; title?: string; date: string }[],
): Set<string> {
  const keys = new Set<string>();
  for (const event of events) {
    const name = event.name ?? event.title ?? "";
    if (name && event.date) {
      keys.add(calendarEventDedupeKey(name, event.date));
    }
  }
  return keys;
}

export function filterDuplicateReviewEvents<T extends { name: string; date: string }>(
  events: T[],
  existingKeys: Set<string>,
): { newEvents: T[]; skippedCount: number } {
  const newEvents: T[] = [];
  let skippedCount = 0;

  for (const event of events) {
    const key = calendarEventDedupeKey(event.name, event.date);
    if (existingKeys.has(key)) {
      skippedCount += 1;
      continue;
    }

    newEvents.push(event);
    existingKeys.add(key);
  }

  return { newEvents, skippedCount };
}
