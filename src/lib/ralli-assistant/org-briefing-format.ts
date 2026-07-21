import type { OrgCommunicationsContextSection } from "./communications-format.ts";
import {
  emptyOrgCommunicationsSection,
  formatOrgCommunicationsSectionLines,
  serializeOrgCommunicationsForPrompt,
} from "./communications-format.ts";
import type { ProductHelpLink } from "./product-help-knowledge.ts";
import type { OrgVolunteersContextSection } from "./volunteers-format.ts";
import {
  emptyOrgVolunteersSection,
  formatOrgVolunteersSectionLines,
  serializeOrgVolunteersForPrompt,
} from "./volunteers-format.ts";

export interface OrgApprovalItem {
  id: string;
  eventId: string;
  eventTitle: string;
  label: string;
  status: string;
  assignedToMe: boolean;
}

export interface OrgEventAttention {
  id: string;
  title: string;
  date: string;
  reasons: string[];
  overdueTaskCount: number;
  pendingApprovalCount: number;
  changesRequestedCount: number;
}

export interface OrgOverdueTask {
  id: string;
  title: string;
  eventId: string;
  eventTitle: string;
  dueDate: string | null;
}

export interface OrgScheduleItem {
  id: string;
  milestoneName: string;
  eventId: string | null;
  eventTitle: string | null;
  scheduleDate: string | null;
}

export interface OrgBriefingContextPack {
  organizationName: string | null;
  roleLabel: string | null;
  approvalQueue: {
    assignedToMeCount: number;
    allPendingCount: number;
    changesRequestedCount: number;
    assignedToMe: OrgApprovalItem[];
    changesRequested: OrgApprovalItem[];
  };
  eventsNeedingAttention: OrgEventAttention[];
  behindSchedule: {
    overdueTaskCount: number;
    overdueTasks: OrgOverdueTask[];
    eventsBehind: Array<{
      id: string;
      title: string;
      overdueTaskCount: number;
    }>;
  };
  todaySummary: {
    attentionCount: number;
    waitingOnMeCount: number;
    publishingTodayCount: number;
    publishingToday: OrgScheduleItem[];
    eventsThisWeek: Array<{ id: string; title: string; date: string }>;
  };
  thisWeek: {
    scheduledCount: number;
    scheduled: OrgScheduleItem[];
    events: Array<{ id: string; title: string; date: string }>;
  };
  volunteers: OrgVolunteersContextSection;
  communications: OrgCommunicationsContextSection;
  links: ProductHelpLink[];
}

export function buildOrgBriefingLinks(): ProductHelpLink[] {
  return [
    { label: "Approvals", href: "/approvals" },
    { label: "Today", href: "/dashboard" },
    { label: "Tasks", href: "/tasks" },
    { label: "Campaigns", href: "/events" },
    { label: "Communications Hub", href: "/communications" },
    { label: "Calendar", href: "/calendar" },
  ];
}

export function emptyOrgPhase3Sections(): {
  volunteers: OrgVolunteersContextSection;
  communications: OrgCommunicationsContextSection;
} {
  return {
    volunteers: emptyOrgVolunteersSection([
      "Individual volunteer response status (who hasn’t responded)",
      "Family / parent view counts for volunteer pages",
    ]),
    communications: emptyOrgCommunicationsSection([
      "Family / parent email open or view counts",
      "Meta post performance (reach, best-performing post) — Insights later",
    ]),
  };
}

