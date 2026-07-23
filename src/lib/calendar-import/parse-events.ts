import { randomUUID } from "crypto";
import { generateText } from "@/lib/ai/provider";
import {
  countDateMentions,
  extractEventsFromLines,
  mergeRawEvents,
  normalizeCalendarDate,
  parseSchoolYearRange,
} from "@/lib/calendar-import/extract-date-lines";
import type { ParsedAiEvent } from "@/lib/calendar-import/parse-types";
import {
  buildAiParseFingerprint,
  markWithinFileConflicts,
} from "@/lib/calendar-import/event-dedup";
import {
  normalizeCalendarReviewEvent,
  normalizeCalendarReviewEvents,
} from "@/lib/calendar-import/review-event-normalize";
import { defaultStrategyForCalendarImport } from "@/lib/events/communication-strategy";
import type {
  CalendarEventCategory,
  CalendarEventReviewStatus,
  CalendarImportSource,
  CalendarReviewEvent,
} from "@/types/calendar-review";

const VALID_CATEGORIES: CalendarEventCategory[] = [
  "PTO Event",
  "School Event",
  "Holiday",
  "Early Release",
];

const CALENDAR_PARSE_MAX_TOKENS = 16_384;
const TARGET_CHUNK_SIZE = 5_000;

function normalizeRawEvent(
  raw: ParsedAiEvent,
  schoolYear: string | null | undefined,
): {
  name: string | null;
  date: string | null;
  category?: string;
  status?: string;
} {
  const name =
    raw.name?.trim() ||
    raw.title?.trim() ||
    raw.event?.trim() ||
    raw.event_name?.trim() ||
    null;

  const dateValue =
    raw.date?.trim() ||
    raw.event_date?.trim() ||
    raw.start_date?.trim() ||
    null;

  return {
    name,
    date: dateValue
      ? normalizeCalendarDate(dateValue, parseSchoolYearRange(schoolYear))
      : null,
    category: raw.category,
    status: raw.status,
  };
}

function normalizeCategory(value: string | undefined): CalendarEventCategory {
  const match = VALID_CATEGORIES.find(
    (category) => category.toLowerCase() === value?.trim().toLowerCase(),
  );
  return match ?? "School Event";
}

function normalizeStatus(value: string | undefined): CalendarEventReviewStatus {
  if (
    value === "conflict" ||
    value === "needs_review" ||
    value === "duplicate" ||
    value === "update"
  ) {
    return value;
  }
  return "ready";
}

function normalizeImportSource(
  value: string | null | undefined,
): CalendarImportSource | null {
  if (
    value === "ics" ||
    value === "google" ||
    value === "subscribe" ||
    value === "ai_parse" ||
    value === "manual"
  ) {
    return value;
  }
  return null;
}

function recoverTruncatedEventsJson(text: string): ParsedAiEvent[] | null {
  const eventsKey = text.indexOf('"events"');
  const arrayStart = text.indexOf("[", eventsKey >= 0 ? eventsKey : 0);
  if (arrayStart < 0) {
    return null;
  }

  let slice = text.slice(arrayStart);
  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      const parsed = JSON.parse(`${slice}]`) as ParsedAiEvent[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    } catch {
      // trim back to last complete object
    }

    const lastBrace = slice.lastIndexOf("}");
    if (lastBrace <= 0) {
      break;
    }
    slice = slice.slice(0, lastBrace + 1);
  }

  return null;
}

function extractJsonArray(text: string): ParsedAiEvent[] | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1]?.trim() ?? text.trim();

  try {
    const parsed = JSON.parse(candidate) as { events?: ParsedAiEvent[] } | ParsedAiEvent[];
    if (Array.isArray(parsed)) {
      return parsed;
    }
    if (Array.isArray(parsed.events)) {
      return parsed.events;
    }
  } catch {
    const arrayMatch = candidate.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      try {
        return JSON.parse(arrayMatch[0]) as ParsedAiEvent[];
      } catch {
        return recoverTruncatedEventsJson(candidate);
      }
    }

    return recoverTruncatedEventsJson(candidate);
  }

  return null;
}

export function mapParsedEvents(
  rawEvents: ParsedAiEvent[],
  schoolYear?: string | null,
): CalendarReviewEvent[] {
  const events: CalendarReviewEvent[] = [];

  for (const raw of rawEvents) {
    const normalized = normalizeRawEvent(raw, schoolYear);
    if (!normalized.name || !normalized.date) {
      continue;
    }

    const category = normalizeCategory(normalized.category);
    const fingerprint = buildAiParseFingerprint(
      normalized.name,
      normalized.date,
    );

    events.push(
      normalizeCalendarReviewEvent({
        id: randomUUID(),
        name: normalized.name,
        date: normalized.date,
        category,
        status: normalizeStatus(normalized.status),
        communicationStrategy: defaultStrategyForCalendarImport(
          normalized.name,
          category,
        ),
        importSource: "ai_parse",
        importExternalId: fingerprint,
        matchReason: null,
      }),
    );
  }

  return markWithinFileConflicts(events).sort((left, right) =>
    left.date.localeCompare(right.date),
  );
}

