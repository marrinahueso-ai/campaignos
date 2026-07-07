export type ReviewPublishTimingOption = "now" | "schedule" | "draft";

export function formatScheduleDateInput(dateOnly: string): string {
  const [year, month, day] = dateOnly.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function parseTimeInputTo24Hour(timeLabel: string): { hours: number; minutes: number } | null {
  const trimmed = timeLabel.trim();
  const match = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);

  if (!match) {
    return null;
  }

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const meridiem = match[3]?.toUpperCase();

  if (meridiem === "PM" && hours < 12) {
    hours += 12;
  }
  if (meridiem === "AM" && hours === 12) {
    hours = 0;
  }

  return { hours, minutes };
}

export function combineDateAndTimeToIso(dateOnly: string, timeLabel: string): string | null {
  const [year, month, day] = dateOnly.split("-").map(Number);
  const parsedTime = parseTimeInputTo24Hour(timeLabel);

  if (!parsedTime) {
    return null;
  }

  const date = new Date(year, month - 1, day, parsedTime.hours, parsedTime.minutes, 0, 0);
  return date.toISOString();
}

export function resolveDefaultScheduleDate(
  scheduledFor: string | null | undefined,
  dueDate: string | null | undefined,
): string {
  if (scheduledFor) {
    return scheduledFor.split("T")[0] ?? scheduledFor;
  }

  if (dueDate) {
    return dueDate.split("T")[0] ?? dueDate;
  }

  return new Date().toISOString().split("T")[0] ?? "";
}

export function resolveDefaultScheduleTime(scheduledFor: string | null | undefined): string {
  if (!scheduledFor) {
    return "10:00 AM";
  }

  return new Date(scheduledFor).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}
