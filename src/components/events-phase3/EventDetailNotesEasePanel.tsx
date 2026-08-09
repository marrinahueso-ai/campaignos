"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { useEventTabMutationRefresh } from "@/components/events-phase3/EventDetailTabInvalidation";
import {
  createEventPlaybookNoteAction,
  deleteEventPlaybookNoteAction,
  updateEventPlaybookNoteAction,
} from "@/lib/event-playbooks/actions";
import {
  composeNoteContent,
  formatNoteUpdatedLabel,
  noteAuthorInitials,
  noteDisplayTitle,
  splitNoteContent,
} from "@/lib/event-playbooks/note-content";
import { cn } from "@/lib/utils/cn";
import type { EventPlaybookNote } from "@/types/event-playbooks";

function noteMatchesQuery(note: EventPlaybookNote, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const { title, body } = splitNoteContent(note.content);
  const haystack = `${title}\n${body}\n${note.authorName ?? ""}`.toLowerCase();
  return haystack.includes(q);
}

export function EventDetailNotesEasePanel({
  eventId,
  notes,
  tablesAvailable,
}: {
  eventId: string;
  notes: EventPlaybookNote[];
  tablesAvailable: boolean;
}) {
  const refresh = useEventTabMutationRefresh("notes");
  const [search, setSearch] = useState("");
  const [composing, setComposing] = useState(false);
  const [composeTitle, setComposeTitle] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<EventPlaybookNote | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [deletedIds, setDeletedIds] = useState<Set<string>>(() => new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const visibleNotes = useMemo(
    () => notes.filter((note) => !deletedIds.has(note.id)),
    [deletedIds, notes],
  );

  const filteredNotes = useMemo(
    () => visibleNotes.filter((note) => noteMatchesQuery(note, search)),
    [visibleNotes, search],
  );

  useEffect(() => {
    setDeletedIds((current) => {
      if (current.size === 0) return current;
      const known = new Set(notes.map((note) => note.id));
      let changed = false;
      const next = new Set<string>();
      for (const id of current) {
        if (known.has(id)) next.add(id);
        else changed = true;
      }
      return changed ? next : current;
    });
  }, [notes]);

  useEffect(() => {
    if (selectedId && visibleNotes.some((note) => note.id === selectedId)) {
      return;
    }
    setSelectedId(visibleNotes[0]?.id ?? null);
  }, [visibleNotes, selectedId]);

  const isEmpty = visibleNotes.length === 0 && !composing;

  function startCompose() {
    setComposing(true);
    setComposeTitle("");
    setComposeBody("");
    setEditingId(null);
    setError(null);
  }

  function cancelCompose() {
    setComposing(false);
    setComposeTitle("");
    setComposeBody("");
    setError(null);
  }

  function startEdit(note: EventPlaybookNote) {
    const parts = splitNoteContent(note.content);
    setEditingId(note.id);
    setEditTitle(parts.title);
    setEditBody(parts.body);
    setComposing(false);
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditTitle("");
    setEditBody("");
    setError(null);
  }

  function saveNewNote() {
    if (!tablesAvailable) {
      setError("Notes aren’t available for this organization yet.");
      return;
    }
    const content = composeNoteContent(composeTitle, composeBody);
    if (!content.trim()) {
      setError("Add a title or some details to save this note.");
      return;
    }
    startTransition(async () => {
      setError(null);
      const result = await createEventPlaybookNoteAction(
        eventId,
        content,
        "note",
      );
      if (!result.success) {
        setError(result.error ?? "Unable to save note.");
        return;
      }
      cancelCompose();
      if (result.noteId) {
        setSelectedId(result.noteId);
      }
      await refresh();
    });
  }

  function saveEdit(noteId: string) {
    if (!tablesAvailable) {
      setError("Notes aren’t available for this organization yet.");
      return;
    }
    const content = composeNoteContent(editTitle, editBody);
    if (!content.trim()) {
      setError("Add a title or some details to save this note.");
      return;
    }
    startTransition(async () => {
      setError(null);
      const result = await updateEventPlaybookNoteAction(
        eventId,
        noteId,
        content,
      );
      if (!result.success) {
        setError(result.error ?? "Unable to update note.");
        return;
      }
      cancelEdit();
      setSelectedId(noteId);
      await refresh();
    });
  }

  function confirmDelete() {
    const note = deleteTarget;
    if (!note || !tablesAvailable || pending) return;
    startTransition(async () => {
      setError(null);
      const result = await deleteEventPlaybookNoteAction(eventId, note.id);
      if (!result.success) {
        setError(result.error ?? "Unable to delete note.");
        return;
      }
      setDeletedIds((current) => new Set(current).add(note.id));
      setDeleteTarget(null);
      if (editingId === note.id) cancelEdit();
      if (selectedId === note.id) {
        const remaining = visibleNotes.filter((n) => n.id !== note.id);
        setSelectedId(remaining[0]?.id ?? null);
      }
      await refresh();
    });
  }

  if (isEmpty) {
    return (
      <section
        className="flex min-h-[420px] flex-1 items-center justify-center px-2 py-10 sm:px-4"
        data-testid="event-notes-empty"
      >
        <div className="max-w-md text-center">
          <div className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-full border-2 border-dashed border-[#e5e5e5] bg-[#fdfcf7] text-[#737373]/40">
            <Pencil className="h-10 w-10" strokeWidth={1.5} aria-hidden />
          </div>
          <h2 className="font-display mb-3 text-2xl font-bold tracking-tight text-[#201b17]">
            No notes for this event yet
          </h2>
          <p className="mb-10 leading-relaxed text-[#737373]">
            Keep track of vendor info, decisions, or reminders right here. All
            shared notes are visible to the event team.
          </p>
          {!tablesAvailable ? (
            <p className="mb-6 text-sm text-[#737373]">
              Notes aren’t available for this organization yet.
            </p>
          ) : null}
          <button
            type="button"
            disabled={!tablesAvailable || pending}
            onClick={startCompose}
            className="mx-auto inline-flex items-center gap-3 rounded-2xl bg-[#201b17] px-10 py-4 font-bold text-white shadow-md transition hover:opacity-90 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Add the first note
          </button>
          {error ? (
            <p className="mt-4 text-sm text-red-700" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      </section>
    );
  }

  return (
    <section className="w-full max-w-3xl" data-testid="event-notes-workspace">
      <div className="mb-8 flex flex-col gap-4 sm:mb-10 sm:flex-row">
        <div className="group relative flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-[#737373] transition-colors group-focus-within:text-[#586c63]"
            aria-hidden
          />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search notes..."
            aria-label="Search notes"
            className="w-full rounded-2xl border border-[#e5e5e5] bg-white py-3 pr-4 pl-11 text-sm text-[#201b17] transition-all outline-none placeholder:text-[#737373] focus:border-[#586c63] focus:ring-2 focus:ring-[#586c63]/10"
          />
        </div>
        <button
          type="button"
          disabled={!tablesAvailable || pending}
          onClick={startCompose}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#201b17] px-8 py-3 font-bold text-white shadow-sm transition hover:opacity-90 disabled:opacity-50"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden />
          New note
        </button>
      </div>

      {composing ? (
        <div
          className="mb-10 rounded-3xl border-2 border-dashed border-[#e5e5e5] bg-[#fdfcf7] p-5 sm:p-6"
          data-testid="event-notes-compose"
        >
          <div className="flex items-start gap-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#e5e5e5] bg-white text-[#737373]">
              <Pencil className="h-3.5 w-3.5" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <input
                type="text"
                value={composeTitle}
                onChange={(event) => setComposeTitle(event.target.value)}
                placeholder="I need to remember something about this event..."
                autoFocus
                className="w-full border-none bg-transparent text-lg font-medium text-[#201b17] outline-none placeholder:text-[#737373]/60"
              />
              <textarea
                value={composeBody}
                onChange={(event) => setComposeBody(event.target.value)}
                placeholder="Add more details here if needed..."
                rows={3}
                className="mt-2 w-full resize-y border-none bg-transparent text-[#737373] outline-none placeholder:text-[#737373]/50"
              />
              <div className="mt-4 flex flex-wrap justify-end gap-3">
                <button
                  type="button"
                  onClick={cancelCompose}
                  disabled={pending}
                  className="px-4 py-2 text-sm font-bold text-[#737373] transition hover:text-[#201b17]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={
                    pending ||
                    !tablesAvailable ||
                    (!composeTitle.trim() && !composeBody.trim())
                  }
                  onClick={saveNewNote}
                  className="rounded-xl bg-[#201b17] px-6 py-2 text-sm font-bold text-white disabled:opacity-50"
                >
                  {pending ? "Saving…" : "Save Note"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {error ? (
        <p className="mb-4 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      {!tablesAvailable ? (
        <p className="mb-4 text-sm text-[#737373]">
          Notes aren’t available for this organization yet.
        </p>
      ) : null}

      <div className="space-y-6 pb-8 sm:pb-20">
        <h2 className="mb-2 px-1 text-xs font-bold tracking-widest text-[#737373]/60 uppercase sm:mb-6">
          Shared Notes
        </h2>

        {filteredNotes.length === 0 ? (
          <p className="px-1 text-sm text-[#737373]">
            {search.trim()
              ? "No notes match your search."
              : "No notes yet for this event."}
          </p>
        ) : (
          filteredNotes.map((note) => {
            const { title, body } = splitNoteContent(note.content);
            const isEditing = editingId === note.id;
            const isSelected = selectedId === note.id;
            const author = note.authorName?.trim() || "Team";
            const when = formatNoteUpdatedLabel(note.createdAt);

            if (isEditing) {
              return (
                <div
                  key={note.id}
                  className="rounded-[32px] border border-[#586c63] bg-gradient-to-b from-white to-[#fdfcf7] p-6 shadow-[0_4px_12px_rgba(88,108,99,0.08)] sm:p-8"
                  data-testid={`event-note-edit-${note.id}`}
                >
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(event) => setEditTitle(event.target.value)}
                    className="font-display mb-3 w-full border-none bg-transparent text-xl font-bold text-[#201b17] outline-none"
                    aria-label="Note title"
                  />
                  <textarea
                    value={editBody}
                    onChange={(event) => setEditBody(event.target.value)}
                    rows={4}
                    className="mb-6 w-full resize-y border-none bg-transparent leading-relaxed text-[#737373] outline-none"
                    aria-label="Note details"
                  />
                  <div className="flex flex-wrap justify-end gap-3">
                    <button
                      type="button"
                      onClick={cancelEdit}
                      disabled={pending}
                      className="px-4 py-2 text-sm font-bold text-[#737373] hover:text-[#201b17]"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={
                        pending ||
                        !tablesAvailable ||
                        (!editTitle.trim() && !editBody.trim())
                      }
                      onClick={() => saveEdit(note.id)}
                      className="rounded-xl bg-[#201b17] px-6 py-2 text-sm font-bold text-white disabled:opacity-50"
                    >
                      {pending ? "Saving…" : "Save Note"}
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <article
                key={note.id}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedId(note.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setSelectedId(note.id);
                  }
                }}
                className={cn(
                  "group relative rounded-[32px] border bg-gradient-to-b from-white to-[#fdfcf7] p-6 shadow-sm transition-all sm:p-8",
                  isSelected
                    ? "border-[#586c63] shadow-[0_4px_12px_rgba(88,108,99,0.08)]"
                    : "border-[#e5e5e5]",
                )}
                data-testid={`event-note-card-${note.id}`}
              >
                <div className="absolute top-5 right-5 flex gap-1 sm:top-8 sm:right-8 sm:gap-2">
                  <button
                    type="button"
                    title="Edit"
                    aria-label={`Edit ${noteDisplayTitle(note.content)}`}
                    disabled={pending || !tablesAvailable}
                    onClick={(event) => {
                      event.stopPropagation();
                      startEdit(note);
                    }}
                    className="rounded-lg p-2 text-[#737373] transition-colors hover:text-[#201b17] focus-visible:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#586c63] disabled:opacity-50 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
                  >
                    <Pencil className="h-3.5 w-3.5" aria-hidden />
                  </button>
                  <button
                    type="button"
                    title="Delete"
                    aria-label={`Delete ${noteDisplayTitle(note.content)}`}
                    disabled={pending || !tablesAvailable}
                    onClick={(event) => {
                      event.stopPropagation();
                      setDeleteTarget(note);
                    }}
                    className="rounded-lg p-2 text-[#737373] transition-colors hover:text-red-600 focus-visible:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#586c63] disabled:opacity-50 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </div>

                <div className="flex gap-4 sm:gap-6">
                  <div className="mt-1 h-12 w-1.5 shrink-0 rounded-full bg-[#586c63] opacity-20" />
                  <div className="min-w-0 flex-1 pr-14 sm:pr-16">
                    <h3 className="font-display mb-3 text-xl leading-tight font-bold text-[#201b17]">
                      {title || "Untitled note"}
                    </h3>
                    {body ? (
                      <p className="mb-6 leading-relaxed whitespace-pre-wrap text-[#737373]">
                        {body}
                      </p>
                    ) : (
                      <div className="mb-6" />
                    )}
                    <div className="flex items-center gap-3 pt-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#ece9e1] text-[10px] font-bold text-[#586c63]">
                        {noteAuthorInitials(author)}
                      </div>
                      <span className="text-xs font-medium text-[#737373]">
                        {author}
                        {when ? ` updated ${when}` : ""}
                      </span>
                    </div>
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>

      {deleteTarget ? (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-note-title"
          data-testid="event-notes-delete-confirm"
        >
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-[rgba(32,27,23,0.4)] backdrop-blur-[4px]"
            onClick={() => setDeleteTarget(null)}
          />
          <div className="relative z-10 w-full max-w-md rounded-[2rem] border border-[#e5e5e5] bg-white p-8 shadow-2xl sm:rounded-[2.5rem] sm:p-10">
            <button
              type="button"
              aria-label="Close dialog"
              onClick={() => setDeleteTarget(null)}
              className="absolute top-5 right-5 rounded-full p-2 text-[#737373] hover:text-[#201b17]"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
            <h3
              id="delete-note-title"
              className="font-display mb-2 pr-8 text-2xl font-bold tracking-tight text-[#201b17]"
            >
              Delete this note?
            </h3>
            <p className="mb-8 text-sm leading-relaxed font-medium text-[#737373]">
              “{noteDisplayTitle(deleteTarget.content)}” will be removed from
              this event. This can’t be undone.
            </p>
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={pending}
                className="rounded-2xl border border-[#e5e5e5] bg-white px-5 py-3 text-sm font-bold text-[#201b17] hover:bg-[#f5f2eb]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={pending || !tablesAvailable}
                className="rounded-2xl bg-[#201b17] px-5 py-3 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50"
              >
                {pending ? "Deleting…" : "Delete note"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
