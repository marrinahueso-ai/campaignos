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
  },
): Promise<string | null> {
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("event_playbook_tasks")
    .select("sort_order")
    .eq("event_id", eventId)
    .order("sort_order", { ascending: false })
    .limit(1);

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
