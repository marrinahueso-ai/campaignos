import "server-only";

import { getActiveMembership } from "@/lib/auth/membership-queries";
import { isMissingSchemaError } from "@/lib/creative-assets/schema-errors";
import { getEventPlaybookTasksForEvents } from "@/lib/event-playbooks/queries";
import { isOpenTaskStatus } from "@/lib/event-playbooks/task-status";
import { getApprovalQueueOverviewForCurrentUser } from "@/lib/event-workspace/approval-routing-queries";
import { getActiveEvents } from "@/lib/events/queries";
import { getLatestOrganization } from "@/lib/organizations/queries";
import {
  buildOrgBriefingLinks,
  type OrgApprovalItem,
  type OrgBriefingContextPack,
  type OrgEventAttention,
  type OrgOverdueTask,
  type OrgScheduleItem,
} from "@/lib/ralli-assistant/org-briefing-format";
import { createClient } from "@/lib/supabase/server";
import {
  addDaysToDateOnly,
  getTodayDateString,
  isoToLocalDateOnly,
  normalizeDateOnly,
} from "@/lib/utils/dates";

export type { OrgBriefingContextPack } from "@/lib/ralli-assistant/org-briefing-format";
export {
  formatDeterministicOrgBriefingAnswer,
  serializeOrgBriefingForPrompt,
} from "@/lib/ralli-assistant/org-briefing-format";

function isAbsentTable(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return isMissingSchemaError(error) || error.code === "42P01";
}

function toScheduleDate(scheduleAt: string | null): string | null {
  if (!scheduleAt) return null;
  try {
    if (/^\d{4}-\d{2}-\d{2}$/.test(scheduleAt)) {
      return scheduleAt;
    }
    return isoToLocalDateOnly(scheduleAt);
  } catch {
    return normalizeDateOnly(scheduleAt);
  }
}

function approvalLabel(item: {
  preview: { milestoneTitle: string | null };
  channel: string;
}): string {
  return item.preview.milestoneTitle?.trim() || `${item.channel} approval`;
}

/**
 * Compact org / role briefing pack. Fail soft — empty sections on errors.
 * Uses the signed-in Supabase client (RLS) and existing approval/task loaders.
 */
