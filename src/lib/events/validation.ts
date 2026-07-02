import type { CreateEventInput, EventStatus } from "@/types";
import {
  parseCommunicationStrategy,
} from "@/lib/events/communication-strategy";
import { parseEventDateInput, parseEventTimeInput } from "@/lib/events/time-input";
import { DEFAULT_EVENT_TYPE, EVENT_TYPES } from "@/lib/playbooks/constants";
import { COMMUNICATION_STRATEGIES } from "@/types/communication-strategy";
import type { EventType } from "@/types/playbooks";

const VALID_STATUSES: EventStatus[] = [
  "draft",
  "scheduled",
  "published",
  "archived",
];

const VALID_EVENT_TYPES = EVENT_TYPES.map((type) => type.value);

export function parseCreateEventInput(
  formData: FormData,
): { data: CreateEventInput } | { error: string } {
  const title = formData.get("title")?.toString().trim() ?? "";
  const description = formData.get("description")?.toString().trim() ?? "";
  const date = formData.get("date")?.toString().trim() ?? "";
  const time = formData.get("time")?.toString().trim() || null;
  const location = formData.get("location")?.toString().trim() || null;
  const audience = formData.get("audience")?.toString().trim() || null;
  const theme = formData.get("theme")?.toString().trim() || null;
  const status = formData.get("status")?.toString().trim() as EventStatus;
  const eventType =
    (formData.get("eventType")?.toString().trim() as EventType) ||
    DEFAULT_EVENT_TYPE;
  const communicationStrategy = parseCommunicationStrategy(
    formData.get("communicationStrategy")?.toString().trim(),
  );

  if (!title) {
    return { error: "Event title is required." };
  }

  if (!description) {
    return { error: "Event description is required." };
  }

  const parsedDate = parseEventDateInput(date);
  if ("error" in parsedDate) {
    return { error: parsedDate.error };
  }

  const parsedTime = parseEventTimeInput(time);
  if ("error" in parsedTime) {
    return { error: parsedTime.error };
  }

  if (!VALID_STATUSES.includes(status)) {
    return { error: "Please select a valid status." };
  }

  if (!VALID_EVENT_TYPES.includes(eventType)) {
    return { error: "Please select a valid event type." };
  }

  if (!COMMUNICATION_STRATEGIES.includes(communicationStrategy)) {
    return { error: "Please select a valid communication strategy." };
  }

  return {
    data: {
      title,
      description,
      date: parsedDate.date,
      time: parsedTime.time,
      location,
      audience,
      theme,
      status,
      eventType,
      communicationStrategy,
    },
  };
}
