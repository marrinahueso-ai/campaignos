import { milestoneNameMatchKey } from "./milestone-names.ts";
import type { MilestoneCategory } from "./types.ts";

/**
 * Default creative intent when playbooks (or older sessions) leave purpose blank.
 * Kept short — used as internal AI guidance, not on-graphic copy.
 */
export function defaultPurposeForMilestone(input: {
  name: string;
  relativeDay?: number | null;
  category?: MilestoneCategory | null;
}): string {
  const name = input.name.trim();
  const key = milestoneNameMatchKey(name);
  const relativeDay = input.relativeDay ?? null;

  if (key.includes("save the date")) {
    return "Announce the event and build early awareness";
  }
  if (
    (key.includes("two") && key.includes("week")) ||
    key.includes("14 days") ||
    relativeDay === -14
  ) {
    return "Build excitement and drive attendance two weeks before the event";
  }
  if (
    (key.includes("one") && key.includes("week")) ||
    key.includes("7 days") ||
    relativeDay === -7
  ) {
    return "Drive attendance with schedule highlights";
  }
  if (key.includes("day before") || relativeDay === -1) {
    return "Final heads-up the day before the event";
  }
  if (
    key === "day of" ||
    key.includes("event day") ||
    key.includes("day of ") ||
    relativeDay === 0
  ) {
    return "Live updates and on-site excitement";
  }
  if (
    key.includes("thank") ||
    key.includes("recap") ||
    (relativeDay !== null && relativeDay > 0)
  ) {
    return "Share photos and celebrate event success";
  }

  if (input.category === "awareness") {
    return "Announce the event and build early awareness";
  }
  if (input.category === "reminder") {
    return "Remind families and drive attendance";
  }
  if (input.category === "event-day") {
    return "Live updates and on-site excitement";
  }
  if (input.category === "recap") {
    return "Share photos and celebrate event success";
  }

  if (relativeDay !== null && relativeDay < -14) {
    return "Announce the event and build early awareness";
  }
  if (relativeDay !== null && relativeDay < 0) {
    return "Remind families and drive attendance";
  }

  return name
    ? `Communicate about ${name}`
    : "Communicate key event details with families";
}

/** Fill blank purposes in place; returns true if any milestone changed. */
export function ensureMilestonePurposes(
  milestones: Array<{
    name: string;
    purpose: string;
    category?: MilestoneCategory | null;
    suggestedDate?: string;
  }>,
  eventDate?: string | null,
): boolean {
  let changed = false;
  for (const milestone of milestones) {
    if (milestone.purpose.trim()) {
      continue;
    }
    const relativeDay =
      eventDate && milestone.suggestedDate
        ? relativeDayBetween(eventDate, milestone.suggestedDate)
        : null;
    milestone.purpose = defaultPurposeForMilestone({
      name: milestone.name,
      category: milestone.category ?? null,
      relativeDay,
    });
    changed = true;
  }
  return changed;
}

function relativeDayBetween(eventDate: string, suggestedDate: string): number | null {
  const event = Date.parse(`${eventDate}T12:00:00`);
  const suggested = Date.parse(`${suggestedDate}T12:00:00`);
  if (!Number.isFinite(event) || !Number.isFinite(suggested)) {
    return null;
  }
  return Math.round((suggested - event) / (1000 * 60 * 60 * 24));
}
