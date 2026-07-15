"use server";

import {
  loadCalendarItemPreview,
  type CalendarItemPreview,
} from "@/lib/communications-calendar/calendar-item-preview";

export async function getCalendarItemPreviewAction(input: {
  eventId: string;
  sourceId: string;
  milestoneTitle: string | null;
  scheduledAt?: string | null;
  campaignMilestoneId?: string | null;
}): Promise<CalendarItemPreview> {
  return loadCalendarItemPreview(input);
}
