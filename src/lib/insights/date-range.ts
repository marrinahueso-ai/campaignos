import type { InsightsDateRange } from "@/lib/insights/types";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function formatDateYmd(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function parseDateYmd(value: string): Date | null {
  if (!DATE_RE.test(value)) {
    return null;
  }

  const parsed = new Date(`${value}T12:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export function daysBetweenInclusive(from: string, to: string): number {
  const start = parseDateYmd(from);
  const end = parseDateYmd(to);
  if (!start || !end) {
    return 7;
  }

  const diffMs = end.getTime() - start.getTime();
  return Math.max(1, Math.floor(diffMs / (24 * 60 * 60 * 1000)) + 1);
}

export function formatDateRangeLabel(from: string, to: string): string {
  const start = parseDateYmd(from);
  const end = parseDateYmd(to);
  if (!start || !end) {
    return `${from} – ${to}`;
  }

  const startMonth = start.toLocaleString("en-US", { month: "short", timeZone: "UTC" });
  const endMonth = end.toLocaleString("en-US", { month: "short", timeZone: "UTC" });
  const startDay = start.getUTCDate();
  const endDay = end.getUTCDate();
  const startYear = start.getUTCFullYear();
  const endYear = end.getUTCFullYear();

  if (startYear === endYear && startMonth === endMonth) {
    return `${startMonth} ${startDay} – ${endDay}, ${endYear}`;
  }

  if (startYear === endYear) {
    return `${startMonth} ${startDay} – ${endMonth} ${endDay}, ${endYear}`;
  }

  return `${startMonth} ${startDay}, ${startYear} – ${endMonth} ${endDay}, ${endYear}`;
}

export function getDefaultDateRange(reference = new Date()): InsightsDateRange {
  const end = new Date(reference);
  end.setUTCHours(12, 0, 0, 0);
  const start = addDays(end, -6);
  const from = formatDateYmd(start);
  const to = formatDateYmd(end);

  return {
    from,
    to,
    label: formatDateRangeLabel(from, to),
  };
}

export function getPreviousPeriod(from: string, to: string): { from: string; to: string } {
  const dayCount = daysBetweenInclusive(from, to);
  const start = parseDateYmd(from);
  const end = parseDateYmd(to);
  if (!start || !end) {
    return { from, to };
  }

  const previousEnd = addDays(start, -1);
  const previousStart = addDays(previousEnd, -(dayCount - 1));

  return {
    from: formatDateYmd(previousStart),
    to: formatDateYmd(previousEnd),
  };
}

export function resolveInsightsDateRange(input: {
  from?: string | null;
  to?: string | null;
  range?: string | null;
}): InsightsDateRange {
  const presetDays = parsePresetRange(input.range);
  if (presetDays) {
    const end = new Date();
    end.setUTCHours(12, 0, 0, 0);
    const start = addDays(end, -(presetDays - 1));
    const from = formatDateYmd(start);
    const to = formatDateYmd(end);
    return { from, to, label: formatDateRangeLabel(from, to) };
  }

  const from = input.from?.trim();
  const to = input.to?.trim();
  if (from && to && parseDateYmd(from) && parseDateYmd(to)) {
    const ordered =
      parseDateYmd(from)!.getTime() <= parseDateYmd(to)!.getTime()
        ? { from, to }
        : { from: to, to: from };
    return {
      ...ordered,
      label: formatDateRangeLabel(ordered.from, ordered.to),
    };
  }

  return getDefaultDateRange();
}

function parsePresetRange(range: string | null | undefined): number | null {
  if (!range) {
    return null;
  }

  const match = /^(\d+)d$/.exec(range.trim());
  if (!match) {
    return null;
  }

  const days = Number.parseInt(match[1], 10);
  if (!Number.isFinite(days) || days < 1 || days > 90) {
    return null;
  }

  return days;
}

export const INSIGHTS_DATE_PRESETS = [
  { id: "7d", label: "Last 7 days", days: 7 },
  { id: "14d", label: "Last 14 days", days: 14 },
  { id: "30d", label: "Last 30 days", days: 30 },
] as const;
