/**
 * Curated day-offset timings for Communication Plan editing.
 * Storage remains relative_day integers — this is UI catalog only.
 */

export type TimingCatalogGroup = "before" | "after";

export type TimingCatalogEntry = {
  id: string;
  relativeDay: number;
  label: string;
  bestUse: string;
  group: TimingCatalogGroup;
};

export const TIMING_CATALOG: TimingCatalogEntry[] = [
  {
    id: "before-60",
    relativeDay: -60,
    label: "60 days before",
    bestUse: "Large fundraisers, gala, auctions",
    group: "before",
  },
  {
    id: "before-45",
    relativeDay: -45,
    label: "45 days before",
    bestUse: "Registration opens",
    group: "before",
  },
  {
    id: "before-30",
    relativeDay: -30,
    label: "30 days before",
    bestUse: "Major announcement",
    group: "before",
  },
  {
    id: "before-21",
    relativeDay: -21,
    label: "21 days before",
    bestUse: "Save the date",
    group: "before",
  },
  {
    id: "before-14",
    relativeDay: -14,
    label: "14 days before",
    bestUse: "General reminder",
    group: "before",
  },
  {
    id: "before-10",
    relativeDay: -10,
    label: "10 days before",
    bestUse: "RSVP push",
    group: "before",
  },
  {
    id: "before-7",
    relativeDay: -7,
    label: "7 days before",
    bestUse: "Weekly reminder",
    group: "before",
  },
  {
    id: "before-5",
    relativeDay: -5,
    label: "5 days before",
    bestUse: "Volunteer recruitment",
    group: "before",
  },
  {
    id: "before-3",
    relativeDay: -3,
    label: "3 days before",
    bestUse: "Final details",
    group: "before",
  },
  {
    id: "before-2",
    relativeDay: -2,
    label: "2 days before",
    bestUse: "What to bring",
    group: "before",
  },
  {
    id: "before-1",
    relativeDay: -1,
    label: "1 day before",
    bestUse: "Tomorrow reminder",
    group: "before",
  },
  {
    id: "before-0",
    relativeDay: 0,
    label: "Morning of",
    bestUse: "Happening today",
    group: "before",
  },
  {
    id: "after-0",
    relativeDay: 0,
    label: "Same day",
    bestUse: "Thank you",
    group: "after",
  },
  {
    id: "after-1",
    relativeDay: 1,
    label: "1 day after",
    bestUse: "Photo recap",
    group: "after",
  },
  {
    id: "after-2",
    relativeDay: 2,
    label: "2 days after",
    bestUse: "Survey",
    group: "after",
  },
  {
    id: "after-7",
    relativeDay: 7,
    label: "7 days after",
    bestUse: "Results / impact",
    group: "after",
  },
];

export const TIMING_CATALOG_CUSTOM_VALUE = "custom";

const BY_ID = new Map(TIMING_CATALOG.map((entry) => [entry.id, entry]));

export function getTimingCatalogEntry(id: string): TimingCatalogEntry | null {
  return BY_ID.get(id) ?? null;
}

export function timingCatalogByGroup(
  group: TimingCatalogGroup,
): TimingCatalogEntry[] {
  return TIMING_CATALOG.filter((entry) => entry.group === group);
}

/** Best-use titles we may auto-fill — safe to replace when timing changes. */
export function isTimingCatalogSuggestedTitle(title: string): boolean {
  const trimmed = title.trim();
  if (!trimmed || trimmed === "New Step") return true;
  return TIMING_CATALOG.some((entry) => entry.bestUse === trimmed);
}

/**
 * Resolve which catalog row a step maps to.
 * Day 0 has two rows — prefer Best Use title match, else Morning of.
 */
export function resolveTimingCatalogId(
  relativeDay: number,
  title?: string,
): string {
  const matches = TIMING_CATALOG.filter(
    (entry) => entry.relativeDay === relativeDay,
  );
  if (matches.length === 0) {
    return TIMING_CATALOG_CUSTOM_VALUE;
  }
  if (matches.length === 1) {
    return matches[0]!.id;
  }
  const byTitle = matches.find((entry) => entry.bestUse === title?.trim());
  return (byTitle ?? matches[0]!).id;
}

/** Prefer curated labels when the offset is unique in the catalog. */
export function formatTimingCatalogDay(relativeDay: number): string | null {
  const matches = TIMING_CATALOG.filter(
    (entry) => entry.relativeDay === relativeDay,
  );
  if (matches.length === 1) {
    return matches[0]!.label;
  }
  if (relativeDay === 0 && matches.length > 1) {
    return "Day of";
  }
  return null;
}
