import type { SupabaseClient } from "@supabase/supabase-js";
import { playbookRelativeDay } from "@/lib/campaign-builder-v2/campaign-timing";
import { milestoneNameMatchKey } from "@/lib/campaign-builder-v2/milestone-names";
import { loadCampaignBuilderSession } from "@/lib/campaign-builder-v2/session-queries";
import { resyncCampaignPlanDownstream } from "@/lib/campaign-plan/plan-milestones";
import { ASSET_CHANNEL_MAP } from "@/lib/communications-calendar/channel-styles";
import { getEventById } from "@/lib/events/queries";
import { buildMetaMilestoneRescheduleSlotUpdate } from "@/lib/meta-publishing/native-schedule-utils";
import { computeDueDate } from "@/lib/playbooks/mappers";
import { localDateHourToIso } from "@/lib/posting-analytics/timezone-utils";
import { createClient } from "@/lib/supabase/server";
import type { PlanningItemType } from "@/types/communications-calendar";
import type { EventAssetType } from "@/types/event-workspace";

const RESCHEDULABLE_META_SLOT_STATUSES = [
  "draft",
  "scheduled",
  "approved",
  "failed",
] as const;

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

function buildRescheduledTimestamp(
  newDate: string,
  existingScheduledFor: string | null,
  options?: {
    newHour?: number;
    timezone?: string;
  },
): string {
  if (
    options?.newHour !== undefined &&
    options.timezone
  ) {
    return localDateHourToIso(newDate, options.newHour, options.timezone);
  }

  if (existingScheduledFor?.includes("T")) {
    return `${newDate}${existingScheduledFor.slice(existingScheduledFor.indexOf("T"))}`;
  }

  return `${newDate}T10:00:00.000Z`;
}

/**
 * Keep Approvals `schedule_at` aligned with Meta slot time after calendar DnD.
 * Best-effort — slot update remains the calendar source of truth.
 */
export async function syncApprovalScheduleAtForMetaMilestone(
  supabase: SupabaseClient,
  input: {
    eventId: string;
    relativeDay: number;
    scheduledFor: string;
    now: string;
  },
): Promise<void> {
  const [schedulingResult, session, event, stepsResult] = await Promise.all([
    supabase
      .from("approval_scheduling_items")
      .select("id, campaign_milestone_id, milestone_name")
      .eq("event_id", input.eventId),
    loadCampaignBuilderSession(input.eventId),
    getEventById(input.eventId),
    supabase
      .from("event_communication_steps")
      .select("title")
      .eq("event_id", input.eventId)
      .eq("relative_day", input.relativeDay),
  ]);

  const schedulingRows = schedulingResult.data ?? [];
  if (!schedulingRows.length) {
    return;
  }

  const matchingMilestoneIds = new Set(
    (session?.milestones ?? [])
      .filter(
        (milestone) =>
          Boolean(event?.date) &&
          Boolean(milestone.suggestedDate) &&
          playbookRelativeDay(event!.date, milestone.suggestedDate!) ===
            input.relativeDay,
      )
      .map((milestone) => milestone.id),
  );

  const matchingNameKeys = new Set<string>();
  for (const milestone of session?.milestones ?? []) {
    if (
      event?.date &&
      milestone.suggestedDate &&
      playbookRelativeDay(event.date, milestone.suggestedDate) ===
        input.relativeDay
    ) {
      const key = milestoneNameMatchKey(milestone.name);
      if (key) matchingNameKeys.add(key);
    }
  }
  for (const step of stepsResult.data ?? []) {
    const key = milestoneNameMatchKey(String(step.title ?? ""));
    if (key) matchingNameKeys.add(key);
  }

  const rowIds = schedulingRows
    .filter((row) => {
      const milestoneId = row.campaign_milestone_id as string | null;
      if (milestoneId && matchingMilestoneIds.has(milestoneId)) {
        return true;
      }
      const key = milestoneNameMatchKey(String(row.milestone_name ?? ""));
      return Boolean(key && matchingNameKeys.has(key));
    })
    .map((row) => row.id as string);

  if (!rowIds.length) {
    return;
  }

  await supabase
    .from("approval_scheduling_items")
    .update({ schedule_at: input.scheduledFor, updated_at: input.now })
    .in("id", rowIds);
}

