import "server-only";

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { isMissingSchemaError } from "@/lib/creative-assets/schema-errors";
import { areEventPlaybookTablesAvailable } from "@/lib/event-playbooks/queries";
import { getLatestConfirmedVolunteerFilledSpots } from "@/lib/event-volunteers/queries";
import type { EventDetailHeroStats } from "@/components/events-phase3/EventDetailHeroStatsStrip";
import {
  countMilestonesFromSessionData,
  resolveHeroMilestoneCount,
} from "@/lib/events-phase3/hero-stats-utils";

function isAbsentTable(error: { code?: string; message?: string } | null): boolean {
  if (!error) {
    return false;
  }
  return isMissingSchemaError(error) || error.code === "42P01";
}

export const getEventDetailHeroStats = cache(
  async (eventId: string): Promise<EventDetailHeroStats> => {
    const supabase = await createClient();
    const tablesAvailable = await areEventPlaybookTablesAvailable();

    const [
      builderSessionResult,
      communicationStepsResult,
      classicApprovalsResult,
      schedulingApprovalsResult,
      scheduledPostsResult,
      tasksResult,
      filledSpots,
    ] = await Promise.all([
      // Focused select only — avoids full session load + scheduling sync side effects.
      supabase
        .from("campaign_builder_sessions")
        .select("session_data")
        .eq("event_id", eventId)
        .maybeSingle(),
      supabase
        .from("event_communication_steps")
        .select("id", { count: "exact", head: true })
        .eq("event_id", eventId),
      supabase
        .from("approval_requests")
        .select("id", { count: "exact", head: true })
        .eq("event_id", eventId)
        .in("status", ["pending", "changes_requested"]),
      supabase
        .from("approval_scheduling_items")
        .select("id", { count: "exact", head: true })
        .eq("event_id", eventId)
        .in("workflow_status", [
          "in_queue",
          "assigned_to_me",
          "changes_requested",
        ]),
      supabase
        .from("approval_scheduling_items")
        .select("id", { count: "exact", head: true })
        .eq("event_id", eventId)
        .eq("workflow_status", "scheduled"),
      tablesAvailable
        ? supabase
            .from("event_playbook_tasks")
            .select("id", { count: "exact", head: true })
            .eq("event_id", eventId)
        : Promise.resolve({ count: 0, error: null }),
      getLatestConfirmedVolunteerFilledSpots(eventId).catch(() => 0),
    ]);

    let sessionMilestoneCount: number | null = null;
    if (
      !builderSessionResult.error ||
      isAbsentTable(builderSessionResult.error)
    ) {
      if (!builderSessionResult.error && builderSessionResult.data) {
        sessionMilestoneCount = countMilestonesFromSessionData(
          builderSessionResult.data.session_data,
        );
      }
    }

    const communicationSteps =
      communicationStepsResult.error &&
      !isAbsentTable(communicationStepsResult.error)
        ? 0
        : (communicationStepsResult.count ?? 0);

    const milestones = resolveHeroMilestoneCount(
      sessionMilestoneCount,
      communicationSteps,
    );

    const classicApprovals =
      classicApprovalsResult.error && !isAbsentTable(classicApprovalsResult.error)
        ? 0
        : (classicApprovalsResult.count ?? 0);

    const schedulingApprovals =
      schedulingApprovalsResult.error &&
      !isAbsentTable(schedulingApprovalsResult.error)
        ? 0
        : (schedulingApprovalsResult.count ?? 0);

    const scheduledPosts =
      scheduledPostsResult.error && !isAbsentTable(scheduledPostsResult.error)
        ? 0
        : (scheduledPostsResult.count ?? 0);

    const tasks =
      "error" in tasksResult && tasksResult.error && !isAbsentTable(tasksResult.error)
        ? 0
        : ((tasksResult as { count: number | null }).count ?? 0);

    return {
      milestones,
      pendingApprovals: classicApprovals + schedulingApprovals,
      scheduledPosts,
      tasks,
      filledSpots,
    };
  },
);
