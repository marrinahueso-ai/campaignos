import "server-only";

import { createClient } from "@/lib/supabase/server";
import { campaignBuilderHref } from "@/lib/campaign-builder-v2/navigation";
import { isMissingSchemaError } from "@/lib/creative-assets/schema-errors";
import { getEventPlaybookTasksForEvents } from "@/lib/event-playbooks/queries";
import { isOpenTaskStatus } from "@/lib/event-playbooks/task-status";
import { getEventNextStep } from "@/lib/event-workspace/get-next-helpful-action";
import { getActiveMembership } from "@/lib/auth/membership-queries";
import {
  eventApprovalsHref,
  eventTasksHref,
  eventVolunteersHref,
} from "@/lib/events/event-responsibility";
import { countMilestonesFromSessionData } from "@/lib/events-phase3/hero-stats-utils";
import { getEventCommunicationSteps } from "@/lib/playbooks/queries";
import { loadCommunicationsContextForEvent } from "@/lib/ralli-assistant/communications-context";
import type { ResolvableEvent } from "@/lib/ralli-assistant/event-resolver";
import type {
  OpsApprovalSummary,
  OpsContextPack,
  OpsScheduleItem,
  OpsTaskSummary,
} from "@/lib/ralli-assistant/ops-context-format";
import { emptyOpsVolunteersAndComms } from "@/lib/ralli-assistant/ops-context-format";
import { formatEventChipLabel } from "@/lib/ralli-assistant/answer-display";
import type { ProductHelpLink } from "@/lib/ralli-assistant/product-help-knowledge";
import { loadVolunteersContextForEvent } from "@/lib/ralli-assistant/volunteers-context";
import {
  addDaysToDateOnly,
  getTodayDateString,
  isoToLocalDateOnly,
  normalizeDateOnly,
} from "@/lib/utils/dates";

export type {
  OpsApprovalSummary,
  OpsContextPack,
  OpsScheduleItem,
  OpsTaskSummary,
} from "@/lib/ralli-assistant/ops-context-format";
export {
  formatDeterministicOpsAnswer,
  serializeOpsContextForPrompt,
} from "@/lib/ralli-assistant/ops-context-format";

function isAbsentTable(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return isMissingSchemaError(error) || error.code === "42P01";
}