export async function reschedulePlanningItem(
  sourceType: PlanningItemType,
  sourceId: string,
  newDate: string,
  context?: {
    eventId?: string;
    timelineStepId?: string | null;
    channel?: string | null;
    newHour?: number;
    timezone?: string;
  },
): Promise<boolean> {
  const supabase = await createClient();
  const now = new Date().toISOString();

  switch (sourceType) {
    case "event": {
      const { error } = await supabase
        .from("events")
        .update({ date: newDate, updated_at: now })
        .eq("id", sourceId);

      if (error) {
        return false;
      }

      const { data: steps } = await supabase
        .from("event_communication_steps")
        .select("id, relative_day")
        .eq("event_id", sourceId);

      for (const step of steps ?? []) {
        await supabase
          .from("event_communication_steps")
          .update({
            due_date: computeDueDate(newDate, step.relative_day as number),
            updated_at: now,
          })
          .eq("id", step.id);
      }

      await resyncCampaignPlanDownstream(sourceId);
      return true;
    }
    case "timeline_task":
    case "draft": {
      const stepId =
        sourceType === "timeline_task"
          ? sourceId
          : context?.timelineStepId;

      if (stepId) {
        const { error } = await supabase
          .from("event_communication_steps")
          .update({ due_date: newDate, updated_at: now })
          .eq("id", stepId);
        if (!error) return true;
      }

      if (sourceType === "draft") {
        const { data: schedule } = await supabase
          .from("publication_schedule")
          .select("id, scheduled_for")
          .eq("communication_item_id", sourceId)
          .maybeSingle();

        if (schedule?.id) {
          const scheduledFor = buildRescheduledTimestamp(
            newDate,
            schedule.scheduled_for,
            {
              newHour: context?.newHour,
              timezone: context?.timezone,
            },
          );
          const { error } = await supabase
            .from("publication_schedule")
            .update({ scheduled_for: scheduledFor, updated_at: now })
            .eq("id", schedule.id);
          return !error;
        }

        if (context?.eventId) {
          const scheduledFor = buildRescheduledTimestamp(newDate, null, {
            newHour: context?.newHour,
            timezone: context?.timezone,
          });
          const { error } = await supabase.from("publication_schedule").insert({
            event_id: context.eventId,
            communication_item_id: sourceId,
            scheduled_for: scheduledFor,
            status: "scheduled",
          });
          return !error;
        }
      }
      return false;
    }
    case "artwork": {
      const { data: asset } = await supabase
        .from("event_assets")
        .select("event_id, asset_type")
        .eq("id", sourceId)
        .maybeSingle();

      if (!asset) return false;

      const mappedChannel = ASSET_CHANNEL_MAP[asset.asset_type as EventAssetType];
      if (mappedChannel) {
        const { data: step } = await supabase
          .from("event_communication_steps")
          .select("id")
          .eq("event_id", asset.event_id)
          .eq("channel", mappedChannel)
          .limit(1)
          .maybeSingle();

        if (step?.id) {
          const { error } = await supabase
            .from("event_communication_steps")
            .update({ due_date: newDate, updated_at: now })
            .eq("id", step.id);
          return !error;
        }
      }

      const { data: existing } = await supabase
        .from("publication_schedule")
        .select("id, scheduled_for")
        .eq("event_id", asset.event_id)
        .is("communication_item_id", null)
        .maybeSingle();

      const scheduledFor = buildRescheduledTimestamp(
        newDate,
        existing?.scheduled_for ?? null,
        {
          newHour: context?.newHour,
          timezone: context?.timezone,
        },
      );

      if (existing?.id) {
        const { error } = await supabase
          .from("publication_schedule")
          .update({ scheduled_for: scheduledFor, updated_at: now })
          .eq("id", existing.id);
        return !error;
      }

      const { error } = await supabase.from("publication_schedule").insert({
        event_id: asset.event_id,
        communication_item_id: null,
        scheduled_for: scheduledFor,
        status: "scheduled",
      });
      return !error;
    }
    case "approval": {
      const requestedAt = `${newDate}T09:00:00.000Z`;
      const { error } = await supabase
        .from("approval_requests")
        .update({ requested_at: requestedAt })
        .eq("id", sourceId);
      return !error;
    }
    case "scheduled_post": {
      const { data: schedule } = await supabase
        .from("publication_schedule")
        .select("scheduled_for")
        .eq("id", sourceId)
        .maybeSingle();

      const scheduledFor = buildRescheduledTimestamp(
        newDate,
        schedule?.scheduled_for ?? null,
        {
          newHour: context?.newHour,
          timezone: context?.timezone,
        },
      );
      const { error } = await supabase
        .from("publication_schedule")
        .update({ scheduled_for: scheduledFor, updated_at: now })
        .eq("id", sourceId);
      return !error;
    }
    case "meta_milestone": {
      const eventId = context?.eventId;
      if (!eventId) {
        return false;
      }

      const relativeDay = parseMetaMilestoneRelativeDay(sourceId, eventId);
      if (relativeDay === null) {
        return false;
      }

      const { data: slots, error: fetchError } = await supabase
        .from("meta_publication_slots")
        .select("id, status, scheduled_for")
        .eq("event_id", eventId)
        .eq("relative_day", relativeDay);

      if (fetchError || !slots?.length) {
        return false;
      }

      const updatable = slots.filter((slot) =>
        RESCHEDULABLE_META_SLOT_STATUSES.includes(
          slot.status as (typeof RESCHEDULABLE_META_SLOT_STATUSES)[number],
        ),
      );

      if (!updatable.length) {
        return false;
      }

      const timeReference =
        updatable.find((slot) => slot.scheduled_for)?.scheduled_for ??
        slots.find((slot) => slot.scheduled_for)?.scheduled_for ??
        null;
      const scheduledFor = buildRescheduledTimestamp(newDate, timeReference, {
        newHour: context?.newHour,
        timezone: context?.timezone,
      });

      await supabase
        .from("event_communication_steps")
        .update({ due_date: newDate, updated_at: now })
        .eq("event_id", eventId)
        .eq("relative_day", relativeDay);

      // Schedule-only: never touch status (keeps approved / publish eligibility).
      const { error: updateError } = await supabase
        .from("meta_publication_slots")
        .update(buildMetaMilestoneRescheduleSlotUpdate(scheduledFor, now))
        .eq("event_id", eventId)
        .eq("relative_day", relativeDay)
        .in("status", [...RESCHEDULABLE_META_SLOT_STATUSES]);

      if (updateError) {
        return false;
      }

      // Align Approvals drawer/list dates with the moved Meta slot.
      // Best-effort: slot update already succeeded (calendar source of truth).
      try {
        await syncApprovalScheduleAtForMetaMilestone(supabase, {
          eventId,
          relativeDay,
          scheduledFor,
          now,
        });
      } catch (error) {
        console.error(
          "[calendar-dnd] Approvals schedule_at sync failed:",
          error,
        );
      }

      return true;
    }
    default:
      return false;
  }
}