function splitCalendarText(text: string): string[] {
  const monthPattern =
    /(?=(?:^|\n)\s*(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan(?:\.|uary)?|Feb(?:\.|ruary)?|Mar(?:\.|ch)?|Apr(?:\.|il)?|May|Jun(?:\.|e)?|Jul(?:\.|y)?|Aug(?:\.|ust)?|Sep(?:\.|t(?:\.|ember)?)?|Oct(?:\.|ober)?|Nov(?:\.|ember)?|Dec(?:\.|ember)?)(?:\s+\d{4})?\b)/gim;

  const monthParts = text.split(monthPattern).map((part) => part.trim()).filter(Boolean);

  if (monthParts.length >= 2) {
    const chunks: string[] = [];
    let current = "";

    for (const part of monthParts) {
      if (`${current}\n${part}`.length > TARGET_CHUNK_SIZE && current) {
        chunks.push(current.trim());
        current = part;
      } else {
        current = current ? `${current}\n${part}` : part;
      }
    }

    if (current.trim()) {
      chunks.push(current.trim());
    }

    return chunks.length > 0 ? chunks : [text];
  }

  if (text.length <= TARGET_CHUNK_SIZE) {
    return [text];
  }

  const chunks: string[] = [];
  for (let index = 0; index < text.length; index += TARGET_CHUNK_SIZE) {
    chunks.push(text.slice(index, index + TARGET_CHUNK_SIZE));
  }

  return chunks;
}

const PARSE_SYSTEM_PROMPT = `You extract school calendar events from uploaded documents for a PTO communication app.

Return ONLY valid JSON in this shape:
{
  "events": [
    {
      "name": "Labor Day — No School",
      "date": "2025-09-01",
      "category": "Holiday",
      "status": "ready"
    }
  ]
}

Rules:
- Extract EVERY row or line that has a date. Do not skip any dated entry.
- Use ISO dates YYYY-MM-DD. Infer the year from the school year when missing.
- category must be one of: "PTO Event", "School Event", "Holiday", "Early Release".
- Include holidays, early release days, picture days, conferences, PTO meetings, fundraisers, and school events.
- Skip generic headers or month labels with no specific event.
- Mark uncertain dates or ambiguous titles with status "needs_review".
- Keep names short. Omit notes unless critical.`;

async function parseCalendarChunkWithAi(
  text: string,
  schoolYear: string | null | undefined,
  chunkLabel?: string,
): Promise<{ rawEvents: ParsedAiEvent[]; truncated: boolean }> {
  const result = await generateText({
    systemPrompt: PARSE_SYSTEM_PROMPT,
    userPrompt: `School year: ${schoolYear ?? "unknown"}
${chunkLabel ? `Section: ${chunkLabel}\n` : ""}
Extract EVERY dated calendar entry from this section. Missing none is critical.

${text}`,
    maxTokens: CALENDAR_PARSE_MAX_TOKENS,
    temperature: 0.05,
    jsonMode: true,
    usage: {
      actionType: "calendar_import_parse",
      feature: "calendar_import_parse",
    },
  });

  const truncated =
    (result.completionTokens ?? 0) >= CALENDAR_PARSE_MAX_TOKENS - 64;

  if (!result.success || !result.text) {
    return { rawEvents: [], truncated };
  }

  return {
    rawEvents: extractJsonArray(result.text) ?? [],
    truncated,
  };
}

async function parseChunkRecursive(
  text: string,
  schoolYear: string | null | undefined,
  chunkLabel: string,
  depth = 0,
): Promise<ParsedAiEvent[]> {
  const { rawEvents, truncated } = await parseCalendarChunkWithAi(
    text,
    schoolYear,
    chunkLabel,
  );

  const dateMentions = countDateMentions(text);
  const underExtracted =
    dateMentions >= 4 &&
    rawEvents.length < Math.max(3, Math.floor(dateMentions * 0.55));

  if ((truncated || underExtracted) && text.length > 900 && depth < 5) {
    const midpoint = Math.floor(text.length / 2);
    const splitAt = text.lastIndexOf("\n", midpoint);
    const splitPoint = splitAt > 400 ? splitAt : midpoint;
    const left = text.slice(0, splitPoint).trim();
    const right = text.slice(splitPoint).trim();

    if (left && right) {
      const [leftEvents, rightEvents] = await Promise.all([
        parseChunkRecursive(left, schoolYear, `${chunkLabel}-a`, depth + 1),
        parseChunkRecursive(right, schoolYear, `${chunkLabel}-b`, depth + 1),
      ]);
      return mergeRawEvents(leftEvents, rightEvents);
    }
  }

  return rawEvents;
}

