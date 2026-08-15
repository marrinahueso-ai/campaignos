import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { isMissingSchemaError } from "@/lib/creative-assets/schema-errors";
import { defaultStrategyForCalendarImport } from "@/lib/events/communication-strategy";
import { inferEventTypeFromTitle } from "@/lib/events/event-type-inference";
import type { CalendarEventCategory, CalendarReviewEvent } from "@/types/calendar-review";
import type { CommunicationStrategy } from "@/types/communication-strategy";
import type { EventType } from "@/types/playbooks";

async function resolveDbClient(
  client?: SupabaseClient,
): Promise<SupabaseClient> {
  return client ?? (await createClient());
}

export interface ImportEventPreference {
  eventNameKey: string;
  category: CalendarEventCategory | null;
  eventType: EventType | null;
  communicationStrategy: CommunicationStrategy;
}

export function normalizeEventNameKey(name: string): string {
  return name.toLowerCase().replace(/\s+/g, " ").trim();
}

export async function getImportEventPreferencesMap(
  organizationId: string,
  client?: SupabaseClient,
): Promise<Map<string, ImportEventPreference>> {
  const supabase = await resolveDbClient(client);
  const { data, error } = await supabase
    .from("import_event_preferences")
    .select("event_name_key, category, event_type, communication_strategy")
    .eq("organization_id", organizationId);

  if (error) {
    if (isMissingSchemaError(error)) {
      return new Map();
    }
    console.error("Failed to load import event preferences:", error.message);
    return new Map();
  }

  const map = new Map<string, ImportEventPreference>();
  for (const row of data ?? []) {
    map.set(row.event_name_key as string, {
      eventNameKey: row.event_name_key as string,
      category: (row.category as CalendarEventCategory | null) ?? null,
      eventType: (row.event_type as EventType | null) ?? null,
      communicationStrategy: row.communication_strategy as CommunicationStrategy,
    });
  }

  return map;
}

export function applyImportPreferenceToEvent(
  event: CalendarReviewEvent,
  preferences: Map<string, ImportEventPreference>,
): CalendarReviewEvent {
  const key = normalizeEventNameKey(event.name);
  const saved = preferences.get(key);
  if (!saved) {
    return event;
  }

  return {
    ...event,
    category: saved.category ?? event.category,
    eventType: saved.eventType ?? event.eventType,
    communicationStrategy: saved.communicationStrategy,
    planManuallySet: true,
  };
}

export function applyImportPreferencesToEvents(
  events: CalendarReviewEvent[],
  preferences: Map<string, ImportEventPreference>,
): CalendarReviewEvent[] {
  return events.map((event) => applyImportPreferenceToEvent(event, preferences));
}

export async function upsertImportEventPreference(input: {
  organizationId: string;
  eventName: string;
  category: CalendarEventCategory;
  eventType: EventType | null;
  communicationStrategy: CommunicationStrategy;
  client?: SupabaseClient;
}): Promise<boolean> {
  const supabase = await resolveDbClient(input.client);
  const now = new Date().toISOString();
  const eventNameKey = normalizeEventNameKey(input.eventName);

  const { error } = await supabase.from("import_event_preferences").upsert(
    {
      organization_id: input.organizationId,
      event_name_key: eventNameKey,
      category: input.category,
      event_type: input.eventType,
      communication_strategy: input.communicationStrategy,
      updated_at: now,
    },
    { onConflict: "organization_id,event_name_key" },
  );

  if (error) {
    if (isMissingSchemaError(error)) {
      return false;
    }
    console.error("Failed to save import event preference:", error.message);
    return false;
  }

  return true;
}

export async function upsertImportPreferencesFromReviewEvents(
  organizationId: string,
  events: CalendarReviewEvent[],
  client?: SupabaseClient,
): Promise<void> {
  if (events.length === 0) {
    return;
  }

  const supabase = await resolveDbClient(client);
  const now = new Date().toISOString();
  const byKey = new Map<
    string,
    {
      organization_id: string;
      event_name_key: string;
      category: CalendarEventCategory;
      event_type: EventType | null;
      communication_strategy: CommunicationStrategy;
      updated_at: string;
    }
  >();

  for (const event of events) {
    const eventNameKey = normalizeEventNameKey(event.name);
    if (!eventNameKey || byKey.has(eventNameKey)) {
      continue;
    }
    byKey.set(eventNameKey, {
      organization_id: organizationId,
      event_name_key: eventNameKey,
      category: event.category,
      event_type:
        event.eventType ?? inferEventTypeFromTitle(event.name, event.category),
      communication_strategy:
        event.communicationStrategy ??
        defaultStrategyForCalendarImport(event.name, event.category),
      updated_at: now,
    });
  }

  const rows = [...byKey.values()];
  if (rows.length === 0) {
    return;
  }

  // Chunk to avoid oversized payloads / gateway timeouts on large calendars.
  const chunkSize = 50;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { error } = await supabase.from("import_event_preferences").upsert(
      chunk,
      { onConflict: "organization_id,event_name_key" },
    );
    if (error) {
      if (isMissingSchemaError(error)) {
        return;
      }
      console.error(
        "Failed to save import event preferences batch:",
        error.message,
      );
      return;
    }
  }
}
