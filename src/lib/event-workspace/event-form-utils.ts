import {
  getDisplayBudget,
  getDisplayCategory,
  getDisplayOwner,
  getDisplayVolunteerNeeds,
} from "@/lib/event-workspace/mock-data";
import {
  formatEventTimeForInput,
  parseEventDateInput,
  parseEventTimeInput,
} from "@/lib/events/time-input";
import type { EventDetailsInput } from "@/types/event-workspace";
import type { Event } from "@/types";

export function toTimeInputValue(time: string | null | undefined): string {
  return formatEventTimeForInput(time);
}

export function buildEventDetailsFormState(event: Event): EventDetailsInput {
  return {
    title: event.title,
    date: event.date,
    description: event.description,
    time: toTimeInputValue(event.time),
    location: event.location ?? "",
    audience: event.audience ?? "",
    theme: event.theme ?? "",
    category: getDisplayCategory(event),
    eventOwner: getDisplayOwner(event),
    budget: getDisplayBudget(event),
    volunteerNeeds: getDisplayVolunteerNeeds(event),
  };
}

export function normalizeEventDetailsInput(
  form: EventDetailsInput,
): EventDetailsInput | { error: string } {
  const parsedDate = parseEventDateInput(form.date);
  if ("error" in parsedDate) {
    return { error: parsedDate.error };
  }

  const parsedTime = parseEventTimeInput(form.time);
  if ("error" in parsedTime) {
    return { error: parsedTime.error };
  }

  return {
    title: form.title.trim(),
    date: parsedDate.date,
    description: form.description.trim(),
    time: parsedTime.time,
    location: form.location?.trim() || null,
    audience: form.audience?.trim() || null,
    theme: form.theme?.trim() || null,
    category: form.category?.trim() || null,
    eventOwner: form.eventOwner?.trim() || null,
    budget: form.budget?.trim() || null,
    volunteerNeeds: form.volunteerNeeds?.trim() || null,
  };
}
