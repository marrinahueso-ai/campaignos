import type {
  EventPlaybookActivity,
  EventPlaybookActivityRow,
  EventPlaybookFile,
  EventPlaybookFileRow,
  EventPlaybookNote,
  EventPlaybookNoteRow,
  EventPlaybookTask,
  EventPlaybookTaskRow,
} from "@/types/event-playbooks";

export function mapEventPlaybookTaskRow(row: EventPlaybookTaskRow): EventPlaybookTask {
  return {
    id: row.id,
    eventId: row.event_id,
    title: row.title,
    status: row.status,
    dueDate: row.due_date,
    assigneeName: row.assignee_name,
    assigneeInitials: row.assignee_initials,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapEventPlaybookNoteRow(row: EventPlaybookNoteRow): EventPlaybookNote {
  return {
    id: row.id,
    eventId: row.event_id,
    content: row.content,
    noteType: row.note_type,
    authorName: row.author_name,
    createdAt: row.created_at,
  };
}

export function mapEventPlaybookFileRow(row: EventPlaybookFileRow): EventPlaybookFile {
  return {
    id: row.id,
    eventId: row.event_id,
    name: row.name,
    url: row.url,
    storagePath: row.storage_path,
    uploadedAt: row.uploaded_at,
  };
}

export function mapEventPlaybookActivityRow(
  row: EventPlaybookActivityRow,
): EventPlaybookActivity {
  return {
    id: row.id,
    eventId: row.event_id,
    action: row.action,
    actorName: row.actor_name,
    createdAt: row.created_at,
  };
}
