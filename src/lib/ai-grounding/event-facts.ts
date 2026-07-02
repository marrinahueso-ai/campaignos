import { COMMUNICATION_STRATEGY_LABELS } from "@/lib/events/communication-strategy";
import { sanitizeVolunteerNeeds } from "@/lib/events/volunteer-needs";
import { EVENT_TYPE_LABELS } from "@/lib/playbooks/constants";
import { formatEventDate, formatEventTime } from "@/lib/utils/dates";
import type { EventGroundingFacts } from "@/lib/ai-grounding/types";
import type { Event } from "@/types";

export function buildEventGroundingFacts(event: Event): EventGroundingFacts {
  return {
    title: event.title,
    date: formatEventDate(event.date),
    time: event.time ? formatEventTime(event.time) : null,
    location: trimOrNull(event.location),
    audience: trimOrNull(event.audience),
    theme: trimOrNull(event.theme),
    description: event.description.trim() || "",
    communicationStrategy: event.communicationStrategy,
    communicationStrategyLabel:
      COMMUNICATION_STRATEGY_LABELS[event.communicationStrategy] ??
      event.communicationStrategy,
    eventType: event.eventType,
    eventTypeLabel: event.eventType
      ? (EVENT_TYPE_LABELS[event.eventType] ?? null)
      : null,
    category: trimOrNull(event.category),
    budget: trimOrNull(event.budget),
    volunteerNeeds: sanitizeVolunteerNeeds(event.volunteerNeeds),
    eventOwner: trimOrNull(event.eventOwner),
  };
}

function trimOrNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}