export async function parseCalendarTextWithAi(
  text: string,
  schoolYear?: string | null,
): Promise<{ events: CalendarReviewEvent[]; error: string | null }> {
  const trimmed = text.trim();

  if (!trimmed) {
    return { events: [], error: "The calendar file did not contain readable text." };
  }

  const lineEvents = extractEventsFromLines(trimmed, schoolYear);
  const chunks = splitCalendarText(trimmed.slice(0, 200_000));
  const aiGroups: ParsedAiEvent[][] = [];

  for (let index = 0; index < chunks.length; index += 1) {
    const chunk = chunks[index]!;
    const chunkEvents = await parseChunkRecursive(
      chunk,
      schoolYear,
      chunks.length > 1 ? `part ${index + 1} of ${chunks.length}` : "full document",
    );
    aiGroups.push(chunkEvents);
  }

  const mergedRaw = mergeRawEvents(lineEvents, ...aiGroups);
  const events = mapParsedEvents(mergedRaw, schoolYear);

  if (!events.length) {
    return {
      events: [],
      error: "No events were found in the calendar file.",
    };
  }

  const expectedDates = countDateMentions(trimmed);
  if (expectedDates >= 10 && events.length < expectedDates * 0.65) {
    console.warn("Calendar parse may be incomplete", {
      parsedEvents: events.length,
      dateMentions: expectedDates,
      lineEvents: lineEvents.length,
      aiEvents: aiGroups.reduce((sum, group) => sum + group.length, 0),
      chunks: chunks.length,
    });
  }

  return { events, error: null };
}

export async function refineCalendarEventsWithAi(
  text: string,
  currentEvents: CalendarReviewEvent[],
  userMessage: string,
): Promise<{ events: CalendarReviewEvent[]; error: string | null }> {
  const result = await generateText({
    systemPrompt: `${PARSE_SYSTEM_PROMPT}

You are refining an existing parsed event list based on user feedback.
Preserve valid events unless the user asks to remove or change them.
Return the full updated events array.`,
    userPrompt: `Original document excerpt:
${text.trim().slice(0, 40_000)}

Current parsed events:
${JSON.stringify(currentEvents, null, 2)}

User request:
${userMessage.trim()}

Return the corrected full events list as JSON.`,
    maxTokens: CALENDAR_PARSE_MAX_TOKENS,
    temperature: 0.05,
    jsonMode: true,
    usage: {
      actionType: "calendar_import_parse",
      feature: "calendar_import_refine",
    },
  });

  if (!result.success || !result.text) {
    return {
      events: currentEvents,
      error: result.error ?? "Could not refine the calendar list right now.",
    };
  }

  const rawEvents = extractJsonArray(result.text);
  if (!rawEvents?.length) {
    return {
      events: currentEvents,
      error: "The assistant did not return an updated event list.",
    };
  }

  return { events: mapParsedEvents(rawEvents), error: null };
}

export function parseRawReviewEvents(value: unknown): CalendarReviewEvent[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (!item || typeof item !== "object") {
      return [];
    }

    const record = item as Partial<CalendarReviewEvent>;
    if (
      typeof record.id !== "string" ||
      typeof record.name !== "string" ||
      typeof record.date !== "string" ||
      typeof record.category !== "string"
    ) {
      return [];
    }

    const category = normalizeCategory(record.category);
    return [
      {
        id: record.id,
        name: record.name,
        date: record.date,
        category,
        status: normalizeStatus(record.status),
        eventType: record.eventType ?? null,
        communicationStrategy: record.communicationStrategy ?? "full_campaign",
        playbookId:
          typeof record.playbookId === "string" ? record.playbookId : null,
        planManuallySet: record.planManuallySet === true,
        importSource: normalizeImportSource(record.importSource),
        importExternalId:
          typeof record.importExternalId === "string"
            ? record.importExternalId
            : null,
        existingEventId:
          typeof record.existingEventId === "string"
            ? record.existingEventId
            : null,
        matchReason:
          typeof record.matchReason === "string" ? record.matchReason : null,
        applyUpdate:
          normalizeStatus(record.status) === "update"
            ? record.applyUpdate !== false
            : record.applyUpdate === true,
      } satisfies CalendarReviewEvent,
    ];
  });
}

export function parseStoredReviewEvents(value: unknown): CalendarReviewEvent[] {
  return normalizeCalendarReviewEvents(parseRawReviewEvents(value));
}
