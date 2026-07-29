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
    { label: "Volunteers", href: "/volunteers" },
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

/**
 * Prioritized “what should I do today?” list from live org context only.
 * Numbered actions a PTO president would tackle first.
 */
export function formatPrioritizedOrgActions(
  pack: OrgBriefingContextPack,
): string {
  const actions: string[] = [];

  for (const item of pack.approvalQueue.assignedToMe.slice(0, 3)) {
    actions.push(
      `Approve “${item.label}” for ${item.eventTitle} (waiting on you).`,
    );
  }

  for (const event of pack.volunteers.eventsNeedingVolunteers.slice(0, 3)) {
    const fillHint =
      event.filledPercent != null
        ? `${event.filledPercent}% filled`
        : event.openSpots != null && event.openSpots > 0
          ? `${event.openSpots} open spot${event.openSpots === 1 ? "" : "s"}`
          : "volunteers still needed";
    actions.push(
      `Send a volunteer reminder for ${event.eventTitle} (${fillHint}).`,
    );
  }

  for (const item of pack.todaySummary.publishingToday.slice(0, 2)) {
    const event = item.eventTitle ? ` for ${item.eventTitle}` : "";
    actions.push(
      `Confirm today’s publish: ${item.milestoneName}${event}.`,
    );
  }

  for (const task of pack.behindSchedule.overdueTasks.slice(0, 3)) {
    actions.push(
      `Catch up overdue task “${task.title}” (${task.eventTitle}).`,
    );
  }

  for (const event of pack.eventsNeedingAttention.slice(0, 3)) {
    if (actions.some((line) => line.includes(event.title))) continue;
    const reason = event.reasons[0] || "needs attention";
    actions.push(`Check ${event.title} — ${reason}.`);
  }

  for (const item of pack.thisWeek.scheduled.slice(0, 2)) {
    if (
      pack.todaySummary.publishingToday.some((today) => today.id === item.id)
    ) {
      continue;
    }
    const event = item.eventTitle ? ` (${item.eventTitle})` : "";
    actions.push(
      `Prep this week’s scheduled post: ${item.milestoneName}${event}.`,
    );
  }

  if (actions.length === 0) {
    return [
      "Here’s a calm read of your plate right now:",
      "Nothing urgent is flagged in approvals, overdue tasks, volunteer gaps, or today’s publish queue.",
      "A good next move: skim Campaigns for the nearest event date, or ask “What do I have this week?”",
    ].join("\n");
  }

  const numbered = actions
    .slice(0, 6)
    .map((line, index) => `${index + 1}. ${line}`);

  return [
    "Here’s what I’d tackle first today:",
    "",
    ...numbered,
    "",
    "Work top to bottom — clear approvals and volunteer gaps before new creative work.",
  ].join("\n");
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

  lines.push("Approvals");
  const { approvalQueue } = pack;
  if (approvalQueue.assignedToMeCount > 0) {
    const samples = approvalQueue.assignedToMe
      .slice(0, 3)
      .map((item) => `${item.label} (${item.eventTitle})`)
      .join("; ");
    lines.push(
      `• Needs your approval (${approvalQueue.assignedToMeCount}): ${samples}.`,
    );
  } else {
    lines.push("• Needs your approval: nothing assigned to you right now.");
  }

  if (approvalQueue.changesRequestedCount > 0) {
    lines.push(
      `• Changes requested across the org: ${approvalQueue.changesRequestedCount}.`,
    );
  }

  lines.push("");
  lines.push("Attention");
  if (pack.eventsNeedingAttention.length > 0) {
    const samples = pack.eventsNeedingAttention
      .slice(0, 4)
      .map(
        (event) =>
          `${event.title} (${event.reasons.slice(0, 2).join(", ") || "attention"})`,
      )
      .join("; ");
    lines.push(
      `• Events needing attention (${pack.eventsNeedingAttention.length}): ${samples}.`,
    );
  } else {
    lines.push(
      "• Events needing attention: none flagged from overdue tasks or pending approvals.",
    );
  }

  if (pack.behindSchedule.overdueTaskCount > 0) {
    const samples = pack.behindSchedule.overdueTasks
      .slice(0, 3)
      .map((task) => `${task.title} (${task.eventTitle})`)
      .join("; ");
    lines.push(
      `• Behind schedule: ${pack.behindSchedule.overdueTaskCount} overdue task${
        pack.behindSchedule.overdueTaskCount === 1 ? "" : "s"
      }${samples ? ` — ${samples}` : ""}.`,
    );
  } else {
    lines.push(
      "• Behind schedule: no overdue communication plan tasks in the loaded list.",
    );
  }

  lines.push("");
  lines.push("Today & this week");
  lines.push(
    `• Today: ${pack.todaySummary.waitingOnMeCount} waiting on you, ${pack.todaySummary.publishingTodayCount} publishing today, ${pack.todaySummary.eventsThisWeek.length} campaign${pack.todaySummary.eventsThisWeek.length === 1 ? "" : "s"} this week.`,
  );

  if (pack.thisWeek.scheduledCount > 0) {
    lines.push(
      `• This week: ${pack.thisWeek.scheduledCount} scheduled post${
        pack.thisWeek.scheduledCount === 1 ? "" : "s"
      }.`,
    );
  } else {
    lines.push(
      "• This week: no scheduled posts found in the loaded window.",
    );
  }

  lines.push("");
  lines.push(...formatOrgVolunteersSectionLines(pack.volunteers));
  lines.push("");
  lines.push(...formatOrgCommunicationsSectionLines(pack.communications));

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
