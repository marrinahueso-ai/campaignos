/**
 * Explicit column lists for Event Playbook hub / tab loaders.
 * Matches mapper fields; avoids select("*") fan-out.
 */

export const PLAYBOOK_TASK_SELECT = [
  "id",
  "event_id",
  "title",
  "status",
  "due_date",
  "assignee_name",
  "assignee_initials",
  "assignee_user_id",
  "group_id",
  "sort_order",
  "created_at",
  "updated_at",
].join(", ");

export const PLAYBOOK_TASK_GROUP_SELECT = [
  "id",
  "event_id",
  "name",
  "sort_order",
  "collapsed",
  "created_at",
  "updated_at",
].join(", ");

export const PLAYBOOK_NOTE_SELECT = [
  "id",
  "event_id",
  "content",
  "note_type",
  "author_name",
  "created_at",
].join(", ");

export const PLAYBOOK_FILE_SELECT = [
  "id",
  "event_id",
  "name",
  "url",
  "storage_path",
  "uploaded_at",
].join(", ");

export const PLAYBOOK_ACTIVITY_SELECT = [
  "id",
  "event_id",
  "action",
  "actor_name",
  "created_at",
].join(", ");
