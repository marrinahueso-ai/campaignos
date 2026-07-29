import { initialsFromName } from "@/lib/approvals-scheduling/status";
import type { UnifiedApprovalItem } from "@/lib/approvals-scheduling/types";
import { isOpenTaskStatus } from "@/lib/event-playbooks/task-status";
import { eventDetailApprovalsHref } from "@/lib/events/event-responsibility";
import { resolveResponsiblePersonForEvent } from "@/lib/events/event-responsibility";
import type { CommitteeAssignmentRecord } from "@/lib/organization-workspace/roster-assignments";
import type { Event } from "@/types";
import type {
  OrganizationCommittee,
  OrganizationMember,
} from "@/types/organization-workspace";
import type { TaskHubTaskItem } from "@/types/task-hub";

export type DashboardWidgetLens = "mine" | "everyone";

export type DashboardPostWeekStatus = "scheduled" | "draft" | "needs_approval";

export interface DashboardPostWeekItem {
  id: string;
  eventId: string;
  eventTitle: string;
  postTitle: string;
  channelLabel: string;
  scheduleAt: string | null;
  scheduleLabel: string;
  status: DashboardPostWeekStatus;
  href: string;
  submittedByMe: boolean;
  assignedToMe: boolean;
}

export interface DashboardPostsWeekEveryoneData {
  scheduledThisWeek: number;
  needsApprovalFirst: number;
  goingOutToday: number;
}

export interface DashboardWaitingOnOthersItem {
  id: string;
  eventId: string;
  eventTitle: string;
  title: string;
  waitingOnName: string;
  waitingOnRole: string | null;
  waitingDays: number;
  href: string;
  kind: "approval" | "task";
}

export interface DashboardWaitingOnOthersEveryoneData {
  blockedApprovals: number;
  blockedTasks: number;
  overThreeDays: number;
}

export type EventCoverageStatus = "needs_lead" | "needs_co_lead" | "covered";

export interface DashboardEventCoverageItem {
  id: string;
  eventId: string;
  title: string;
  date: string;
  daysUntil: number;
  status: EventCoverageStatus;
  leadName: string | null;
  leadInitials: string | null;
  coLeadName: string | null;
  detailLine: string;
  href: string;
}

export interface DashboardLibraryWidgetData {
  postsWeek: {
    mine: DashboardPostWeekItem[];
    everyone: DashboardPostsWeekEveryoneData;
  };
  waitingOthers: {
    mine: DashboardWaitingOnOthersItem[];
    everyone: DashboardWaitingOnOthersEveryoneData;
  };
  eventCoverage: DashboardEventCoverageItem[];
}

const ACTIVE_POST_STATUSES = new Set([
  "in_queue",
  "assigned_to_me",
  "changes_requested",
  "scheduled",
  "failed",
]);

const PENDING_APPROVAL_STATUSES = new Set(["in_queue", "assigned_to_me"]);

function scheduleDateKey(scheduleAt: string | null): string | null {
  if (!scheduleAt) return null;
  return scheduleAt.slice(0, 10);
}

export function isDateInWeek(
  date: string | null,
  today: string,
  weekEnd: string,
): boolean {
  if (!date) return false;
  return date >= today && date <= weekEnd;
}