export async function buildOrgBriefingContextPack(): Promise<OrgBriefingContextPack> {
  const today = getTodayDateString();
  const weekEnd = addDaysToDateOnly(today, 7);
  const links = buildOrgBriefingLinks();

  const empty: OrgBriefingContextPack = {
    organizationName: null,
    roleLabel: null,
    approvalQueue: {
      assignedToMeCount: 0,
      allPendingCount: 0,
      changesRequestedCount: 0,
      assignedToMe: [],
      changesRequested: [],
    },
    eventsNeedingAttention: [],
    behindSchedule: {
      overdueTaskCount: 0,
      overdueTasks: [],
      eventsBehind: [],
    },
    todaySummary: {
      attentionCount: 0,
      waitingOnMeCount: 0,
      publishingTodayCount: 0,
      publishingToday: [],
      eventsThisWeek: [],
    },
    thisWeek: {
      scheduledCount: 0,
      scheduled: [],
      events: [],
    },
    links,
  };

  const membership = await getActiveMembership().catch(() => null);
  if (!membership) {
    return empty;
  }

  const organization = await getLatestOrganization().catch(() => null);
  const roleLabel = membership.user.organizationRoleName;
  const organizationName = organization?.name ?? null;

  const eventTitleById = new Map<string, string>();
  let events: Array<{ id: string; title: string; date: string }> = [];

  try {
    const active = await getActiveEvents(membership.organizationId);
    events = active.map((event) => ({
      id: event.id,
      title: event.title,
      date: event.date,
    }));
    for (const event of events) {
      eventTitleById.set(event.id, event.title);
    }
  } catch (error) {
    console.error("Ask Ralli org briefing: failed to load events", error);
  }

  const eventIds = events.map((event) => event.id);

  const [approvalQueue, taskRows, schedulingPendingResult, scheduledItemsResult] =
    await Promise.all([
      getApprovalQueueOverviewForCurrentUser(undefined, {
        enrichPreviews: false,
      }).catch(() => null),
      eventIds.length > 0
        ? getEventPlaybookTasksForEvents(eventIds).catch(() => [])
        : Promise.resolve([]),
      (async () => {
        if (eventIds.length === 0) {
          return { data: null, error: null };
        }
        const supabase = await createClient();
        return supabase
          .from("approval_scheduling_items")
          .select("id, event_id, milestone_name, workflow_status, schedule_at")
          .in("event_id", eventIds)
          .in("workflow_status", [
            "in_queue",
            "assigned_to_me",
            "changes_requested",
          ])
          .limit(80);
      })(),
      (async () => {
        if (eventIds.length === 0) {
          return { data: null, error: null };
        }
        const supabase = await createClient();
        return supabase
          .from("approval_scheduling_items")
          .select("id, event_id, milestone_name, workflow_status, schedule_at")
          .in("event_id", eventIds)
          .eq("workflow_status", "scheduled")
          .limit(80);
      })(),
    ]);

  const assignedToMe: OrgApprovalItem[] = (approvalQueue?.assignedToMe ?? [])
    .slice(0, 8)
    .map((item) => ({
      id: item.id,
      eventId: item.eventId,
      eventTitle: item.eventTitle,
      label: approvalLabel(item),
      status: item.status,
      assignedToMe: true,
    }));

  const changesRequested: OrgApprovalItem[] = (
    approvalQueue?.changesRequested ?? []
  )
    .slice(0, 8)
    .map((item) => ({
      id: item.id,
      eventId: item.eventId,
      eventTitle: item.eventTitle,
      label: approvalLabel(item),
      status: item.communicationStatus,
      assignedToMe: item.assignedToMe,
    }));

  const pendingByEvent = new Map<
    string,
    { pending: number; changesRequested: number }
  >();

  for (const item of approvalQueue?.allPending ?? []) {
    const bucket = pendingByEvent.get(item.eventId) ?? {
      pending: 0,
      changesRequested: 0,
    };
    bucket.pending += 1;
    pendingByEvent.set(item.eventId, bucket);
  }
  for (const item of approvalQueue?.changesRequested ?? []) {
    const bucket = pendingByEvent.get(item.eventId) ?? {
      pending: 0,
      changesRequested: 0,
    };
    bucket.changesRequested += 1;
    pendingByEvent.set(item.eventId, bucket);
  }

  if (
    !schedulingPendingResult.error ||
    isAbsentTable(schedulingPendingResult.error)
  ) {
    for (const row of schedulingPendingResult.data ?? []) {
      const eventId = String(row.event_id ?? "");
      if (!eventId) continue;
      const status = String(row.workflow_status ?? "in_queue");
      const bucket = pendingByEvent.get(eventId) ?? {
        pending: 0,
        changesRequested: 0,
      };
      if (status === "changes_requested") bucket.changesRequested += 1;
      else bucket.pending += 1;
      pendingByEvent.set(eventId, bucket);
    }
  }

  const overdueTasks: OrgOverdueTask[] = [];
  const overdueByEvent = new Map<string, number>();

  for (const task of taskRows) {
    if (!isOpenTaskStatus(task.status)) continue;
    const dueDate = task.due_date ? normalizeDateOnly(task.due_date) : null;
    if (!dueDate || dueDate >= today) continue;
    const eventId = task.event_id;
    overdueByEvent.set(eventId, (overdueByEvent.get(eventId) ?? 0) + 1);
    overdueTasks.push({
      id: task.id,
      title: task.title,
      eventId,
      eventTitle: eventTitleById.get(eventId) ?? "Event",
      dueDate,
    });
  }

  overdueTasks.sort((a, b) => {
    if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
    return a.title.localeCompare(b.title);
  });

  const eventsNeedingAttention: OrgEventAttention[] = [];
  for (const event of events) {
    const overdueTaskCount = overdueByEvent.get(event.id) ?? 0;
    const approvalBucket = pendingByEvent.get(event.id);
    const pendingApprovalCount = approvalBucket?.pending ?? 0;
    const changesRequestedCount = approvalBucket?.changesRequested ?? 0;
    if (
      overdueTaskCount === 0 &&
      pendingApprovalCount === 0 &&
      changesRequestedCount === 0
    ) {
      continue;
    }
    const reasons: string[] = [];
    if (overdueTaskCount > 0) {
      reasons.push(
        `${overdueTaskCount} overdue task${overdueTaskCount === 1 ? "" : "s"}`,
      );
    }
    if (pendingApprovalCount > 0) {
      reasons.push(
        `${pendingApprovalCount} pending approval${pendingApprovalCount === 1 ? "" : "s"}`,
      );
    }
    if (changesRequestedCount > 0) {
      reasons.push(
        `${changesRequestedCount} changes requested`,
      );
    }
    eventsNeedingAttention.push({
      id: event.id,
      title: event.title,
      date: event.date,
      reasons,
      overdueTaskCount,
      pendingApprovalCount,
      changesRequestedCount,
    });
  }

  eventsNeedingAttention.sort((a, b) => {
    const score = (entry: OrgEventAttention) =>
      entry.overdueTaskCount * 3 +
      entry.changesRequestedCount * 2 +
      entry.pendingApprovalCount;
    return score(b) - score(a) || a.date.localeCompare(b.date);
  });

  const eventsBehind = [...overdueByEvent.entries()]
    .map(([id, overdueTaskCount]) => ({
      id,
      title: eventTitleById.get(id) ?? "Event",
      overdueTaskCount,
    }))
    .sort((a, b) => b.overdueTaskCount - a.overdueTaskCount);

  const publishingToday: OrgScheduleItem[] = [];
  const scheduledWeek: OrgScheduleItem[] = [];

  if (
    !scheduledItemsResult.error ||
    isAbsentTable(scheduledItemsResult.error)
  ) {
    for (const row of scheduledItemsResult.data ?? []) {
      const scheduleAt =
        typeof row.schedule_at === "string" ? row.schedule_at : null;
      const scheduleDate = toScheduleDate(scheduleAt);
      if (!scheduleDate) continue;
      const eventId =
        typeof row.event_id === "string" ? row.event_id : null;
      const item: OrgScheduleItem = {
        id: String(row.id),
        milestoneName: String(row.milestone_name ?? "Scheduled post"),
        eventId,
        eventTitle: eventId ? (eventTitleById.get(eventId) ?? null) : null,
        scheduleDate,
      };
      if (scheduleDate === today) publishingToday.push(item);
      if (scheduleDate >= today && scheduleDate <= weekEnd) {
        scheduledWeek.push(item);
      }
    }
  }

  const eventsThisWeek = events
    .filter((event) => event.date >= today && event.date <= weekEnd)
    .slice(0, 12);

  const assignedCount = approvalQueue?.assignedToMe.length ?? 0;
  const attentionCount = eventsNeedingAttention.length + assignedCount;

  return {
    organizationName,
    roleLabel,
    approvalQueue: {
      assignedToMeCount: assignedCount,
      allPendingCount: approvalQueue?.allPending.length ?? 0,
      changesRequestedCount: approvalQueue?.changesRequested.length ?? 0,
      assignedToMe,
      changesRequested,
    },
    eventsNeedingAttention: eventsNeedingAttention.slice(0, 8),
    behindSchedule: {
      overdueTaskCount: overdueTasks.length,
      overdueTasks: overdueTasks.slice(0, 8),
      eventsBehind: eventsBehind.slice(0, 8),
    },
    todaySummary: {
      attentionCount,
      waitingOnMeCount: assignedCount,
      publishingTodayCount: publishingToday.length,
      publishingToday: publishingToday.slice(0, 8),
      eventsThisWeek,
    },
    thisWeek: {
      scheduledCount: scheduledWeek.length,
      scheduled: scheduledWeek.slice(0, 12),
      events: eventsThisWeek,
    },
    links,
  };
}
