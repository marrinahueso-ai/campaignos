import type { CalendarEventCategory } from "@/types/calendar-review";
import type { EventType } from "@/types/playbooks";

const TITLE_PATTERNS: { pattern: RegExp; eventType: EventType }[] = [
  { pattern: /\bbook\s*fair\b/i, eventType: "book_fair" },
  { pattern: /\bread[\s-]?a[\s-]?thon\b/i, eventType: "book_fair" },
  { pattern: /\bteacher\s+appreciation\b/i, eventType: "teacher_appreciation" },
  { pattern: /\bstaff\s+appreciation\b/i, eventType: "teacher_appreciation" },
  { pattern: /\bearly\s+release\b/i, eventType: "early_release" },
  { pattern: /\bhalf\s+day\b/i, eventType: "early_release" },
  { pattern: /\bpto\s+meeting\b/i, eventType: "pto_meeting" },
  { pattern: /\bboard\s+meeting\b/i, eventType: "pto_meeting" },
  { pattern: /\bspirit\s+(?:night|wear|day)\b/i, eventType: "spirit_night" },
  { pattern: /\brestaurant\s+night\b/i, eventType: "spirit_night" },
  { pattern: /\bfundrais/i, eventType: "fundraiser" },
  { pattern: /\bfun\s+run\b/i, eventType: "fundraiser" },
  { pattern: /\bauction\b/i, eventType: "fundraiser" },
  { pattern: /\bcarnival\b/i, eventType: "family_event" },
  { pattern: /\bfestival\b/i, eventType: "family_event" },
  { pattern: /\bfall\s+fest\b/i, eventType: "family_event" },
  { pattern: /\bvolunteer\b/i, eventType: "volunteer_drive" },
];

export function inferEventTypeFromTitle(
  title: string,
  category?: CalendarEventCategory | null,
): EventType {
  const normalized = title.trim();
  if (!normalized) {
    return category === "Early Release" ? "early_release" : "general_event";
  }

  for (const { pattern, eventType } of TITLE_PATTERNS) {
    if (pattern.test(normalized)) {
      return eventType;
    }
  }

  if (category === "Early Release") {
    return "early_release";
  }

  if (category === "Holiday") {
    return "holiday";
  }

  if (/\bmeeting\b/i.test(normalized)) {
    return "pto_meeting";
  }

  return "general_event";
}
