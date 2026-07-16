import "server-only";

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { isMissingSchemaError } from "@/lib/creative-assets/schema-errors";
import { areEventPlaybookTablesAvailable } from "@/lib/event-playbooks/queries";
import type { EventDetailHeroStats } from "@/components/events-phase3/EventDetailHeroStatsStrip";

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
      milestonesResult,
      classicApprovalsResult,
      schedulingApprovalsResult,
      scheduledSlotsResult,
      tasksResult,
      filesResult,
    ] = await Promise.all([
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
        .from("meta_publication_slots")
        .select("relative_day")
        .eq("event_id", eventId)
        .in("status", ["scheduled", "approved"]),
      tablesAvailable
        ? supabase
            .from("event_playbook_tasks")
            .select("id", { count: "exact", head: true })
            .eq("event_id", eventId)
        : Promise.resolve({ count: 0, error: null }),
      tablesAvailable
        ? supabase
            .from("event_playbook_files")
            .select("id", { count: "exact", head: true })
            .eq("event_id", eventId)
        : Promise.resolve({ count: 0, error: null }),
    ]);

    const milestones =
      milestonesResult.error && !isAbsentTable(milestonesResult.error)
        ? 0
        : (milestonesResult.count ?? 0);

    const classicApprovals =
      classicApprovalsResult.error && !isAbsentTable(classicApprovalsResult.error)
        ? 0
        : (classicApprovalsResult.count ?? 0);

    const schedulingApprovals =
      schedulingApprovalsResult.error &&
      !isAbsentTable(schedulingApprovalsResult.error)
        ? 0
        : (schedulingApprovalsResult.count ?? 0);

    let scheduledPosts = 0;
    if (
      !scheduledSlotsResult.error ||
      isAbsentTable(scheduledSlotsResult.error)
    ) {
      if (!scheduledSlotsResult.error) {
        const days = new Set<number>();
        for (const row of scheduledSlotsResult.data ?? []) {
          const day = (row as { relative_day: number | null }).relative_day;
          if (typeof day === "number") {
            days.add(day);
          }
        }
        scheduledPosts = days.size;
      }
    }

    const tasks =
      "error" in tasksResult && tasksResult.error && !isAbsentTable(tasksResult.error)
        ? 0
        : ((tasksResult as { count: number | null }).count ?? 0);

    const files =
      "error" in filesResult && filesResult.error && !isAbsentTable(filesResult.error)
        ? 0
        : ((filesResult as { count: number | null }).count ?? 0);

    return {
      milestones,
      pendingApprovals: classicApprovals + schedulingApprovals,
      scheduledPosts,
      tasks,
      files,
    };
  },
);
