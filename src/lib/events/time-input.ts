import { parseLocalDate } from "@/lib/utils/dates";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_24_PATTERN = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/;
const TIME_12_WITH_MINUTES_PATTERN =
  /^(\d{1,2}):(\d{2})\s*([ap](?:m)?)\.?$/i;
const TIME_COMPACT_PATTERN = /^(\d{1,4})\s*([ap](?:m)?)\.?$/i;
const TIME_HOUR_MERIDIEM_PATTERN = /^(\d{1,2})\s+([ap](?:m)?)\.?$/i;

export const EVENT_TIME_INPUT_HINT =
  "Optional. Examples: 6p, 6:15 PM, 17:20";

export const EVENT_TIME_INPUT_ERROR =
  "Enter a valid event time, like 6p, 6:15 PM, or 17:20.";

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

function parseMeridiem(raw: string): "AM" | "PM" | null {
  const value = raw.trim().toLowerCase();
  if (value.startsWith("a")) {
    return "AM";
  }
  if (value.startsWith("p")) {
    return "PM";
  }
  return null;
}

function convert12HourClock(
  hours: number,
  minutes: number,
  meridiem: "AM" | "PM",
): string | null {
  if (hours < 1 || hours > 12 || minutes > 59) {
    return null;
  }

  let hour24 = hours;
  if (meridiem === "AM") {
    if (hours === 12) {
      hour24 = 0;
    }
  } else if (hours !== 12) {
    hour24 += 12;
  }

  return toPostgresTime(hour24, minutes);
}

function parseCompact12HourTime(
  digits: string,
): { hours: number; minutes: number } | null {
  if (digits.length <= 2) {
    const hours = Number(digits);
    if (hours < 1 || hours > 12) {
      return null;
    }
    return { hours, minutes: 0 };
  }

  if (digits.length === 3) {
    const hours = Number(digits.slice(0, 1));
    const minutes = Number(digits.slice(1));
    if (hours < 1 || hours > 12 || minutes > 59) {
      return null;
    }
    return { hours, minutes };
  }

  if (digits.length === 4) {
    const hours = Number(digits.slice(0, 2));
    const minutes = Number(digits.slice(2));
    if (hours < 1 || hours > 12 || minutes > 59) {
      return null;
    }
    return { hours, minutes };
  }

  return null;
}

function parse12HourTimeInput(
  value: string,
): { time: string } | { error: string } {
  const withMinutes = value.match(TIME_12_WITH_MINUTES_PATTERN);
  if (withMinutes) {
    const meridiem = parseMeridiem(withMinutes[3]);
    if (!meridiem) {
      return { error: EVENT_TIME_INPUT_ERROR };
    }

    const time = convert12HourClock(
      Number(withMinutes[1]),
      Number(withMinutes[2]),
      meridiem,
    );
    if (!time) {
      return { error: EVENT_TIME_INPUT_ERROR };
    }
    return { time };
  }

  const compact = value.match(TIME_COMPACT_PATTERN);
  if (compact) {
    const meridiem = parseMeridiem(compact[2]);
    if (!meridiem) {
      return { error: EVENT_TIME_INPUT_ERROR };
    }

    const clock = parseCompact12HourTime(compact[1]);
    if (!clock) {
      return { error: EVENT_TIME_INPUT_ERROR };
    }

    const time = convert12HourClock(clock.hours, clock.minutes, meridiem);
    if (!time) {
      return { error: EVENT_TIME_INPUT_ERROR };
    }
    return { time };
  }

  const hourWithSpace = value.match(TIME_HOUR_MERIDIEM_PATTERN);
  if (hourWithSpace) {
    const meridiem = parseMeridiem(hourWithSpace[2]);
    if (!meridiem) {
      return { error: EVENT_TIME_INPUT_ERROR };
    }

    const time = convert12HourClock(Number(hourWithSpace[1]), 0, meridiem);
    if (!time) {
      return { error: EVENT_TIME_INPUT_ERROR };
    }
    return { time };
  }

  return { error: EVENT_TIME_INPUT_ERROR };
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
      return { error: EVENT_TIME_INPUT_ERROR };
    }
    return { time };
  }

  return parse12HourTimeInput(value);
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
