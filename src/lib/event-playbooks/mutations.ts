import { createClient } from "@/lib/supabase/server";
import { isMissingSchemaError } from "@/lib/creative-assets/schema-errors";
import type {
  EventPlaybookNoteType,
  EventPlaybookTaskStatus,
} from "@/types/event-playbooks";

async function logActivity(
  eventId: string,
  action: string,
  actorName: string | null = "You",
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("event_playbook_activity").insert({
    event_id: eventId,
    action,
    actor_name: actorName,
  });

  if (error && !isMissingSchemaError(error)) {
    console.error("Failed to log event playbook activity:", error.message);
  }
}

export async function createEventPlaybookTask(
  eventId: string,
  input: {
    title: string;
    dueDate?: string | null;
    assigneeName?: string | null;
    assigneeInitials?: string | null;
    groupId?: string | null;
  },
): Promise<string | null> {
  const supabase = await createClient();

  let sortQuery = supabase
    .from("event_playbook_tasks")
    .select("sort_order")
    .eq("event_id", eventId)
    .order("sort_order", { ascending: false })
    .limit(1);

  if (input.groupId) {
    sortQuery = sortQuery.eq("group_id", input.groupId);
  } else {
    sortQuery = sortQuery.is("group_id", null);
  }

  const { data: existing } = await sortQuery;

  const nextSort =
    existing && existing.length > 0
      ? ((existing[0]?.sort_order as number) ?? 0) + 1
      : 0;

  const { data, error } = await supabase
    .from("event_playbook_tasks")
    .insert({
      event_id: eventId,
      title: input.title,
      status: "todo",
      due_date: input.dueDate ?? null,
      assignee_name: input.assigneeName ?? null,
      assignee_initials: input.assigneeInitials ?? null,
      group_id: input.groupId ?? null,
      sort_order: nextSort,
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("Failed to create event playbook task:", error?.message);
    return null;
  }

  await logActivity(eventId, `Added task "${input.title}"`);
  return data.id as string;
}

export async function updateEventPlaybookTaskStatus(
  taskId: string,
  eventId: string,
  status: EventPlaybookTaskStatus,
  taskTitle: string,
): Promise<boolean> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("event_playbook_tasks")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", taskId)
    .eq("event_id", eventId);

  if (error) {
    console.error("Failed to update event playbook task:", error.message);
    return false;
  }

  const statusLabel =
    status === "done" ? "completed" : status === "in_progress" ? "started" : "reopened";
  await logActivity(eventId, `Marked "${taskTitle}" as ${statusLabel}`);
  return true;
}

export async function deleteEventPlaybookTask(
  taskId: string,
  eventId: string,
  taskTitle: string,
): Promise<boolean> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("event_playbook_tasks")
    .delete()
    .eq("id", taskId)
    .eq("event_id", eventId);

  if (error) {
    console.error("Failed to delete event playbook task:", error.message);
    return false;
  }

  await logActivity(eventId, `Removed task "${taskTitle}"`);
  return true;
}

export async function createEventPlaybookNote(
  eventId: string,
  input: {
    content: string;
    noteType: EventPlaybookNoteType;
    authorName?: string | null;
  },
): Promise<string | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("event_playbook_notes")
    .insert({
      event_id: eventId,
      content: input.content,
      note_type: input.noteType,
      author_name: input.authorName ?? "You",
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("Failed to create event playbook note:", error?.message);
    return null;
  }

  const label = input.noteType === "lesson" ? "lesson learned" : "note";
  await logActivity(eventId, `Added a ${label}`);
  return data.id as string;
}

export async function createEventPlaybookFilePlaceholder(
  eventId: string,
  name: string,
): Promise<string | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("event_playbook_files")
    .insert({
      event_id: eventId,
      name,
      url: null,
      storage_path: null,
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("Failed to create event playbook file:", error?.message);
    return null;
  }

  await logActivity(eventId, `Added file "${name}"`);
  return data.id as string;
}

