import {
  formatEventDate,
  normalizeDateOnly,
  parseLocalDate,
} from "../utils/dates.ts";
import type { CampaignOption } from "./types.ts";

export const SOCIAL_COMPOSER_EVENT_SEARCH_PLACEHOLDER =
  "Search events, people, dates…";

function getDateSearchText(date: string): string {
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
    parsed.toLocaleDateString("en-US", { weekday: "short" }),
    parsed.toLocaleDateString("en-US", { weekday: "long" }),
  ]
    .join(" ")
    .toLowerCase();
}

function buildCampaignOptionSearchHaystack(option: CampaignOption): string {
  const owner = option.eventOwner?.trim();
  return [
    option.title,
    option.description,
    option.label,
    owner,
    getDateSearchText(option.date),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function filterCampaignOptionsBySearch(
  options: CampaignOption[],
  query: string,
  _today = normalizeDateOnly(new Date().toISOString()),
): CampaignOption[] {
  const needle = query.trim().toLowerCase();
  if (!needle) {
    return options;
  }

  return options.filter((option) =>
    buildCampaignOptionSearchHaystack(option).includes(needle),
  );
}