function buildOpsLinks(event: {
  id: string;
  title: string;
  date: string;
}): ProductHelpLink[] {
  return [
    { label: "Event tasks", href: eventTasksHref(event.id) },
    { label: "Approvals", href: eventApprovalsHref(event.id) },
    { label: "Volunteers", href: eventVolunteersHref(event.id) },
    { label: "Create with AI", href: campaignBuilderHref(event.id) },
    { label: "Communications Hub", href: "/communications" },
    {
      label: formatEventChipLabel(event.title, event.date),
      href: `/events/${event.id}`,
    },
    { label: "Calendar", href: "/calendar" },
  ];
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

/**
 * Compact read-only ops pack for one event. Fail soft — empty sections on errors.
 */
export async function buildOpsContextPack(
  event: ResolvableEvent,
): Promise<OpsContextPack> {
  const supabase = await createClient();
  const today = getTodayDateString();
  const tomorrow = addDaysToDateOnly(today, 1);
  const weekEnd = addDaysToDateOnly(today, 7);

  const phase3Empty = emptyOpsVolunteersAndComms();
  const emptyPack: OpsContextPack = {
    event,
    nextAction: null,
    tasks: {
      incompleteCount: 0,
      overdueCount: 0,
      overdue: [],
      incomplete: [],
    },
    approvals: {
      pendingCount: 0,
      changesRequestedCount: 0,
      items: [],
    },
    schedule: { today: [], tomorrow: [], thisWeek: [] },
    readiness: {
      milestoneCount: null,
      builderStep: null,
      summary: "No Create with AI session data available yet.",
    },
    volunteers: phase3Empty.volunteers,
    communications: phase3Empty.communications,
    links: buildOpsLinks(event),
  };

  const membership = await getActiveMembership().catch(() => null);
  const organizationId = membership?.organizationId ?? null;

  const [
    steps,
    taskRows,
    classicApprovalsResult,
    schedulingPendingResult,
    scheduledItemsResult,
    builderSessionResult,
    volunteers,
    communications,
  ] = await Promise.all([
    getEventCommunicationSteps(event.id).catch(() => []),
    getEventPlaybookTasksForEvents([event.id]).catch(() => []),
    supabase
      .from("approval_requests")
      .select("id, status, notes")
      .eq("event_id", event.id)
      .in("status", ["pending", "changes_requested"])
      .limit(12),
    supabase
      .from("approval_scheduling_items")
      .select("id, milestone_name, workflow_status, schedule_at")
      .eq("event_id", event.id)
      .in("workflow_status", [
        "in_queue",
        "assigned_to_me",
        "changes_requested",
      ])
      .limit(12),
    supabase
      .from("approval_scheduling_items")
      .select("id, milestone_name, workflow_status, schedule_at")
      .eq("event_id", event.id)
      .eq("workflow_status", "scheduled")
      .limit(40),
    supabase
      .from("campaign_builder_sessions")
      .select("current_step, session_data")
      .eq("event_id", event.id)
      .maybeSingle(),
    organizationId
      ? loadVolunteersContextForEvent({
          eventId: event.id,
          organizationId,
        }).catch(() => phase3Empty.volunteers)
      : Promise.resolve(phase3Empty.volunteers),
    loadCommunicationsContextForEvent(event.id).catch(
      () => phase3Empty.communications,
    ),
  ]);

  const nextAction =
    steps.length > 0
      ? getEventNextStep(true, steps)
      : {
          action:
            "Review planning tasks and Create with AI milestones for this event.",
          dueMessage: null,
        };

  const openTasks = taskRows.filter((task) => isOpenTaskStatus(task.status));
  const taskSummaries: OpsTaskSummary[] = openTasks.map((task) => {
    const dueDate = task.due_date ? normalizeDateOnly(task.due_date) : null;
    const overdue = Boolean(dueDate && dueDate < today);
    return {
      id: task.id,
      title: task.title,
      status: task.status,
      dueDate,
      overdue,
    };
  });
  const overdueTasks = taskSummaries.filter((task) => task.overdue);
  const incompleteSorted = [...taskSummaries].sort((a, b) => {
    if (a.overdue !== b.overdue) return a.overdue ? -1 : 1;
    if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;
    return a.title.localeCompare(b.title);
  });

  const approvalItems: OpsApprovalSummary[] = [];
  let pendingCount = 0;
  let changesRequestedCount = 0;

  if (
    !classicApprovalsResult.error ||
    isAbsentTable(classicApprovalsResult.error)
  ) {
    for (const row of classicApprovalsResult.data ?? []) {
      const status = String(row.status ?? "pending");
      if (status === "changes_requested") changesRequestedCount += 1;
      else pendingCount += 1;
      approvalItems.push({
        id: String(row.id),
        label: "Approval request",
        status,
        source: "classic",
      });
    }
  }

  if (
    !schedulingPendingResult.error ||
    isAbsentTable(schedulingPendingResult.error)
  ) {
    for (const row of schedulingPendingResult.data ?? []) {
      const status = String(row.workflow_status ?? "in_queue");
      if (status === "changes_requested") changesRequestedCount += 1;
      else pendingCount += 1;
      approvalItems.push({
        id: String(row.id),
        label: String(row.milestone_name ?? "Scheduling item"),
        status,
        source: "scheduling",
      });
    }
  }

  const scheduleToday: OpsScheduleItem[] = [];
  const scheduleTomorrow: OpsScheduleItem[] = [];
  const scheduleWeek: OpsScheduleItem[] = [];

  if (
    !scheduledItemsResult.error ||
    isAbsentTable(scheduledItemsResult.error)
  ) {
    for (const row of scheduledItemsResult.data ?? []) {
      const scheduleAt =
        typeof row.schedule_at === "string" ? row.schedule_at : null;
      const scheduleDate = toScheduleDate(scheduleAt);
      const item: OpsScheduleItem = {
        id: String(row.id),
        milestoneName: String(row.milestone_name ?? "Scheduled post"),
        scheduleAt,
        scheduleDate,
      };
      if (!scheduleDate) continue;
      if (scheduleDate === today) scheduleToday.push(item);
      if (scheduleDate === tomorrow) scheduleTomorrow.push(item);
      if (scheduleDate >= today && scheduleDate <= weekEnd) {
        scheduleWeek.push(item);
      }
    }
  }

  let milestoneCount: number | null = null;
  let builderStep: string | null = null;
  let readinessSummary = emptyPack.readiness.summary;

  if (
    !builderSessionResult.error ||
    isAbsentTable(builderSessionResult.error)
  ) {
    const data = builderSessionResult.data;
    if (data) {
      builderStep =
        typeof data.current_step === "string" ? data.current_step : null;
      milestoneCount = countMilestonesFromSessionData(data.session_data);
      const stepLabel = builderStep ?? "unknown";
      const milestoneLabel =
        milestoneCount == null
          ? "milestone count unavailable"
          : `${milestoneCount} milestone${milestoneCount === 1 ? "" : "s"}`;
      readinessSummary = `Create with AI is on the “${stepLabel}” step (${milestoneLabel}).`;
    }
  }

  return {
    event,
    nextAction,
    tasks: {
      incompleteCount: incompleteSorted.length,
      overdueCount: overdueTasks.length,
      overdue: overdueTasks.slice(0, 5),
      incomplete: incompleteSorted.slice(0, 8),
    },
    approvals: {
      pendingCount,
      changesRequestedCount,
      items: approvalItems.slice(0, 8),
    },
    schedule: {
      today: scheduleToday.slice(0, 8),
      tomorrow: scheduleTomorrow.slice(0, 8),
      thisWeek: scheduleWeek.slice(0, 12),
    },
    readiness: {
      milestoneCount,
      builderStep,
      summary: readinessSummary,
    },
    volunteers,
    communications,
    links: buildOpsLinks(event),
  };
}
