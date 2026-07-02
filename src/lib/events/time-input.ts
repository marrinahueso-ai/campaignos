import { parseLocalDate } from "@/lib/utils/dates";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_24_PATTERN = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/;
const TIME_12_PATTERN = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i;

function toPostgresTime(hours: number, minutes: number): string | null {
  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`;
}

export function parseEventDateInput(
  raw: string | null | undefined,
): { date: string } | { error: string } {
  const value = raw?.trim() ?? "";

  if (!value) {
    return { error: "Event date is required." };
  }

  if (!DATE_PATTERN.test(value)) {
    return { error: "Enter a valid event date." };
  }

  const parsed = parseLocalDate(value);
  if (Number.isNaN(parsed.getTime())) {
    return { error: "Enter a valid event date." };
  }

  return { date: value };
}

export function parseEventTimeInput(
  raw: string | null | undefined,
): { time: string | null } | { error: string } {
  const value = raw?.trim() ?? "";
  if (!value) {
    return { time: null };
  }

  const match24 = value.match(TIME_24_PATTERN);
  if (match24) {
    const time = toPostgresTime(Number(match24[1]), Number(match24[2]));
    if (!time) {
      return { error: "Enter a valid event time, like 5:20 PM or 17:20." };
    }
    return { time };
  }

  const match12 = value.match(TIME_12_PATTERN);
  if (match12) {
    let hours = Number(match12[1]);
    const minutes = Number(match12[2]);
    const meridiem = match12[3].toUpperCase();

    if (hours < 1 || hours > 12 || minutes > 59) {
      return { error: "Enter a valid event time, like 5:20 PM or 17:20." };
    }

    if (meridiem === "AM") {
      if (hours === 12) {
        hours = 0;
      }
    } else if (hours !== 12) {
      hours += 12;
    }

    const time = toPostgresTime(hours, minutes);
    if (!time) {
      return { error: "Enter a valid event time, like 5:20 PM or 17:20." };
    }
    return { time };
  }

  return { error: "Enter a valid event time, like 5:20 PM or 17:20." };
}

export function formatEventTimeForInput(time: string | null | undefined): string {
  if (!time?.trim()) {
    return "";
  }

  const match = time.trim().match(TIME_24_PATTERN);
  if (!match) {
    return time.trim();
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);

  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}
