import { getLatestOrganization } from "@/lib/organizations/queries";
import { getEventById } from "@/lib/events/queries";
import { formatEventDate, formatEventTime } from "@/lib/utils/dates";

function line(label: string, value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return `${label}: ${trimmed}`;
}

/** Slim verified-facts block for social caption generation — no strategy layers. */
export async function buildMetaCaptionFactsBlock(input: {
  eventId: string;
  relativeDay: number;
  milestoneTitle: string;
}): Promise<string | null> {
  const [event, organization] = await Promise.all([
    getEventById(input.eventId),
    getLatestOrganization(),
  ]);

  if (!event) {
    return null;
  }

  const dateLabel = event.date ? formatEventDate(event.date) : null;
  const timeLabel = event.time ? formatEventTime(event.time) : null;

  const lines = [
    line("Event", event.title),
    line("Date", dateLabel),
    line("Time", timeLabel),
    line("Location", event.location),
    line("Audience", event.audience),
    line("Theme", event.theme),
    event.description?.trim() ? `About: ${event.description.trim()}` : null,
    line("School", organization?.name ?? null),
    `Milestone: ${input.milestoneTitle} (${input.relativeDay} days from event)`,
  ].filter(Boolean);

  return lines.join("\n");
}
