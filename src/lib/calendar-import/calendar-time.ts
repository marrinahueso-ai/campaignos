/**
 * School calendar feeds often encode all-day events as midnight
 * (T000000) instead of VALUE=DATE. Treat those as "no clock time."
 */
export function isCalendarAllDayClockTime(
  time: string | null | undefined,
): boolean {
  if (!time?.trim()) return false;
  const parts = time.trim().split(":");
  const hours = (parts[0] ?? "").padStart(2, "0");
  const minutes = (parts[1] ?? "00").padStart(2, "0");
  return hours === "00" && minutes === "00";
}
