import "server-only";

import { createClient } from "@/lib/supabase/server";
import { isMissingSchemaError } from "@/lib/creative-assets/schema-errors";
import { mapEventRows } from "@/lib/events/mappers";
import {
  mapEventPlaybookActivityRow,
  mapEventPlaybookFileRow,
  mapEventPlaybookNoteRow,
  mapEventPlaybookTaskRow,
} from "@/lib/event-playbooks/mappers";
import { computePlanningProgress } from "@/lib/event-playbooks/progress";
import { getActiveSchoolYear } from "@/lib/school-years/queries";
import type { Event, EventRow } from "@/types";
import type {
  EventPlaybookActivityRow,
  EventPlaybookFileRow,
  EventPlaybookHubData,
  EventPlaybookNoteRow,
  EventPlaybookTaskRow,
} from "@/types/event-playbooks";

export async function areEventPlaybookTablesAvailable(): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("event_playbook_tasks")
    .select("id")
    .limit(1);

  return !error || !isMissingSchemaError(error);
}

/** Events eligible for Event Playbooks — non calendar-only, active school year when set. */
export async function getEventPlaybookEvents(
  organizationId: string | null,
): Promise<Event[]> {
  const supabase = await createClient();

  let query = supabase
    .from("events")
    .select("*")
    .neq("status", "archived")
    .neq("communication_strategy", "calendar_only")
    .order("date", { ascending: true });

  if (organizationId) {
    const activeSchoolYear = await getActiveSchoolYear(organizationId);
    if (activeSchoolYear?.id) {
      query = query.eq("school_year_id", activeSchoolYear.id);
    }
  }

  const { data, error } = await query;

  if (error) {
    console.error("Failed to fetch event playbook events:", error.message);
    return [];
  }

  return mapEventRows((data ?? []) as EventRow[]);
}

export async function getEventPlaybookTasksForEvents(
  eventIds: string[],
): Promise<EventPlaybookTaskRow[]> {
  if (eventIds.length === 0 || !(await areEventPlaybookTablesAvailable())) {
    return [];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("event_playbook_tasks")
    .select("*")
    .in("event_id", eventIds)
    .order("sort_order", { ascending: true });

  if (error) {
    if (isMissingSchemaError(error)) {
      return [];
    }
    console.error("Failed to fetch event playbook tasks:", error.message);
    return [];
  }

  return (data ?? []) as EventPlaybookTaskRow[];
}

export async function getEventPlaybookHubData(
  eventId: string,
): Promise<EventPlaybookHubData> {
  const empty: EventPlaybookHubData = {
    tasks: [],
    notes: [],
    files: [],
    activity: [],
    planningProgressPercent: 0,
  };

  if (!(await areEventPlaybookTablesAvailable())) {
    return empty;
  }

  const supabase = await createClient();

  const [tasksResult, notesResult, filesResult, activityResult] = await Promise.all([
    supabase
      .from("event_playbook_tasks")
      .select("*")
      .eq("event_id", eventId)
      .order("sort_order", { ascending: true }),
    supabase
      .from("event_playbook_notes")
      .select("*")
      .eq("event_id", eventId)
      .order("created_at", { ascending: false }),
    supabase
      .from("event_playbook_files")
      .select("*")
      .eq("event_id", eventId)
      .order("uploaded_at", { ascending: false }),
    supabase
      .from("event_playbook_activity")
      .select("*")
      .eq("event_id", eventId)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const tasks = ((tasksResult.data ?? []) as EventPlaybookTaskRow[]).map(
    mapEventPlaybookTaskRow,
  );
  const notes = ((notesResult.data ?? []) as EventPlaybookNoteRow[]).map(
    mapEventPlaybookNoteRow,
  );
  const files = ((filesResult.data ?? []) as EventPlaybookFileRow[]).map(
    mapEventPlaybookFileRow,
  );
  const activity = ((activityResult.data ?? []) as EventPlaybookActivityRow[]).map(
    mapEventPlaybookActivityRow,
  );

  return {
    tasks,
    notes,
    files,
    activity,
    planningProgressPercent: computePlanningProgress(tasks),
  };
}

export async function getPastEventLessonsForType(
  eventType: string | null,
  excludeEventId: string,
  limit = 3,
): Promise<{ eventTitle: string; eventDate: string; lessons: string[] }[]> {
  const pastEvents = await getPastEventsForType(eventType, excludeEventId, limit);
  if (pastEvents.length === 0 || !(await areEventPlaybookTablesAvailable())) {
    return [];
  }

  const eventIds = pastEvents.map((e) => e.id);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("event_playbook_notes")
    .select("event_id, content")
    .in("event_id", eventIds)
    .eq("note_type", "lesson");

  if (error) {
    if (!isMissingSchemaError(error)) {
      console.error("Failed to fetch past event lessons:", error.message);
    }
    return [];
  }

  const lessonsByEvent = new Map<string, string[]>();
  for (const row of data ?? []) {
    const eventId = row.event_id as string;
    const content = (row.content as string)?.trim();
    if (!content) {
      continue;
    }
    const existing = lessonsByEvent.get(eventId) ?? [];
    existing.push(content);
    lessonsByEvent.set(eventId, existing);
  }

  return pastEvents
    .map((event) => ({
      eventTitle: event.title,
      eventDate: event.date,
      lessons: lessonsByEvent.get(event.id) ?? [],
    }))
    .filter((entry) => entry.lessons.length > 0);
}

export async function getPastEventsForType(
  eventType: string | null,
  excludeEventId: string,
  limit = 3,
): Promise<Event[]> {
  if (!eventType) {
    return [];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("event_type", eventType)
    .neq("id", excludeEventId)
    .neq("status", "archived")
    .order("date", { ascending: false })
    .limit(limit);

  if (error) {
    return [];
  }

  return mapEventRows((data ?? []) as EventRow[]);
}