export function daysBetweenDateOnly(from: string, to: string): number {
  const start = new Date(`${from}T12:00:00`);
  const end = new Date(`${to}T12:00:00`);
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

export function daysWaitingSince(isoDate: string, today: string): number {
  const requested = scheduleDateKey(isoDate) ?? isoDate.slice(0, 10);
  return Math.max(0, daysBetweenDateOnly(requested, today));
}

function platformLabel(item: UnifiedApprovalItem): string {
  const platforms = item.platforms;
  if (platforms.includes("facebook") && platforms.includes("instagram")) {
    return "Facebook & Instagram";
  }
  if (platforms.includes("facebook")) return "Facebook";
  if (platforms.includes("instagram")) return "Instagram";
  if (platforms.includes("email")) return "Email";
  return "Post";
}

export function derivePostWeekStatus(
  item: UnifiedApprovalItem,
): DashboardPostWeekStatus {
  if (item.workflowStatus === "scheduled") {
    return "scheduled";
  }
  if (
    item.workflowStatus === "in_queue" ||
    item.workflowStatus === "assigned_to_me"
  ) {
    return "needs_approval";
  }
  if (
    item.workflowStatus === "changes_requested" ||
    item.deliveryMethod === "draft-only"
  ) {
    return "draft";
  }
  return "draft";
}

function isActivePostItem(item: UnifiedApprovalItem): boolean {
  return ACTIVE_POST_STATUSES.has(item.workflowStatus);
}

export function filterPostsWeekMine(
  items: UnifiedApprovalItem[],
  _actorUserId: string | null,
): UnifiedApprovalItem[] {
  return items.filter((item) => {
    if (!isActivePostItem(item)) return false;
    if (!(item.submittedByMe || item.assignedToMe)) return false;
    if (item.assignedToMe && !item.submittedByMe) {
      return PENDING_APPROVAL_STATUSES.has(item.workflowStatus);
    }
    return true;
  });
}

export function filterPostsWeekScheduledThisWeek(
  items: UnifiedApprovalItem[],
  today: string,
  weekEnd: string,
): UnifiedApprovalItem[] {
  return items.filter(
    (item) =>
      isActivePostItem(item) &&
      isDateInWeek(scheduleDateKey(item.scheduleAt), today, weekEnd),
  );
}

export function mapUnifiedItemToPostWeekItem(
  item: UnifiedApprovalItem,
): DashboardPostWeekItem {
  return {
    id: item.id,
    eventId: item.eventId,
    eventTitle: item.eventTitle,
    postTitle: item.milestoneName,
    channelLabel: platformLabel(item),
    scheduleAt: item.scheduleAt,
    scheduleLabel: item.scheduleLabel ?? "Unscheduled",
    status: derivePostWeekStatus(item),
    href: eventDetailApprovalsHref(item.eventId),
    submittedByMe: item.submittedByMe,
    assignedToMe: item.assignedToMe,
  };
}

export function buildPostsWeekEveryoneCounts(
  items: UnifiedApprovalItem[],
  today: string,
  weekEnd: string,
): DashboardPostsWeekEveryoneData {
  const weekItems = filterPostsWeekScheduledThisWeek(items, today, weekEnd);
  return {
    scheduledThisWeek: weekItems.filter(
      (item) => item.workflowStatus === "scheduled",
    ).length,
    needsApprovalFirst: items.filter((item) =>
      PENDING_APPROVAL_STATUSES.has(item.workflowStatus),
    ).length,
    goingOutToday: weekItems.filter(
      (item) => scheduleDateKey(item.scheduleAt) === today,
    ).length,
  };
}

export function filterWaitingOnOthersMine(
  items: UnifiedApprovalItem[],
): UnifiedApprovalItem[] {
  return items.filter(
    (item) =>
      item.submittedByMe &&
      !item.assignedToMe &&
      PENDING_APPROVAL_STATUSES.has(item.workflowStatus),
  );
}

export function filterBlockedTasks(
  tasks: TaskHubTaskItem[],
  viewerUserId: string | null,
  lens: DashboardWidgetLens,
): TaskHubTaskItem[] {
  return tasks.filter((task) => {
    if (!isOpenTaskStatus(task.status)) return false;
    if (!task.assigneeUserId && !task.assigneeName?.trim()) return false;
    if (lens === "mine") {
      return Boolean(
        viewerUserId &&
          task.assigneeUserId &&
          task.assigneeUserId !== viewerUserId,
      );
    }
    if (viewerUserId && task.assigneeUserId === viewerUserId) {
      return false;
    }
    return true;
  });
}

export function mapApprovalToWaitingItem(
  item: UnifiedApprovalItem,
  today: string,
): DashboardWaitingOnOthersItem {
  return {
    id: item.id,
    eventId: item.eventId,
    eventTitle: item.eventTitle,
    title: item.milestoneName,
    waitingOnName: item.assigneeName,
    waitingOnRole: item.assigneeRole,
    waitingDays: daysWaitingSince(item.requestedAt, today),
    href: eventDetailApprovalsHref(item.eventId),
    kind: "approval",
  };
}

export function buildWaitingOnOthersEveryoneCounts(input: {
  approvals: UnifiedApprovalItem[];
  tasks: TaskHubTaskItem[];
  viewerUserId: string | null;
  today: string;
}): DashboardWaitingOnOthersEveryoneData {
  const blockedApprovals = input.approvals.filter(
    (item) =>
      PENDING_APPROVAL_STATUSES.has(item.workflowStatus) &&
      item.hasAssignedUser &&
      !item.assignedToMe,
  ).length;

  const blockedTasks = filterBlockedTasks(
    input.tasks,
    input.viewerUserId,
    "everyone",
  ).length;

  const staleApprovals = input.approvals.filter(
    (item) =>
      PENDING_APPROVAL_STATUSES.has(item.workflowStatus) &&
      daysWaitingSince(item.requestedAt, input.today) > 3,
  ).length;

  const staleTasks = filterBlockedTasks(
    input.tasks,
    input.viewerUserId,
    "everyone",
  ).filter((task) => {
    const anchor = task.dueDate ?? input.today;
    return daysWaitingSince(anchor, input.today) > 3;
  }).length;

  return {
    blockedApprovals,
    blockedTasks,
    overThreeDays: staleApprovals + staleTasks,
  };
}

export function buildEventCoverageItems(input: {
  events: Event[];
  today: string;
  committees: OrganizationCommittee[];
  members: OrganizationMember[];
  committeeAssignments: CommitteeAssignmentRecord[];
}): DashboardEventCoverageItem[] {
  const { committees, members, committeeAssignments } = input;

  const rows: DashboardEventCoverageItem[] = [];

  for (const event of input.events) {
    if (event.status === "archived" || event.date < input.today) continue;

    const responsible = resolveResponsiblePersonForEvent({
      eventId: event.id,
      event,
      committees,
      members,
      committeeAssignments: committeeAssignments.map((row) => ({
        organizationMemberId: row.organizationMemberId,
        committeeId: row.committeeId,
        role: row.role,
      })),
    });

    const tiedCommitteeIds = new Set(
      committees
        .filter((committee) => committee.assignedEventId === event.id)
        .map((committee) => committee.id),
    );
    const tiedAssignments = committeeAssignments.filter((assignment) =>
      tiedCommitteeIds.has(assignment.committeeId),
    );
    const hasChair = tiedAssignments.some((assignment) => assignment.role === "chair");
    const coChairAssignment = tiedAssignments.find(
      (assignment) => assignment.role === "co_chair",
    );
    const coLeadMember = coChairAssignment
      ? members.find((member) => member.id === coChairAssignment.organizationMemberId)
      : null;

    let status: EventCoverageStatus = "covered";
    let detailLine = "Lead assigned";

    if (responsible.source === "none" && !hasChair) {
      status = "needs_lead";
      detailLine = "No event lead assigned";
    } else if (hasChair && !coChairAssignment) {
      status = "needs_co_lead";
      detailLine = "Lead assigned, co-lead open";
    } else if (coLeadMember) {
      detailLine = `${responsible.displayName} · co-lead ${coLeadMember.name}`;
    } else if (responsible.source !== "none") {
      detailLine = responsible.displayName;
    }

    if (status === "covered") continue;

    rows.push({
      id: event.id,
      eventId: event.id,
      title: event.title,
      date: event.date,
      daysUntil: daysBetweenDateOnly(input.today, event.date),
      status,
      leadName: responsible.source === "none" ? null : responsible.displayName,
      leadInitials:
        responsible.source === "none"
          ? null
          : initialsFromName(responsible.displayName),
      coLeadName: coLeadMember?.name ?? null,
      detailLine,
      href: `/events/${event.id}`,
    });
  }

  return rows.sort((left, right) => {
    if (left.daysUntil !== right.daysUntil) {
      return left.daysUntil - right.daysUntil;
    }
    return left.title.localeCompare(right.title);
  });
}

export function buildPostsWeekMineItems(
  items: UnifiedApprovalItem[],
  actorUserId: string | null,
  today: string,
  weekEnd: string,
  limit = 5,
): DashboardPostWeekItem[] {
  const minePosts = filterPostsWeekMine(items, actorUserId)
    .filter((item) =>
      isDateInWeek(scheduleDateKey(item.scheduleAt), today, weekEnd),
    )
    .concat(
      filterPostsWeekMine(items, actorUserId).filter(
        (item) =>
          !scheduleDateKey(item.scheduleAt) &&
          PENDING_APPROVAL_STATUSES.has(item.workflowStatus),
      ),
    );

  return [...new Map(minePosts.map((item) => [item.id, item])).values()]
    .sort((left, right) =>
      (scheduleDateKey(left.scheduleAt) ?? "9999").localeCompare(
        scheduleDateKey(right.scheduleAt) ?? "9999",
      ),
    )
    .slice(0, limit)
    .map(mapUnifiedItemToPostWeekItem);
}

export function buildWaitingOnOthersMineItems(
  items: UnifiedApprovalItem[],
  today: string,
  limit = 5,
): DashboardWaitingOnOthersItem[] {
  return filterWaitingOnOthersMine(items)
    .slice(0, limit)
    .map((item) => mapApprovalToWaitingItem(item, today));
}
