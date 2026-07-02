import { randomUUID } from "crypto";
import { defaultStrategyForCalendarImport } from "@/lib/events/communication-strategy";
import { inferEventTypeFromTitle } from "@/lib/events/event-type-inference";
import { normalizeCalendarReviewEvents } from "@/lib/calendar-import/review-event-normalize";
import type {
  CalendarEventCategory,
  CalendarReviewEvent,
} from "@/types/calendar-review";

const HOLIDAY_TITLE_PATTERN =
  /\b(no school|holiday|break|vacation|teacher workday|staff (?:development|planning|workday|inservice|in-service)|professional development|pd day|memorial day|labor day|thanksgiving|christmas|winter break|spring break|summer break)\b/i;

const EARLY_RELEASE_TITLE_PATTERN = /\bearly\s+release\b|\bhalf\s+day\b/i;

const PTO_TITLE_PATTERN =
  /\bpto\b|\bparent[\s-]?teacher\b|\bfundrais|\bspirit\s+(?:night|wear|day)\b|\bvolunteer\b|\bcarnival\b|\bfestival\b|\bbook\s*fair\b/i;

type ParsedIcsEvent = {
  name: string;
  date: string;
  category: CalendarEventCategory;
};

function unfoldIcsLines(text: string): string[] {
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const unfolded = normalized.replace(/\n[ \t]/g, "");
  return unfolded.split("\n");
}

function parseIcsDateValue(raw: string): string | null {
  const value = raw.trim();
  if (!value) {
    return null;
  }

  const datePart = value.includes("T") ? value.split("T")[0]! : value;
  const digits = datePart.replace(/\D/g, "");

  if (digits.length < 8) {
    return null;
  }

  const year = digits.slice(0, 4);
  const month = digits.slice(4, 6);
  const day = digits.slice(6, 8);

  if (!/^\d{4}$/.test(year) || !/^\d{2}$/.test(month) || !/^\d{2}$/.test(day)) {
    return null;
  }

  return `${year}-${month}-${day}`;
}

function getIcsPropertyValue(
  lines: string[],
  property: string,
): string | null {
  const prefix = `${property}:`;
  const prefixWithParams = `${property};`;

  for (const line of lines) {
    if (line.startsWith(prefix)) {
      return line.slice(prefix.length).trim();
    }
    if (line.startsWith(prefixWithParams)) {
      const colonIndex = line.indexOf(":");
      if (colonIndex >= 0) {
        return line.slice(colonIndex + 1).trim();
      }
    }
  }

  return null;
}

function inferCategoryFromTitle(title: string): CalendarEventCategory {
  const normalized = title.trim();

  if (EARLY_RELEASE_TITLE_PATTERN.test(normalized)) {
    return "Early Release";
  }

  if (HOLIDAY_TITLE_PATTERN.test(normalized)) {
    return "Holiday";
  }

  const eventType = inferEventTypeFromTitle(normalized);

  if (eventType === "early_release") {
    return "Early Release";
  }

  if (eventType === "holiday") {
    return "Holiday";
  }

  if (
    eventType === "pto_meeting" ||
    eventType === "fundraiser" ||
    eventType === "spirit_night" ||
    eventType === "book_fair" ||
    eventType === "teacher_appreciation" ||
    eventType === "family_event" ||
    eventType === "volunteer_drive" ||
    PTO_TITLE_PATTERN.test(normalized)
  ) {
    return "PTO Event";
  }

  return "School Event";
}

function parseVeventBlock(block: string): ParsedIcsEvent | null {
  const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);

  const summary = getIcsPropertyValue(lines, "SUMMARY");
  const dtStart = getIcsPropertyValue(lines, "DTSTART");

  if (!summary || !dtStart) {
    return null;
  }

  const date = parseIcsDateValue(dtStart);
  if (!date) {
    return null;
  }

  const name = summary.replace(/\\n/g, " ").replace(/\\,/g, ",").trim();
  if (!name) {
    return null;
  }

  return {
    name,
    date,
    category: inferCategoryFromTitle(name),
  };
}

function extractVeventBlocks(text: string): string[] {
  const blocks: string[] = [];
  const unfolded = unfoldIcsLines(text).join("\n");
  const pattern = /BEGIN:VEVENT([\s\S]*?)END:VEVENT/gi;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(unfolded)) !== null) {
    blocks.push(match[1] ?? "");
  }

  return blocks;
}

export function parseIcsToReviewEvents(
  icsText: string,
  _schoolYearLabel?: string | null,
): CalendarReviewEvent[] {
  const blocks = extractVeventBlocks(icsText);
  const seen = new Set<string>();
  const events: CalendarReviewEvent[] = [];

  for (const block of blocks) {
    const parsed = parseVeventBlock(block);
    if (!parsed) {
      continue;
    }

    const dedupeKey = `${parsed.date}::${parsed.name.toLowerCase()}`;
    const status = seen.has(dedupeKey) ? "conflict" : "ready";
    seen.add(dedupeKey);

    events.push({
      id: randomUUID(),
      name: parsed.name,
      date: parsed.date,
      category: parsed.category,
      status,
      eventType: inferEventTypeFromTitle(parsed.name, parsed.category),
      communicationStrategy: defaultStrategyForCalendarImport(
        parsed.name,
        parsed.category,
      ),
    });
  }

  return normalizeCalendarReviewEvents(
    events.sort((left, right) => left.date.localeCompare(right.date)),
  );
}
