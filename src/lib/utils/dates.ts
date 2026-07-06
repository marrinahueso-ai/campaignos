/** Parse YYYY-MM-DD as a local calendar date (no UTC shift). */
export function parseLocalDate(date: string): Date {
  const normalized = normalizeDateOnly(date);
  const [yearText, monthText, dayText] = normalized.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);

  return new Date(year, month - 1, day);
}

export function toLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function normalizeDateOnly(value: string): string {
  return value.split("T")[0] ?? value;
}

/** Convert an ISO timestamp to a local YYYY-MM-DD (not UTC midnight). */
export function isoToLocalDateOnly(iso: string): string {
  return toLocalDateString(new Date(iso));
}

export function addDaysToDateOnly(date: string, days: number): string {
  const parsed = parseLocalDate(date);
  parsed.setDate(parsed.getDate() + days);
  return toLocalDateString(parsed);
}

export function getTodayDateString(): string {
  return toLocalDateString(new Date());
}

export function formatEventDate(date: string): string {
  return parseLocalDate(date).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatEventTime(time: string | null): string | null {
  if (!time) return null;

  const [hours, minutes] = time.split(":");
  const date = new Date();
  date.setHours(Number(hours), Number(minutes), 0, 0);

  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function getEventCountdown(date: string): {
  label: string;
  daysRemaining: number;
  isPast: boolean;
} {
  const today = parseLocalDate(getTodayDateString());
  const eventDate = parseLocalDate(date);
  const diffMs = eventDate.getTime() - today.getTime();
  const daysRemaining = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (daysRemaining < 0) {
    return { label: "Event completed", daysRemaining: 0, isPast: true };
  }

  if (daysRemaining === 0) {
    return { label: "Today", daysRemaining: 0, isPast: false };
  }

  if (daysRemaining === 1) {
    return { label: "1 day away", daysRemaining: 1, isPast: false };
  }

  return {
    label: `${daysRemaining} days away`,
    daysRemaining,
    isPast: false,
  };
}

export function formatDateTime(isoDate: string): string {
  return new Date(isoDate).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Compact timestamp for inline message bubbles. */
export function formatMessageTime(isoDate: string): string {
  return new Date(isoDate).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatLocalDate(
  date: string,
  options: Intl.DateTimeFormatOptions,
): string {
  return parseLocalDate(date).toLocaleDateString("en-US", options);
}

export function getDayOfWeek(date: string): number {
  return parseLocalDate(date).getDay();
}
