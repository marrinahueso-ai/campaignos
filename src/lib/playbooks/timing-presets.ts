/**
 * Default countdown schedules for playbook assignment and Meta publishing.
 * Product reference: product-v2/06_COMMUNICATION_PLAYBOOK.md → Implemented Timing Presets (Application v1)
 */
import type { CommunicationStrategy } from "@/types/communication-strategy";
import type { CommunicationChannel } from "@/types/event-workspace";
import type { EventType } from "@/types/playbooks";
import type { MetaPublishSurfaces } from "@/types/playbooks";

export type TimingPresetId =
  | "full_event"
  | "book_fair"
  | "pto_meeting"
  | "recognition"
  | "early_release"
  | "holiday";

export interface TimingPresetStep {
  relativeDay: number;
  title: string;
  channel: CommunicationChannel;
  metaPublishSurfaces?: MetaPublishSurfaces;
}

/** Event type selects the timing preset; communication strategy filters steps within it. */
export function resolveTimingPresetId(eventType: EventType | null): TimingPresetId {
  if (eventType === "book_fair") return "book_fair";
  if (eventType === "pto_meeting") return "pto_meeting";
  if (eventType === "teacher_appreciation") return "recognition";
  if (eventType === "early_release") return "early_release";
  if (eventType === "holiday") return "holiday";
  return "full_event";
}

const BOOK_FAIR_STEPS: TimingPresetStep[] = [
  { relativeDay: -30, title: "Save the Date", channel: "newsletter" },
  { relativeDay: -14, title: "Two-Week Reminder", channel: "facebook" },
  { relativeDay: -7, title: "One-Week Push", channel: "email" },
  { relativeDay: -3, title: "Final Reminder", channel: "instagram" },
  { relativeDay: -1, title: "Day Before", channel: "morning_announcements" },
  { relativeDay: 0, title: "Day Of", channel: "facebook" },
  { relativeDay: 1, title: "Thank You / Recap", channel: "newsletter" },
];

const FULL_EVENT_STEPS: TimingPresetStep[] = [
  { relativeDay: -30, title: "Save the Date", channel: "newsletter" },
  { relativeDay: -21, title: "Volunteer Drive", channel: "email" },
  { relativeDay: -14, title: "Two-Week Reminder", channel: "facebook" },
  { relativeDay: -7, title: "One-Week Push", channel: "instagram" },
  { relativeDay: -3, title: "Final Details", channel: "morning_announcements" },
  { relativeDay: -1, title: "Day Before", channel: "facebook" },
  { relativeDay: 0, title: "Day Of", channel: "facebook" },
  { relativeDay: 1, title: "Thank You / Recap", channel: "newsletter" },
];

const PTO_MEETING_STEPS: TimingPresetStep[] = [
  { relativeDay: -3, title: "3 Days Out", channel: "newsletter" },
  {
    relativeDay: -1,
    title: "Day Before",
    channel: "facebook",
    metaPublishSurfaces: "story_only",
  },
  { relativeDay: 0, title: "Day Of", channel: "morning_announcements" },
  { relativeDay: 1, title: "Thank You / Recap", channel: "newsletter" },
];

const RECOGNITION_STEPS: TimingPresetStep[] = [
  { relativeDay: 0, title: "Day Of", channel: "facebook" },
];

const EARLY_RELEASE_STEPS: TimingPresetStep[] = [
  { relativeDay: -1, title: "Day Before", channel: "facebook" },
  { relativeDay: 0, title: "Day Of", channel: "morning_announcements" },
];

const HOLIDAY_STEPS: TimingPresetStep[] = [
  { relativeDay: -7, title: "Week Before Reminder", channel: "newsletter" },
  { relativeDay: -1, title: "Day Before", channel: "morning_announcements" },
  { relativeDay: 1, title: "Return Reminder", channel: "newsletter" },
];

export const TIMING_PRESET_STEPS: Record<TimingPresetId, TimingPresetStep[]> = {
  full_event: FULL_EVENT_STEPS,
  book_fair: BOOK_FAIR_STEPS,
  pto_meeting: PTO_MEETING_STEPS,
  recognition: RECOGNITION_STEPS,
  early_release: EARLY_RELEASE_STEPS,
  holiday: HOLIDAY_STEPS,
};

/** Reminders only keeps the final reminder window (excludes early announcements and recap). */
function filterStepsForReminderOnly(steps: TimingPresetStep[]): TimingPresetStep[] {
  return steps.filter((step) => step.relativeDay >= -3 && step.relativeDay <= 0);
}

export function resolveTimingStepsForEvent(input: {
  eventType: EventType | null;
  communicationStrategy: CommunicationStrategy;
}): TimingPresetStep[] {
  if (
    input.communicationStrategy === "calendar_only" ||
    input.communicationStrategy === "custom"
  ) {
    return [];
  }

  const presetId = resolveTimingPresetId(input.eventType);
  const baseSteps = TIMING_PRESET_STEPS[presetId];

  if (input.communicationStrategy === "reminder_only") {
    return filterStepsForReminderOnly(baseSteps);
  }

  return baseSteps;
}

export function timingPresetLabel(presetId: TimingPresetId): string {
  switch (presetId) {
    case "full_event":
      return "General event / full campaign";
    case "book_fair":
      return "Book fair";
    case "pto_meeting":
      return "PTO meeting";
    case "recognition":
      return "Teacher / volunteer appreciation";
    case "early_release":
      return "Early release day";
    case "holiday":
      return "Holiday / no school";
  }
}
