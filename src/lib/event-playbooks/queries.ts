import "server-only";

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { isMissingSchemaError } from "@/lib/creative-assets/schema-errors";
import { mapEventRows } from "@/lib/events/mappers";
import { EVENT_SUMMARY_SELECT } from "@/lib/events/selects";
import {
  mapEventPlaybookActivityRow,
  mapEventPlaybookFileRow,
  mapEventPlaybookNoteRow,
  mapEventPlaybookTaskGroupRow,
  mapEventPlaybookTaskRow,
} from "@/lib/event-playbooks/mappers";
import { computePlanningProgress } from "@/lib/event-playbooks/progress";
import {
  PLAYBOOK_ACTIVITY_SELECT,
  PLAYBOOK_FILE_SELECT,
  PLAYBOOK_NOTE_SELECT,
  PLAYBOOK_TASK_GROUP_SELECT,
  PLAYBOOK_TASK_SELECT,
} from "@/lib/event-playbooks/selects";
import { getActiveSchoolYear } from "@/lib/school-years/queries";
import type { Event, EventRow } from "@/types";
import type {
  EventPlaybookActivityRow,
  EventPlaybookFileRow,
  EventPlaybookHubData,
  EventPlaybookNoteRow,
  EventPlaybookTaskGroupRow,
  EventPlaybookTaskRow,
} from "@/types/event-playbooks";

export const areEventPlaybookTablesAvailable = cache(async (): Promise<boolean> => {
  const supabase = await createClient();
  const { error } = await supabase
    .from("event_playbook_tasks")
    .select("id")
    .limit(1);

  return !error || !isMissingSchemaError(error);
});

export { EVENT_PLAYBOOK_TASK_GROUPS_MIGRATION } from "@/lib/event-playbooks/constants";

export const areEventPlaybookTaskGroupsAvailable = cache(async (): Promise<boolean> => {
  const supabase = await createClient();
  const { error } = await supabase
    .from("event_playbook_task_groups")
    .select("id")
    .limit(1);

  return !error || !isMissingSchemaError(error);
});

/** Events eligible for Event Playbooks — non calendar-only, active school year when set. */
export async function getEventPlaybookEvents(
  organizationId: string | null,
): Promise<Event[]> {
  const supabase = await createClient();

  let query = supabase
    .from("events")
    .select(EVENT_SUMMARY_SELECT)
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

  return mapEventRows((data ?? []) as unknown as EventRow[]);
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
    .select(PLAYBOOK_TASK_SELECT)
    .in("event_id", eventIds)
    .order("sort_order", { ascending: true });

  if (error) {
    if (isMissingSchemaError(error)) {
      return [];
    }
    console.error("Failed to fetch event playbook tasks:", error.message);
    return [];
  }

  return (data ?? []) as unknown as EventPlaybookTaskRow[];
}

/** Exact-event notes only — Event Detail Notes tab. */
export async function getEventPlaybookNotesForEvent(
  eventId: string,
): Promise<import("@/types/event-playbooks").EventPlaybookNote[]> {
  if (!(await areEventPlaybookTablesAvailable())) {
    return [];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("event_playbook_notes")
    .select(PLAYBOOK_NOTE_SELECT)
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });

  if (error) {
    if (!isMissingSchemaError(error)) {
      console.error("Failed to fetch event notes:", error.message);
    }
    return [];
  }

  return ((data ?? []) as unknown as EventPlaybookNoteRow[]).map(mapEventPlaybookNoteRow);
}

/** Exact-event playbook activity only — Event Detail Activity tab. */
export async function getEventPlaybookActivityForEvent(
  eventId: string,
  limit = 40,
): Promise<import("@/types/event-playbooks").EventPlaybookActivity[]> {
  if (!(await areEventPlaybookTablesAvailable())) {
    return [];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("event_playbook_activity")
    .select(PLAYBOOK_ACTIVITY_SELECT)
    .eq("event_id", eventId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    if (!isMissingSchemaError(error)) {
      console.error("Failed to fetch event activity:", error.message);
    }
    return [];
  }

  return ((data ?? []) as unknown as EventPlaybookActivityRow[]).map(
    mapEventPlaybookActivityRow,
  );
}

export async function getEventPlaybookHubData(
  eventId: string,
): Promise<EventPlaybookHubData> {
  const empty: EventPlaybookHubData = {
    tasks: [],
    taskGroups: [],
    notes: [],
    files: [],
    activity: [],
    planningProgressPercent: 0,
  };

  if (!(await areEventPlaybookTablesAvailable())) {
    return empty;
  }

  const supabase = await createClient();

  const [tasksResult, groupsResult, notesResult, filesResult, activityResult] = await Promise.all([
    supabase
      .from("event_playbook_tasks")
      .select(PLAYBOOK_TASK_SELECT)
      .eq("event_id", eventId)
      .order("sort_order", { ascending: true }),
    supabase
      .from("event_playbook_task_groups")
      .select(PLAYBOOK_TASK_GROUP_SELECT)
      .eq("event_id", eventId)
      .order("sort_order", { ascending: true }),
    supabase
      .from("event_playbook_notes")
      .select(PLAYBOOK_NOTE_SELECT)
      .eq("event_id", eventId)
      .order("created_at", { ascending: false }),
    supabase
      .from("event_playbook_files")
      .select(PLAYBOOK_FILE_SELECT)
      .eq("event_id", eventId)
      .order("uploaded_at", { ascending: false }),
    supabase
      .from("event_playbook_activity")
      .select(PLAYBOOK_ACTIVITY_SELECT)
      .eq("event_id", eventId)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const tasks = ((tasksResult.data ?? []) as unknown as EventPlaybookTaskRow[]).map(
    mapEventPlaybookTaskRow,
  );
  const taskGroups =
    groupsResult.error && isMissingSchemaError(groupsResult.error)
      ? []
      : ((groupsResult.data ?? []) as unknown as EventPlaybookTaskGroupRow[]).map(
          mapEventPlaybookTaskGroupRow,
        );
  const notes = ((notesResult.data ?? []) as unknown as EventPlaybookNoteRow[]).map(
    mapEventPlaybookNoteRow,
  );
  const files = ((filesResult.data ?? []) as unknown as EventPlaybookFileRow[]).map(
    mapEventPlaybookFileRow,
  );
  const activity = ((activityResult.data ?? []) as unknown as EventPlaybookActivityRow[]).map(
    mapEventPlaybookActivityRow,
  );

  return {
    tasks,
    taskGroups,
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
    .select(EVENT_SUMMARY_SELECT)
    .eq("event_type", eventType)
    .neq("id", excludeEventId)
    .neq("status", "archived")
    .order("date", { ascending: false })
    .limit(limit);

  if (error) {
    return [];
  }

  return mapEventRows((data ?? []) as unknown as EventRow[]);
}