export async function seedDefaultPlaybookTasks(eventId: string): Promise<void> {
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("event_playbook_tasks")
    .select("id")
    .eq("event_id", eventId)
    .limit(1);

  if (existing && existing.length > 0) {
    return;
  }

  const defaults = [
    "Confirm venue & date",
    "Set budget & get approval",
    "Recruit volunteers",
    "Order supplies & materials",
    "Finalize marketing plan",
    "Day-of run sheet",
  ];

  const rows = defaults.map((title, index) => ({
    event_id: eventId,
    title,
    status: "todo" as const,
    sort_order: index,
  }));

  const { error } = await supabase.from("event_playbook_tasks").insert(rows);

  if (error && !isMissingSchemaError(error)) {
    console.error("Failed to seed default playbook tasks:", error.message);
    return;
  }

  await logActivity(eventId, "Started planning checklist");
}

export async function createEventPlaybookTaskGroup(
  eventId: string,
  name: string,
): Promise<{ id: string | null; missingSchema: boolean }> {
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("event_playbook_task_groups")
    .select("sort_order")
    .eq("event_id", eventId)
    .order("sort_order", { ascending: false })
    .limit(1);

  const nextSort =
    existing && existing.length > 0
      ? ((existing[0]?.sort_order as number) ?? 0) + 1
      : 0;

  const { data, error } = await supabase
    .from("event_playbook_task_groups")
    .insert({
      event_id: eventId,
      name,
      sort_order: nextSort,
      collapsed: false,
    })
    .select("id")
    .single();

  if (error || !data) {
    const missingSchema = isMissingSchemaError(error);
    if (!missingSchema) {
      console.error("Failed to create event playbook task group:", error?.message);
    }
    return { id: null, missingSchema };
  }

  await logActivity(eventId, `Created task group "${name}"`);
  return { id: data.id as string, missingSchema: false };
}

export async function deleteEventPlaybookTaskGroup(
  groupId: string,
  eventId: string,
  groupName: string,
): Promise<{ ok: boolean; missingSchema: boolean }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("event_playbook_task_groups")
    .delete()
    .eq("id", groupId)
    .eq("event_id", eventId);

  if (error) {
    const missingSchema = isMissingSchemaError(error);
    if (!missingSchema) {
      console.error("Failed to delete event playbook task group:", error.message);
    }
    return { ok: false, missingSchema };
  }

  await logActivity(eventId, `Removed task group "${groupName}"`);
  return { ok: true, missingSchema: false };
}

export async function updateEventPlaybookTaskGroupCollapsed(
  groupId: string,
  eventId: string,
  collapsed: boolean,
): Promise<{ ok: boolean; missingSchema: boolean }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("event_playbook_task_groups")
    .update({ collapsed, updated_at: new Date().toISOString() })
    .eq("id", groupId)
    .eq("event_id", eventId);

  if (error) {
    const missingSchema = isMissingSchemaError(error);
    if (!missingSchema) {
      console.error("Failed to update task group collapsed state:", error.message);
    }
    return { ok: false, missingSchema };
  }

  return { ok: true, missingSchema: false };
}

export async function persistEventPlaybookTaskOrder(
  eventId: string,
  input: {
    groups: { id: string; sortOrder: number }[];
    tasks: { id: string; groupId: string | null; sortOrder: number }[];
  },
): Promise<{ ok: boolean; missingSchema: boolean }> {
  const supabase = await createClient();
  const now = new Date().toISOString();

  for (const group of input.groups) {
    const { error } = await supabase
      .from("event_playbook_task_groups")
      .update({ sort_order: group.sortOrder, updated_at: now })
      .eq("id", group.id)
      .eq("event_id", eventId);

    if (error) {
      const missingSchema = isMissingSchemaError(error);
      if (!missingSchema) {
        console.error("Failed to reorder task groups:", error.message);
      }
      return { ok: false, missingSchema };
    }
  }

  for (const task of input.tasks) {
    const { error } = await supabase
      .from("event_playbook_tasks")
      .update({
        group_id: task.groupId,
        sort_order: task.sortOrder,
        updated_at: now,
      })
      .eq("id", task.id)
      .eq("event_id", eventId);

    if (error) {
      const missingSchema = isMissingSchemaError(error);
      if (!missingSchema) {
        console.error("Failed to reorder tasks:", error.message);
      }
      return { ok: false, missingSchema };
    }
  }

  return { ok: true, missingSchema: false };
}
