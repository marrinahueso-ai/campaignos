import { getHourInTimezone } from "@/lib/posting-analytics/timezone-utils";

function normalizeHour(hour: number): number {
  if (hour === 24) {
    return 0;
  }

  return hour;
}

export function getTimeOfDayGreeting(
  date = new Date(),
  timezone?: string,
): string {
  const hour = normalizeHour(
    timezone
      ? getHourInTimezone(date.toISOString(), timezone)
      : date.getHours(),
  );

  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}
