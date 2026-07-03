"use server";

import { revalidatePath } from "next/cache";
import { reschedulePlanningItem } from "@/lib/communications-calendar/planning-mutations";
import type { PlanningItemType } from "@/types/communications-calendar";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export async function reschedulePlanningItemAction(input: {
  sourceType: PlanningItemType;
  sourceId: string;
  newDate: string;
  eventId?: string;
  timelineStepId?: string | null;
  channel?: string | null;
  newHour?: number;
  timezone?: string;
}): Promise<{ success: boolean; error: string | null }> {
  if (!DATE_PATTERN.test(input.newDate)) {
    return { success: false, error: "Invalid date format." };
  }

  if (
    input.newHour !== undefined &&
    (input.newHour < 0 || input.newHour > 23 || !input.timezone)
  ) {
    return { success: false, error: "Invalid time or timezone." };
  }

  const success = await reschedulePlanningItem(
    input.sourceType,
    input.sourceId,
    input.newDate,
    {
      eventId: input.eventId,
      timelineStepId: input.timelineStepId,
      channel: input.channel,
      newHour: input.newHour,
      timezone: input.timezone,
    },
  );

  if (!success) {
    return { success: false, error: "Unable to reschedule this item." };
  }

  revalidatePath("/communications/calendar");
  revalidatePath("/calendar");
  return { success: true, error: null };
}