/** Deterministic answer when AI is unavailable — grounded in the pack only. */
export function formatDeterministicOrgBriefingAnswer(
  pack: OrgBriefingContextPack,
): string {
  const lines: string[] = [];
  const who = pack.roleLabel
    ? `${pack.roleLabel} briefing`
    : "Organization briefing";
  const org = pack.organizationName ? ` for ${pack.organizationName}` : "";
  lines.push(`${who}${org}.`);
  lines.push("");

  const { approvalQueue } = pack;
  if (approvalQueue.assignedToMeCount > 0) {
    const samples = approvalQueue.assignedToMe
      .slice(0, 3)
      .map((item) => `${item.label} (${item.eventTitle})`)
      .join("; ");
    lines.push(
      `Needs your approval (${approvalQueue.assignedToMeCount}): ${samples}.`,
    );
  } else {
    lines.push("Needs your approval: nothing assigned to you right now.");
  }

  if (approvalQueue.changesRequestedCount > 0) {
    lines.push(
      `Changes requested across the org: ${approvalQueue.changesRequestedCount}.`,
    );
  }

  if (pack.eventsNeedingAttention.length > 0) {
    const samples = pack.eventsNeedingAttention
      .slice(0, 4)
      .map(
        (event) =>
          `${event.title} (${event.reasons.slice(0, 2).join(", ") || "attention"})`,
      )
      .join("; ");
    lines.push(
      `Events needing attention (${pack.eventsNeedingAttention.length}): ${samples}.`,
    );
  } else {
    lines.push("Events needing attention: none flagged from overdue tasks or pending approvals.");
  }

  if (pack.behindSchedule.overdueTaskCount > 0) {
    const samples = pack.behindSchedule.overdueTasks
      .slice(0, 3)
      .map((task) => `${task.title} (${task.eventTitle})`)
      .join("; ");
    lines.push(
      `Behind schedule: ${pack.behindSchedule.overdueTaskCount} overdue task${
        pack.behindSchedule.overdueTaskCount === 1 ? "" : "s"
      }${samples ? ` — ${samples}` : ""}.`,
    );
  } else {
    lines.push("Behind schedule: no overdue playbook tasks in the loaded list.");
  }

  lines.push(
    `Today: ${pack.todaySummary.waitingOnMeCount} waiting on you, ${pack.todaySummary.publishingTodayCount} publishing today, ${pack.todaySummary.eventsThisWeek.length} campaign${pack.todaySummary.eventsThisWeek.length === 1 ? "" : "s"} this week.`,
  );

  if (pack.thisWeek.scheduledCount > 0) {
    lines.push(
      `This week: ${pack.thisWeek.scheduledCount} scheduled post${
        pack.thisWeek.scheduledCount === 1 ? "" : "s"
      }.`,
    );
  } else {
    lines.push("This week: no scheduled posts found in the loaded window.");
  }

  lines.push("");
  lines.push(...formatOrgVolunteersSectionLines(pack.volunteers));
  lines.push("");
  lines.push(...formatOrgCommunicationsSectionLines(pack.communications));
  lines.push("");
  lines.push(
    "Use the links below for Approvals, Today, Tasks, Campaigns, Communications, or Calendar.",
  );

  return lines.join("\n");
}

export function serializeOrgBriefingForPrompt(
  pack: OrgBriefingContextPack,
): string {
  return JSON.stringify(
    {
      organizationName: pack.organizationName,
      roleLabel: pack.roleLabel,
      approvalQueue: {
        assignedToMeCount: pack.approvalQueue.assignedToMeCount,
        allPendingCount: pack.approvalQueue.allPendingCount,
        changesRequestedCount: pack.approvalQueue.changesRequestedCount,
        assignedToMe: pack.approvalQueue.assignedToMe.map((item) => ({
          label: item.label,
          eventTitle: item.eventTitle,
          status: item.status,
        })),
        changesRequested: pack.approvalQueue.changesRequested.map((item) => ({
          label: item.label,
          eventTitle: item.eventTitle,
          status: item.status,
        })),
      },
      eventsNeedingAttention: pack.eventsNeedingAttention.map((event) => ({
        title: event.title,
        date: event.date,
        reasons: event.reasons,
        overdueTaskCount: event.overdueTaskCount,
        pendingApprovalCount: event.pendingApprovalCount,
        changesRequestedCount: event.changesRequestedCount,
      })),
      behindSchedule: {
        overdueTaskCount: pack.behindSchedule.overdueTaskCount,
        overdueTasks: pack.behindSchedule.overdueTasks.map((task) => ({
          title: task.title,
          eventTitle: task.eventTitle,
          dueDate: task.dueDate,
        })),
        eventsBehind: pack.behindSchedule.eventsBehind,
      },
      todaySummary: {
        attentionCount: pack.todaySummary.attentionCount,
        waitingOnMeCount: pack.todaySummary.waitingOnMeCount,
        publishingTodayCount: pack.todaySummary.publishingTodayCount,
        publishingToday: pack.todaySummary.publishingToday.map(
          (item) => item.milestoneName,
        ),
        eventsThisWeek: pack.todaySummary.eventsThisWeek,
      },
      thisWeek: {
        scheduledCount: pack.thisWeek.scheduledCount,
        scheduled: pack.thisWeek.scheduled.map((item) => ({
          name: item.milestoneName,
          date: item.scheduleDate,
          eventTitle: item.eventTitle,
        })),
        events: pack.thisWeek.events,
      },
      volunteers: serializeOrgVolunteersForPrompt(pack.volunteers),
      communications: serializeOrgCommunicationsForPrompt(pack.communications),
      links: pack.links,
    },
    null,
    2,
  );
}
