/** Shared on/off visibility for homepage cards and announcements. */
export type ScheduleVisibility = {
  alwaysOn: boolean;
  startsOn: string | null;
  expiresOn: string | null;
};

/** `asOf` is YYYY-MM-DD, or a sentinel meaning “show everything”. */
export function isScheduleVisibleOn(
  item: ScheduleVisibility,
  asOf: string,
  fullMonthSentinel?: string,
): boolean {
  if (fullMonthSentinel && asOf === fullMonthSentinel) return true;
  if (item.alwaysOn) return true;
  if (item.startsOn && asOf < item.startsOn) return false;
  if (item.expiresOn && asOf > item.expiresOn) return false;
  return true;
}
