import { createClient } from "@/lib/supabase/server";
import { ASSET_CHANNEL_MAP } from "@/lib/communications-calendar/channel-styles";
import type { PlanningItemType } from "@/types/communications-calendar";
import type { EventAssetType } from "@/types/event-workspace";

export async function reschedulePlanningItem(
  sourceType: PlanningItemType,
  sourceId: string,
  newDate: string,
  context?: {
    eventId?: string;
    timelineStepId?: string | null;
    channel?: string | null;
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
      return !error;
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
          .select("id")
          .eq("communication_item_id", sourceId)
          .maybeSingle();

        const scheduledFor = `${newDate}T09:00:00.000Z`;
        if (schedule?.id) {
          const { error } = await supabase
            .from("publication_schedule")
            .update({ scheduled_for: scheduledFor, updated_at: now })
            .eq("id", schedule.id);
          return !error;
        }

        if (context?.eventId) {
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

      const scheduledFor = `${newDate}T09:00:00.000Z`;
      const { data: existing } = await supabase
        .from("publication_schedule")
        .select("id")
        .eq("event_id", asset.event_id)
        .is("communication_item_id", null)
        .maybeSingle();

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
      const scheduledFor = `${newDate}T09:00:00.000Z`;
      const { error } = await supabase
        .from("publication_schedule")
        .update({ scheduled_for: scheduledFor, updated_at: now })
        .eq("id", sourceId);
      return !error;
    }
    default:
      return false;
  }
}
