import type { CampaignStage, CampaignStageId } from "@/lib/ai-strategy/types";

const STAGE_DEFINITIONS: Record<
  CampaignStageId,
  Omit<CampaignStage, "relativeDay">
> = {
  announcement: {
    id: "announcement",
    label: "Announcement",
    description: "Introduce the event, build awareness, and share essential details.",
    urgency: "low",
  },
  reminder: {
    id: "reminder",
    label: "Reminder",
    description: "Reinforce key details and nudge families who have not yet engaged.",
    urgency: "medium",
  },
  day_before: {
    id: "day_before",
    label: "Day Before",
    description: "Final practical details and verified timing.",
    urgency: "high",
  },
  today: {
    id: "today",
    label: "Today",
    description: "Day-of energy, directions, and real-time participation prompts.",
    urgency: "peak",
  },
  thank_you: {
    id: "thank_you",
    label: "Thank You",
    description: "Gratitude, outcomes, and gentle follow-up for next time.",
    urgency: "low",
  },
};

function stageFromRelativeDay(relativeDay: number): CampaignStageId {
  if (relativeDay >= 1) return "thank_you";
  if (relativeDay === 0) return "today";
  if (relativeDay === -1) return "day_before";
  if (relativeDay >= -13) return "reminder";
  return "announcement";
}

function stageFromTitle(title: string): CampaignStageId | null {
  const normalized = title.toLowerCase();

  if (normalized.includes("thank")) return "thank_you";
  if (normalized.includes("day of") || normalized.includes("day-of")) return "today";
  if (normalized.includes("day before") || normalized.includes("morning of")) {
    return "day_before";
  }
  if (
    normalized.includes("reminder") ||
    normalized.includes("final") ||
    normalized.includes("last")
  ) {
    return "reminder";
  }
  if (
    normalized.includes("launch") ||
    normalized.includes("save the date") ||
    normalized.includes("announce")
  ) {
    return "announcement";
  }

  return null;
}

function stageFromCalendarDistance(daysUntilEvent: number): CampaignStageId {
  if (daysUntilEvent >= 1) return "thank_you";
  if (daysUntilEvent === 0) return "today";
  if (daysUntilEvent === 1) return "day_before";
  if (daysUntilEvent <= 14) return "reminder";
  return "announcement";
}

export function resolveCampaignStage(input: {
  relativeDay?: number | null;
  stepTitle?: string | null;
  eventDate?: string | null;
  referenceDate?: Date;
}): CampaignStage {
  const titleStage = input.stepTitle ? stageFromTitle(input.stepTitle) : null;

  if (input.relativeDay != null) {
    const id = titleStage ?? stageFromRelativeDay(input.relativeDay);
    return {
      ...STAGE_DEFINITIONS[id],
      relativeDay: input.relativeDay,
    };
  }

  if (input.eventDate) {
    const today = input.referenceDate ?? new Date();
    const eventDay = new Date(`${input.eventDate}T12:00:00`);
    const diffMs = eventDay.getTime() - today.getTime();
    const daysUntilEvent = Math.round(diffMs / (1000 * 60 * 60 * 24));
    const id = titleStage ?? stageFromCalendarDistance(daysUntilEvent);
    return {
      ...STAGE_DEFINITIONS[id],
      relativeDay: -daysUntilEvent,
    };
  }

  const fallback = titleStage ?? "announcement";
  return {
    ...STAGE_DEFINITIONS[fallback],
    relativeDay: null,
  };
}
