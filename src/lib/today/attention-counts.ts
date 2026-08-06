import "server-only";

import { getSidebarSchedulingBadgeCounts } from "@/lib/approvals-scheduling/queries";
import { getCurrentOrganization } from "@/lib/auth/organization-context";
import { getVolunteersMasterPageData } from "@/lib/event-volunteers/org-master";
import { areEventPlaybookTablesAvailable } from "@/lib/event-playbooks/queries";
import { resolveScopedOrgEventIds } from "@/lib/events/org-scope";
import { getApprovalSidebarCountsForCurrentUser } from "@/lib/event-workspace/approval-routing-queries";
import { createClient } from "@/lib/supabase/server";
import { filterTasksForMyView } from "@/lib/tasks-v2/my-tasks-filter";
import { getDashboardTaskItems } from "@/lib/today/dashboard-task-items";
import { filterDashboardUnderfilledVolunteerEvents } from "@/lib/today/dashboard-volunteer-events";
import { getTodayDateString } from "@/lib/utils/dates";
import type { TodayAttentionCounts } from "@/types/today";

/**
 * Volunteer underfilled count for Attention.
 * Schools without SignUpGenius sources short-circuit — avoids loading the full
 * Volunteer Master feed just to report zero.
 */
async function countAttentionVolunteerEvents(): Promise<number> {
  const organization = await getCurrentOrganization();
  if (!organization) {
    return 0;
  }

  const supabase = await createClient();
  const { count, error } = await supabase
    .from("event_volunteer_sources")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organization.id);

  if (error) {
    console.error(
      "Attention volunteer source probe failed:",
      error.message,
    );
    return 0;
  }

  if (!count) {
    return 0;
  }

  const master = await getVolunteersMasterPageData(organization.id);
  return filterDashboardUnderfilledVolunteerEvents(
    master.events,
    getTodayDateString(),
  ).length;
}

/**
 * Tasks-this-week count for Attention.
 * Orgs with no playbook tasks short-circuit before Task Hub materialization.
 */
async function countAttentionTasksThisWeek(): Promise<number> {
  const tablesAvailable = await areEventPlaybookTablesAvailable();
  if (!tablesAvailable) {
    return 0;
  }

  const eventIds = await resolveScopedOrgEventIds(undefined);
  if (eventIds.length === 0) {
    return 0;
  }

  const supabase = await createClient();
  const { count, error } = await supabase
    .from("event_playbook_tasks")
    .select("id", { count: "exact", head: true })
    .in("event_id", eventIds);

  if (error) {
    // Table missing / RLS — treat as zero rather than falling into a heavy path.
    if (error.code !== "42P01") {
      console.error("Attention tasks probe failed:", error.message);
    }
    return 0;
  }

  if (!count) {
    return 0;
  }

  const { tasks, viewer } = await getDashboardTaskItems();
  return filterTasksForMyView(tasks, viewer, "this_week").length;
}

/**
 * Attention widget counts — lean paths only.
 *
 * Default dashboard layout includes Attention but not the Phase-3 list widgets.
 * Materializing full approval/volunteer/task DTOs solely for `.length` was
 * competing with the blocking Today document under concurrency.
 *
 * Approval review count aligns with sidebar badge totals (classic + CB2).
 */
export async function getTodayAttentionCounts(): Promise<TodayAttentionCounts> {
  const [classicCounts, schedulingCounts, volunteerCount, tasksThisWeekCount] =
    await Promise.all([
      getApprovalSidebarCountsForCurrentUser(),
      getSidebarSchedulingBadgeCounts(),
      countAttentionVolunteerEvents(),
      countAttentionTasksThisWeek(),
    ]);

  return {
    reviewCount: Math.max(
      classicCounts.assignedApprovalsCount,
      schedulingCounts.assignedApprovalsCount,
    ),
    volunteerCount,
    tasksThisWeekCount,
  };
}
