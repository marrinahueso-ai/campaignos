import type {
  PlanningCalendarItem,
  PlanningItemType,
} from "@/types/communications-calendar";
import type { CommunicationChannel } from "@/types/event-workspace";
import { addDaysToDateOnly, normalizeDateOnly, parseLocalDate } from "@/lib/utils/dates";

export function getInitialCalendarFocus(
  items: PlanningCalendarItem[],
  today: string,
): { year: number; month: number; weekAnchor: string } {
  const dates = items
    .map((item) => normalizeDateOnly(item.scheduledDate))
    .sort();

  if (dates.length === 0) {
    const now = parseLocalDate(today);
    return { year: now.getFullYear(), month: now.getMonth(), weekAnchor: today };
  }

  const focusDate = dates.find((date) => date >= today) ?? dates[0]!;
  const focus = parseLocalDate(focusDate);

  return {
    year: focus.getFullYear(),
    month: focus.getMonth(),
    weekAnchor: focusDate,
  };
}

export function enrichItemFlags(
  item: PlanningCalendarItem,
  today: string,
): PlanningCalendarItem & { isOverdue: boolean; isToday: boolean } {
  const scheduledDate = normalizeDateOnly(item.scheduledDate);
  const overdue =
    scheduledDate < today &&
    !["completed", "published", "skipped", "cancelled", "approved"].includes(
      item.status,
    );
  return {
    ...item,
    scheduledDate,
    isOverdue: overdue,
    isToday: scheduledDate === today,
  };
}

export function getUpcomingItems(
  items: PlanningCalendarItem[],
  today: string,
  days = 7,
): PlanningCalendarItem[] {
  const endStr = addDaysToDateOnly(today, days);

  return items
    .filter(
      (item) =>
        normalizeDateOnly(item.scheduledDate) >= today &&
        normalizeDateOnly(item.scheduledDate) <= endStr,
    )
    .sort((a, b) =>
      normalizeDateOnly(a.scheduledDate).localeCompare(
        normalizeDateOnly(b.scheduledDate),
      ),
    );
}

export function filterPlanningItems<T extends PlanningCalendarItem>(
  items: T[],
  filters: {
    eventId: string | null;
    channel: CommunicationChannel | "all";
    status: string;
    assignedUser: string;
    communicationType: PlanningItemType | "all";
  },
): T[] {
  return items.filter((item) => {
    if (filters.eventId && item.eventId !== filters.eventId) return false;
    if (filters.channel !== "all" && item.channel !== filters.channel) {
      return false;
    }
    if (filters.status !== "all" && item.status !== filters.status) return false;
    if (
      filters.communicationType !== "all" &&
      item.communicationType !== filters.communicationType
    ) {
      return false;
    }
    if (filters.assignedUser === "unassigned" && item.assignedUser) return false;
    if (
      filters.assignedUser !== "all" &&
      filters.assignedUser !== "unassigned" &&
      item.assignedUser !== filters.assignedUser
    ) {
      return false;
    }
    return true;
  });
}
