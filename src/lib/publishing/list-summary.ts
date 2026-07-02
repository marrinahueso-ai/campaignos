import { formatEventDate } from "@/lib/utils/dates";
import type { PlanningCalendarItem } from "@/types/communications-calendar";

export function publishingListSummary(
  items: PlanningCalendarItem[],
  today: string,
): string | null {
  if (items.length === 0) {
    return null;
  }

  const next = [...items].sort((left, right) =>
    left.scheduledDate.localeCompare(right.scheduledDate),
  )[0];

  const overdue = items.filter((item) => item.scheduledDate < today).length;
  const countLabel = `${items.length} ${items.length === 1 ? "item" : "items"}`;

  if (overdue > 0) {
    return `${countLabel} · ${overdue} past due`;
  }

  if (next) {
    return `${countLabel} · next ${formatEventDate(next.scheduledDate)}`;
  }

  return countLabel;
}
