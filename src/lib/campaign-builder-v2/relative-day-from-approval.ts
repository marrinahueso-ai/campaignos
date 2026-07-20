import { playbookRelativeDay } from "./campaign-timing.ts";

/**
 * Pure relative-day resolution for CB2 → Meta scheduling.
 * Prefer the user-chosen publish date over playbook title/suggestedDate so
 * "Announcement" auto-publish does not land on "One-Week Push" slots.
 */
export function resolveRelativeDayFromApprovalInputs(input: {
  stepTitleMatchDay: number | null;
  suggestedDate: string | null | undefined;
  feedScheduleAt: string | null;
  eventDate: string;
}): number | null {
  if (input.feedScheduleAt) {
    const dateOnly = input.feedScheduleAt.slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) {
      return playbookRelativeDay(input.eventDate, dateOnly);
    }
  }

  if (typeof input.stepTitleMatchDay === "number") {
    return input.stepTitleMatchDay;
  }

  if (input.suggestedDate) {
    return playbookRelativeDay(input.eventDate, input.suggestedDate);
  }

  return null;
}
