import {
  getDueTodaySteps,
  getOverdueSteps,
  getUpcomingSteps,
} from "@/lib/playbooks/health";
import { getTodayDateString, addDaysToDateOnly, parseLocalDate } from "@/lib/utils/dates";
import type { EventCommunicationStep } from "@/types/playbooks";

export interface EventNextStep {
  action: string;
  dueMessage: string | null;
}

export function getEventNextStep(
  hasCampaign: boolean,
  steps: EventCommunicationStep[],
): EventNextStep {
  if (!hasCampaign) {
    return {
      action: "This event stays on the calendar — no campaign needed.",
      dueMessage: null,
    };
  }

  const overdueSteps = getOverdueSteps(steps);
  if (overdueSteps.length > 0) {
    return {
      action: overdueSteps[0].title,
      dueMessage: formatStepDueMessage(overdueSteps[0].dueDate, true),
    };
  }

  const dueTodaySteps = getDueTodaySteps(steps);
  if (dueTodaySteps.length > 0) {
    return {
      action: dueTodaySteps[0].title,
      dueMessage: "Due today",
    };
  }

  const upcomingSteps = getUpcomingSteps(steps, 1);
  if (upcomingSteps.length > 0) {
    return {
      action: upcomingSteps[0].title,
      dueMessage: formatStepDueMessage(upcomingSteps[0].dueDate, false),
    };
  }

  return {
    action: "Review materials before event day — you're in great shape.",
    dueMessage: null,
  };
}

/** @deprecated Use getEventNextStep for structured hero copy */
export function getNextHelpfulAction(
  hasCampaign: boolean,
  steps: EventCommunicationStep[],
): string {
  const next = getEventNextStep(hasCampaign, steps);
  if (next.dueMessage) {
    return `${next.action} — ${next.dueMessage}`;
  }
  return next.action;
}

function formatStepDueMessage(dueDate: string, overdue: boolean): string | null {
  if (overdue) {
    return "Needs attention";
  }

  const today = getTodayDateString();
  if (dueDate === today) {
    return "Due today";
  }

  const tomorrow = addDaysToDateOnly(today, 1);
  if (dueDate === tomorrow) {
    return "Due tomorrow";
  }

  const diff = dayDiff(today, dueDate);
  if (diff > 1) {
    return `Due in ${diff} days`;
  }

  return null;
}

function dayDiff(from: string, to: string): number {
  const start = parseLocalDate(from);
  const end = parseLocalDate(to);
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}
