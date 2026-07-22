import {
  formatEventDate,
  normalizeDateOnly,
  parseLocalDate,
} from "@/lib/utils/dates";

/** Build searchable date tokens (formatted + raw year/month/day variants). */
export function getEventDateSearchText(date: string): string {
  const normalized = normalizeDateOnly(date);
  const parsed = parseLocalDate(normalized);
  const year = String(parsed.getFullYear());
  const month = parsed.getMonth() + 1;
  const day = parsed.getDate();
  const monthPadded = String(month).padStart(2, "0");
  const dayPadded = String(day).padStart(2, "0");
  const shortMonth = parsed.toLocaleDateString("en-US", { month: "short" });
  const longMonth = parsed.toLocaleDateString("en-US", { month: "long" });
  const formatted = formatEventDate(normalized);

  return [
    normalized,
    formatted,
    year,
    shortMonth,
    longMonth,
    `${monthPadded}/${dayPadded}`,
    `${month}/${day}`,
    `${monthPadded}/${dayPadded}/${year}`,
    `${month}/${day}/${year}`,
    `${year}-${monthPadded}`,
    `${shortMonth} ${day}`,
    `${longMonth} ${day}`,
    `${shortMonth} ${day}, ${year}`,
    `${longMonth} ${day}, ${year}`,
    `${shortMonth} ${dayPadded}`,
    `${longMonth} ${dayPadded}`,
  ]
    .join(" ")
    .toLowerCase();
}
