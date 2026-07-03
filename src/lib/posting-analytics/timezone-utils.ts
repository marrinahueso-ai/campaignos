export function getHourInTimezone(iso: string, timezone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "numeric",
    hour12: false,
  }).formatToParts(new Date(iso));

  const hourPart = parts.find((part) => part.type === "hour");
  return Number(hourPart?.value ?? 0);
}

/** UTC ISO for a local calendar date + hour (0–23) in the given IANA timezone. */
export function localDateHourToIso(
  dateOnly: string,
  hour: number,
  timeZone: string,
): string {
  const [year, month, day] = dateOnly.split("-").map(Number);

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  });

  function getLocalKey(utcMs: number): number {
    const parts = formatter.formatToParts(new Date(utcMs));
    const val = (type: Intl.DateTimeFormatPartTypes) =>
      Number(parts.find((part) => part.type === type)?.value ?? 0);
    let localHour = val("hour");
    if (localHour === 24) {
      localHour = 0;
    }

    return (
      val("year") * 1_000_000 +
      val("month") * 10_000 +
      val("day") * 100 +
      localHour
    );
  }

  const targetKey = year * 1_000_000 + month * 10_000 + day * 100 + hour;
  let lo = Date.UTC(year, month - 1, day - 1, 0, 0, 0);
  let hi = Date.UTC(year, month - 1, day + 2, 0, 0, 0);

  while (lo + 60_000 <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (getLocalKey(mid) < targetKey) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }

  return new Date(hi).toISOString();
}

export function getDayOfWeekInTimezone(iso: string, timezone: string): number {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
  }).format(new Date(iso));

  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  return map[weekday] ?? 0;
}
