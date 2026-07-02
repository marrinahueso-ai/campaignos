import type { ParsedAiEvent } from "@/lib/calendar-import/parse-types";
import { toLocalDateString } from "@/lib/utils/dates";

const MONTH_MAP: Record<string, number> = {
  january: 1,
  jan: 1,
  february: 2,
  feb: 2,
  march: 3,
  mar: 3,
  april: 4,
  apr: 4,
  may: 5,
  june: 6,
  jun: 6,
  july: 7,
  jul: 7,
  august: 8,
  aug: 8,
  september: 9,
  sep: 9,
  sept: 9,
  october: 10,
  oct: 10,
  november: 11,
  nov: 11,
  december: 12,
  dec: 12,
};

export type SchoolYearRange = { startYear: number; endYear: number };

export function parseSchoolYearRange(schoolYear: string | null | undefined): SchoolYearRange | null {
  if (!schoolYear?.trim()) {
    return null;
  }

  const rangeMatch = schoolYear.match(/(\d{4})\D+(\d{4})/);
  if (rangeMatch) {
    return {
      startYear: Number(rangeMatch[1]),
      endYear: Number(rangeMatch[2]),
    };
  }

  const singleMatch = schoolYear.match(/(\d{4})/);
  if (singleMatch) {
    const startYear = Number(singleMatch[1]);
    return { startYear, endYear: startYear + 1 };
  }

  return null;
}

export function inferYearForMonth(month: number, range: SchoolYearRange | null): number | null {
  if (!range) {
    return null;
  }

  if (month >= 8) {
    return range.startYear;
  }

  return range.endYear;
}

export function normalizeCalendarDate(
  value: string,
  schoolYearRange: SchoolYearRange | null = null,
): string | null {
  const trimmed = value.trim().replace(/\s+/g, " ");

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  const slashMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/);
  if (slashMatch) {
    const month = Number(slashMatch[1]);
    const day = Number(slashMatch[2]);
    const year = slashMatch[3]
      ? Number(slashMatch[3].length === 2 ? `20${slashMatch[3]}` : slashMatch[3])
      : inferYearForMonth(month, schoolYearRange);

    if (!year || month < 1 || month > 12 || day < 1 || day > 31) {
      return null;
    }

    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  const namedMatch = trimmed.match(
    /^([A-Za-z]+)\.?\s+(\d{1,2})(?:,?\s+(\d{4}))?$/,
  );
  if (namedMatch) {
    const month = MONTH_MAP[namedMatch[1]!.toLowerCase()];
    const day = Number(namedMatch[2]);
    const year = namedMatch[3]
      ? Number(namedMatch[3])
      : inferYearForMonth(month, schoolYearRange);

    if (!month || !year || day < 1 || day > 31) {
      return null;
    }

    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return toLocalDateString(parsed);
}

function cleanEventName(name: string): string | null {
  const cleaned = name
    .replace(/\s{2,}/g, " ")
    .replace(/^[\s\-–—:|]+/, "")
    .replace(/[\s\-–—:|]+$/, "")
    .trim();

  if (!cleaned || cleaned.length < 2) {
    return null;
  }

  if (/^(monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/i.test(cleaned)) {
    return null;
  }

  return cleaned;
}

function pushLineEvent(
  events: ParsedAiEvent[],
  seen: Set<string>,
  name: string | null,
  date: string | null,
) {
  if (!name || !date) {
    return;
  }

  const key = `${date}::${name.toLowerCase()}`;
  if (seen.has(key)) {
    return;
  }

  seen.add(key);
  events.push({ name, date, status: "ready" });
}

export function countDateMentions(text: string): number {
  const patterns = [
    /\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\b/g,
    /\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?\s+\d{1,2}(?:,?\s+\d{4})?\b/gi,
  ];

  let count = 0;
  for (const pattern of patterns) {
    count += text.match(pattern)?.length ?? 0;
  }

  return count;
}

export function extractEventsFromLines(
  text: string,
  schoolYear: string | null | undefined,
): ParsedAiEvent[] {
  const range = parseSchoolYearRange(schoolYear);
  const events: ParsedAiEvent[] = [];
  const seen = new Set<string>();

  for (const rawLine of text.split(/\n+/)) {
    const line = rawLine.replace(/\t+/g, "  ").trim();
    if (!line || line.length < 4) {
      continue;
    }

    const slashLeading = line.match(
      /^(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)\s*[-–—:|]?\s*(.+)$/,
    );
    if (slashLeading) {
      pushLineEvent(
        events,
        seen,
        cleanEventName(slashLeading[2]!),
        normalizeCalendarDate(slashLeading[1]!, range),
      );
      continue;
    }

    const slashTrailing = line.match(
      /^(.+?)\s*[-–—:|]\s*(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)\s*$/,
    );
    if (slashTrailing) {
      pushLineEvent(
        events,
        seen,
        cleanEventName(slashTrailing[1]!),
        normalizeCalendarDate(slashTrailing[2]!, range),
      );
      continue;
    }

    const namedLeading = line.match(
      /^((?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?\s+\d{1,2}(?:,?\s+\d{4})?)\s*[-–—:|]?\s*(.+)$/i,
    );
    if (namedLeading) {
      pushLineEvent(
        events,
        seen,
        cleanEventName(namedLeading[2]!),
        normalizeCalendarDate(namedLeading[1]!, range),
      );
      continue;
    }

    const namedTrailing = line.match(
      /^(.+?)\s*[-–—:|]\s*((?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?\s+\d{1,2}(?:,?\s+\d{4})?)\s*$/i,
    );
    if (namedTrailing) {
      pushLineEvent(
        events,
        seen,
        cleanEventName(namedTrailing[1]!),
        normalizeCalendarDate(namedTrailing[2]!, range),
      );
      continue;
    }

    const spacedColumns = line.match(
      /^(.{3,}?)\s{2,}(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)\s*$/,
    );
    if (spacedColumns) {
      pushLineEvent(
        events,
        seen,
        cleanEventName(spacedColumns[1]!),
        normalizeCalendarDate(spacedColumns[2]!, range),
      );
    }
  }

  return events;
}

export function mergeRawEvents(...groups: ParsedAiEvent[][]): ParsedAiEvent[] {
  const merged: ParsedAiEvent[] = [];
  const seen = new Set<string>();

  for (const group of groups) {
    for (const raw of group) {
      const name =
        raw.name?.trim() ||
        raw.title?.trim() ||
        raw.event?.trim() ||
        raw.event_name?.trim();
      const date =
        raw.date?.trim() ||
        raw.event_date?.trim() ||
        raw.start_date?.trim();

      if (!name || !date) {
        continue;
      }

      const key = `${date}::${name.toLowerCase()}`;
      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      merged.push({ ...raw, name, date });
    }
  }

  return merged;
}
