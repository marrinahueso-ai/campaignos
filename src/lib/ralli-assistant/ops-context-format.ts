import type { CommunicationsContextSection } from "./communications-format.ts";
import {
  emptyCommunicationsSection,
  formatCommunicationsSectionLines,
  serializeCommunicationsForPrompt,
} from "./communications-format.ts";
import type { ResolvableEvent } from "./event-resolver.ts";
import type { ProductHelpLink } from "./product-help-knowledge.ts";
import type { VolunteersContextSection } from "./volunteers-format.ts";
import {
  emptyVolunteersSection,
  formatVolunteersSectionLines,
  serializeVolunteersForPrompt,
} from "./volunteers-format.ts";

export interface OpsTaskSummary {
  id: string;
  title: string;
  status: string;
  dueDate: string | null;
  overdue: boolean;
}

export interface OpsApprovalSummary {
  id: string;
  label: string;
  status: string;
  source: "classic" | "scheduling";
}

export interface OpsScheduleItem {
  id: string;
  milestoneName: string;
  scheduleAt: string | null;
  scheduleDate: string | null;
}

export interface OpsContextPack {
  event: ResolvableEvent;
  nextAction: {
    action: string;
    dueMessage: string | null;
  } | null;
  tasks: {
    incompleteCount: number;
    overdueCount: number;
    overdue: OpsTaskSummary[];
    incomplete: OpsTaskSummary[];
  };
  approvals: {
    pendingCount: number;
    changesRequestedCount: number;
    items: OpsApprovalSummary[];
  };
  schedule: {
    today: OpsScheduleItem[];
    tomorrow: OpsScheduleItem[];
    thisWeek: OpsScheduleItem[];
  };
  readiness: {
    milestoneCount: number | null;
    builderStep: string | null;
    summary: string;
  };
  volunteers: VolunteersContextSection;
  communications: CommunicationsContextSection;
  links: ProductHelpLink[];
}

export function emptyOpsVolunteersAndComms(): {
  volunteers: VolunteersContextSection;
  communications: CommunicationsContextSection;
} {
  return {
    volunteers: emptyVolunteersSection([
      "Individual volunteer response status (who hasn’t responded)",
      "Family / parent view counts for volunteer pages",
    ]),
    communications: emptyCommunicationsSection([
      "Family / parent email open or view counts",
      "Meta post performance (reach, best-performing post) — Insights later",
    ]),
  };
}

/** Deterministic answer when AI is unavailable — still grounded in the pack. */
export function formatDeterministicOpsAnswer(pack: OpsContextPack): string {
  const lines: string[] = [];
  lines.push(
    `Here’s the operational snapshot for ${pack.event.title} (${pack.event.date}, ${pack.event.status}).`,
  );
  lines.push("");

  if (pack.nextAction) {
    const due = pack.nextAction.dueMessage
      ? ` — ${pack.nextAction.dueMessage}`
      : "";
    lines.push(`Next: ${pack.nextAction.action}${due}`);
  }

  if (pack.tasks.overdueCount > 0) {
    lines.push(
      `Overdue tasks (${pack.tasks.overdueCount}): ${
        pack.tasks.overdue.map((task) => task.title).join("; ") ||
        "see Tasks tab"
      }.`,
    );
  } else if (pack.tasks.incompleteCount > 0) {
    lines.push(
      `Open tasks: ${pack.tasks.incompleteCount} incomplete (none overdue in the loaded list).`,
    );
  } else {
    lines.push("Tasks: no incomplete playbook tasks found.");
  }

  const approvalTotal =
    pack.approvals.pendingCount + pack.approvals.changesRequestedCount;
  if (approvalTotal > 0) {
    lines.push(
      `Approvals: ${pack.approvals.pendingCount} pending, ${pack.approvals.changesRequestedCount} changes requested.`,
    );
  } else {
    lines.push("Approvals: nothing pending or changes-requested right now.");
  }

  if (pack.schedule.today.length > 0) {
    lines.push(
      `Publishing today: ${pack.schedule.today
        .map((item) => item.milestoneName)
        .join("; ")}.`,
    );
  } else {
    lines.push("Publishing today: none scheduled.");
  }

  if (pack.schedule.thisWeek.length > 0) {
    lines.push(
      `This week: ${pack.schedule.thisWeek.length} scheduled item${
        pack.schedule.thisWeek.length === 1 ? "" : "s"
      }.`,
    );
  }

  lines.push(`Readiness: ${pack.readiness.summary}`);
  lines.push("");
  lines.push(...formatVolunteersSectionLines(pack.volunteers));
  lines.push("");
  lines.push(...formatCommunicationsSectionLines(pack.communications));
  lines.push("");
  lines.push(
    "Use the links below to jump into Tasks, Approvals, Volunteers, or Communications.",
  );

  return lines.join("\n");
}

export function serializeOpsContextForPrompt(pack: OpsContextPack): string {
  return JSON.stringify(
    {
      event: pack.event,
      nextAction: pack.nextAction,
      tasks: {
        incompleteCount: pack.tasks.incompleteCount,
        overdueCount: pack.tasks.overdueCount,
        overdue: pack.tasks.overdue.map((task) => ({
          title: task.title,
          dueDate: task.dueDate,
          status: task.status,
        })),
        incomplete: pack.tasks.incomplete.map((task) => ({
          title: task.title,
          dueDate: task.dueDate,
          status: task.status,
        })),
      },
      approvals: {
        pendingCount: pack.approvals.pendingCount,
        changesRequestedCount: pack.approvals.changesRequestedCount,
        items: pack.approvals.items.map((item) => ({
          label: item.label,
          status: item.status,
        })),
      },
      schedule: {
        today: pack.schedule.today.map((item) => item.milestoneName),
        tomorrow: pack.schedule.tomorrow.map((item) => item.milestoneName),
        thisWeek: pack.schedule.thisWeek.map((item) => ({
          name: item.milestoneName,
          date: item.scheduleDate,
        })),
      },
      readiness: pack.readiness,
      volunteers: serializeVolunteersForPrompt(pack.volunteers),
      communications: serializeCommunicationsForPrompt(pack.communications),
      links: pack.links,
    },
    null,
    2,
  );
}
