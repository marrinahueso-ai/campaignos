import "server-only";

import { GOOGLE_CALENDAR_API_BASE } from "@/lib/google-calendar/config";
import type { GoogleCalendarApiEvent } from "@/lib/google-calendar/types";
import { recordApiCall } from "@/lib/ops/record-api-call";

export async function listGoogleCalendarEvents(input: {
  accessToken: string;
  calendarId?: string;
  timeMin: string;
  timeMax: string;
  organizationId?: string | null;
}): Promise<{ events: GoogleCalendarApiEvent[]; error: string | null }> {
  const calendarId = encodeURIComponent(input.calendarId?.trim() || "primary");
  const events: GoogleCalendarApiEvent[] = [];
  let pageToken: string | undefined;
  const startedAt = Date.now();
  let pages = 0;

  try {
    do {
      const url = new URL(
        `${GOOGLE_CALENDAR_API_BASE}/calendars/${calendarId}/events`,
      );
      url.searchParams.set("singleEvents", "true");
      url.searchParams.set("orderBy", "startTime");
      url.searchParams.set("timeMin", input.timeMin);
      url.searchParams.set("timeMax", input.timeMax);
      url.searchParams.set("maxResults", "250");
      if (pageToken) {
        url.searchParams.set("pageToken", pageToken);
      }

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${input.accessToken}` },
      });
      pages += 1;

      if (!response.ok) {
        const text = await response.text();
        console.error("Google Calendar list events failed:", response.status, text);
        await recordApiCall({
          provider: "google",
          operation: "calendar.events.list",
          startedAt,
          success: false,
          organizationId: input.organizationId,
          httpStatus: response.status,
          errorMessage: text.slice(0, 200),
          metadata: { pages },
        });
        return {
          events: [],
          error:
            response.status === 401 || response.status === 403
              ? "Google access expired. Reconnect Google Calendar."
              : "Could not load events from Google Calendar.",
        };
      }

      const data = (await response.json()) as {
        items?: GoogleCalendarApiEvent[];
        nextPageToken?: string;
      };
      events.push(...(data.items ?? []));
      pageToken = data.nextPageToken;
    } while (pageToken);

    await recordApiCall({
      provider: "google",
      operation: "calendar.events.list",
      startedAt,
      success: true,
      organizationId: input.organizationId,
      metadata: { pages, eventCount: events.length },
    });

    return { events, error: null };
  } catch (error) {
    console.error("Google Calendar list events error:", error);
    await recordApiCall({
      provider: "google",
      operation: "calendar.events.list",
      startedAt,
      success: false,
      organizationId: input.organizationId,
      errorMessage:
        error instanceof Error ? error.message : "Could not reach Google Calendar.",
      metadata: { pages },
    });
    return { events: [], error: "Could not reach Google Calendar." };
  }
}

/** Convert Google events into ICS so we reuse the existing import pipeline. */
export function googleEventsToIcsText(
  events: GoogleCalendarApiEvent[],
  calendarName = "Google Calendar",
): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Hey Ralli//Google Calendar Sync//EN",
    `X-WR-CALNAME:${escapeIcsText(calendarName)}`,
  ];

  for (const event of events) {
    if (event.status === "cancelled") {
      continue;
    }
    const summary = event.summary?.trim();
    const date = eventDateYmd(event);
    if (!summary || !date) {
      continue;
    }
    const uid = event.id?.trim() || `${date}-${summary}`.slice(0, 80);
    lines.push(
      "BEGIN:VEVENT",
      `UID:${escapeIcsText(uid)}@heyralli.google`,
      `DTSTART;VALUE=DATE:${date.replace(/-/g, "")}`,
      `SUMMARY:${escapeIcsText(summary)}`,
      "END:VEVENT",
    );
  }

  lines.push("END:VCALENDAR");
  return `${lines.join("\r\n")}\r\n`;
}

function eventDateYmd(event: GoogleCalendarApiEvent): string | null {
  const date = event.start?.date?.trim();
  if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date;
  }
  const dateTime = event.start?.dateTime?.trim();
  if (!dateTime) {
    return null;
  }
  const parsed = new Date(dateTime);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed.toISOString().slice(0, 10);
}

function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}
