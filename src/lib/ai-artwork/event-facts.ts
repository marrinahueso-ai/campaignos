import { formatEventDate, formatEventTime } from "@/lib/utils/dates";
import type { Event } from "@/types";

export interface VerifiedEventFacts {
  title: string;
  date: string | null;
  time: string | null;
  location: string | null;
  audience: string | null;
  description: string | null;
  theme: string | null;
  cta: string | null;
  organizationName: string | null;
}

export function buildVerifiedEventFacts(input: {
  event: Event;
  organizationName?: string | null;
  cta?: string | null;
}): VerifiedEventFacts {
  const { event } = input;

  return {
    title: event.title.trim(),
    date: event.date?.trim() ? formatEventDate(event.date) : null,
    time: formatEventTime(event.time),
    location: event.location?.trim() || null,
    audience: event.audience?.trim() || null,
    description: event.description?.trim() || null,
    theme: event.theme?.trim() || null,
    cta: input.cta?.trim() || null,
    organizationName: input.organizationName?.trim() || null,
  };
}

export function formatVerifiedEventFactsLines(facts: VerifiedEventFacts): string[] {
  const lines: string[] = [`Event title: ${facts.title}`];

  if (facts.date) {
    lines.push(`Date: ${facts.date}`);
  } else {
    lines.push("Date: not on file — do not invent a date");
  }

  if (facts.time) {
    lines.push(`Time: ${facts.time}`);
  } else {
    lines.push("Time: not on file — do not invent a time");
  }

  if (facts.location) {
    lines.push(`Location: ${facts.location}`);
  } else {
    lines.push("Location: not on file — do not invent a location");
  }

  if (facts.audience) {
    lines.push(`Audience: ${facts.audience}`);
  }

  if (facts.description) {
    lines.push(`Description: ${facts.description}`);
  }

  if (facts.theme) {
    lines.push(`Theme: ${facts.theme}`);
  }

  if (facts.cta) {
    lines.push(`CTA (for overlay copy only, not in the image): ${facts.cta}`);
  }

  return lines;
}
