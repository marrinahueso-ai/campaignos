"use server";

import { revalidatePath } from "next/cache";
import { reschedulePlanningItem } from "@/lib/communications-calendar/planning-mutations";
import { rescheduleNativeMetaSchedulesForMilestone } from "@/lib/meta-publishing/native-schedule";
import { createClient } from "@/lib/supabase/server";
import type { PlanningItemType } from "@/types/communications-calendar";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function parseMetaMilestoneRelativeDay(
  sourceId: string,
  eventId: string,
): number | null {
  const prefix = `${eventId}-`;
  if (!sourceId.startsWith(prefix)) {
    return null;
  }

  const relativeDay = Number.parseInt(sourceId.slice(prefix.length), 10);
  return Number.isFinite(relativeDay) ? relativeDay : null;
}

export async function reschedulePlanningItemAction(input: {
  sourceType: PlanningItemType;
  sourceId: string;
  newDate: string;
  eventId?: string;
  timelineStepId?: string | null;
  channel?: string | null;
  newHour?: number;
  timezone?: string;
}): Promise<{ success: boolean; error: string | null; warning?: string | null }> {
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
    if (input.sourceType === "meta_milestone") {
      return {
        success: false,
        error:
          "This Meta post cannot be moved. Only draft, scheduled, or approved posts can be rescheduled.",
      };
    }

    return { success: false, error: "Unable to reschedule this item." };
  }

  let warning: string | null = null;

  if (input.sourceType === "meta_milestone" && input.eventId) {
    const relativeDay = parseMetaMilestoneRelativeDay(
      input.sourceId,
      input.eventId,
    );
    if (relativeDay !== null) {
      const supabase = await createClient();
      const { data: slot } = await supabase
        .from("meta_publication_slots")
        .select("scheduled_for, graph_schedule_id")
        .eq("event_id", input.eventId)
        .eq("relative_day", relativeDay)
        .not("graph_schedule_id", "is", null)
        .limit(1)
        .maybeSingle();

      if (slot?.scheduled_for && slot.graph_schedule_id) {
        const graphResult = await rescheduleNativeMetaSchedulesForMilestone({
          eventId: input.eventId,
          relativeDay,
          scheduledFor: slot.scheduled_for as string,
        });

        if (graphResult.warnings.length > 0) {
          warning = `Calendar updated, but Meta schedule sync had issues: ${graphResult.warnings[0]}`;
        }
      }
    }
  }

  revalidatePath("/communications/calendar");
  revalidatePath("/calendar");
  return { success: true, error: null, warning };
}
