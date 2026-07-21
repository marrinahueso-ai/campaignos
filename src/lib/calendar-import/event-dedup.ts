import { createHash } from "crypto";
import { normalizeEventNameKey } from "@/lib/calendar-import/import-preferences";
import type {
  CalendarEventReviewStatus,
  CalendarImportSource,
  CalendarReviewEvent,
} from "@/types/calendar-review";

export type ExistingCalendarEventForDedup = {
  id: string;
  title: string;
  date: string;
  importSource?: string | null;
  importExternalId?: string | null;
};

export type ClassifyImportMode = "interactive" | "auto";

export function calendarEventDedupeKey(name: string, date: string): string {
  return `${date}::${normalizeEventNameKey(name)}`;
}

export function externalImportKey(
  importSource: string,
  importExternalId: string,
): string {
  return `${importSource}::${importExternalId.trim()}`;
}

/** Content fingerprint for AI/PDF parses — not a fake ICS UID. */
export function buildAiParseFingerprint(name: string, date: string): string {
  return createHash("sha256")
    .update(calendarEventDedupeKey(name, date))
    .digest("hex")
    .slice(0, 32);
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

/**
 * Mark within-file duplicates using the same normalization as DB title+date keys.
 * First occurrence stays ready (or needs_review); later ones become conflict.
 */
export function markWithinFileConflicts<T extends CalendarReviewEvent>(
  events: T[],
): T[] {
  const seen = new Set<string>();
  return events.map((event) => {
    if (event.status === "needs_review") {
      const key = calendarEventDedupeKey(event.name, event.date);
      seen.add(key);
      return event;
    }

    const key = calendarEventDedupeKey(event.name, event.date);
    if (seen.has(key)) {
      return {
        ...event,
        status: "conflict" as const,
        matchReason: "Duplicate of another row in this import (same title + date).",
      };
    }
    seen.add(key);
    return {
      ...event,
      matchReason: event.matchReason ?? null,
    };
  });
}

export function fieldsMatchExisting(
  incoming: { name: string; date: string },
  existing: { title: string; date: string },
): boolean {
  return (
    calendarEventDedupeKey(incoming.name, incoming.date) ===
    calendarEventDedupeKey(existing.title, existing.date)
  );
}

function buildExternalIndex(
  existing: ExistingCalendarEventForDedup[],
): Map<string, ExistingCalendarEventForDedup> {
  const map = new Map<string, ExistingCalendarEventForDedup>();
  for (const row of existing) {
    const source = row.importSource?.trim();
    const externalId = row.importExternalId?.trim();
    if (!source || !externalId) {
      continue;
    }
    map.set(externalImportKey(source, externalId), row);
  }
  return map;
}

function buildTitleDateIndex(
  existing: ExistingCalendarEventForDedup[],
): Map<string, ExistingCalendarEventForDedup> {
  const map = new Map<string, ExistingCalendarEventForDedup>();
  for (const row of existing) {
    const key = calendarEventDedupeKey(row.title, row.date);
    if (!map.has(key)) {
      map.set(key, row);
    }
  }
  return map;
}

/**
 * Classify parsed review events against existing calendar rows.
 * - Same external id + unchanged → duplicate (skip)
 * - Same external id + title/date changed → update
 * - No external id + title+date match → duplicate
 * - No external id + same title different date → ready (new; no auto-merge)
 */
export function classifyReviewEventsAgainstExisting<
  T extends CalendarReviewEvent,
>(
  events: T[],
  existing: ExistingCalendarEventForDedup[],
  options?: { mode?: ClassifyImportMode },
): T[] {
  const mode = options?.mode ?? "interactive";
  const byExternal = buildExternalIndex(existing);
  const byTitleDate = buildTitleDateIndex(existing);

  return events.map((event) => {
    if (event.status === "conflict") {
      return event;
    }

    const source = event.importSource ?? null;
    const externalId = event.importExternalId?.trim() || null;

    if (source && externalId) {
      const matched = byExternal.get(externalImportKey(source, externalId));
      if (matched) {
        if (fieldsMatchExisting(event, matched)) {
          return {
            ...event,
            status: "duplicate" as const,
            existingEventId: matched.id,
            matchReason: `Already on calendar (same ${source} id).`,
            applyUpdate: false,
          };
        }

        const dateChanged = event.date !== matched.date;
        const titleChanged =
          normalizeEventNameKey(event.name) !==
          normalizeEventNameKey(matched.title);
        const changeBits = [
          dateChanged ? `date ${matched.date} → ${event.date}` : null,
          titleChanged ? "title changed" : null,
        ].filter(Boolean);

        return {
          ...event,
          status: "update" as const,
          existingEventId: matched.id,
          matchReason: `Same ${source} event — ${changeBits.join("; ") || "fields changed"}.`,
          applyUpdate: mode === "auto" ? true : event.applyUpdate !== false,
        };
      }
    }

    const titleDateMatch = byTitleDate.get(
      calendarEventDedupeKey(event.name, event.date),
    );
    if (titleDateMatch) {
      return {
        ...event,
        status: "duplicate" as const,
        existingEventId: titleDateMatch.id,
        matchReason: "Already on calendar (same title + date).",
        applyUpdate: false,
      };
    }

    const status: CalendarEventReviewStatus =
      event.status === "needs_review" ? "needs_review" : "ready";

    return {
      ...event,
      status,
      existingEventId: null,
      matchReason:
        status === "needs_review"
          ? (event.matchReason ?? "Needs review before import.")
          : "New event — will be created.",
      applyUpdate: false,
    };
  });
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

export function partitionClassifiedReviewEvents<T extends CalendarReviewEvent>(
  events: T[],
): {
  toInsert: T[];
  toUpdate: T[];
  skippedDuplicates: T[];
  conflicts: T[];
} {
  const toInsert: T[] = [];
  const toUpdate: T[] = [];
  const skippedDuplicates: T[] = [];
  const conflicts: T[] = [];

  for (const event of events) {
    if (event.status === "conflict") {
      conflicts.push(event);
      continue;
    }
    if (event.status === "duplicate") {
      skippedDuplicates.push(event);
      continue;
    }
    if (event.status === "update") {
      if (event.applyUpdate === false) {
        skippedDuplicates.push(event);
      } else if (event.existingEventId) {
        toUpdate.push(event);
      }
      continue;
    }
    // ready / needs_review → insert
    toInsert.push(event);
  }

  return { toInsert, toUpdate, skippedDuplicates, conflicts };
}

export function isCalendarImportSource(
  value: string | null | undefined,
): value is CalendarImportSource {
  return (
    value === "ics" ||
    value === "google" ||
    value === "subscribe" ||
    value === "ai_parse" ||
    value === "manual"
  );
}
