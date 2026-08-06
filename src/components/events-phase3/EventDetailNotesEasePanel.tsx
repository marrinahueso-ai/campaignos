"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useEventTabMutationRefresh } from "@/components/events-phase3/EventDetailTabInvalidation";
import {
  createEventPlaybookNoteAction,
  deleteEventPlaybookNoteAction,
} from "@/lib/event-playbooks/actions";
import { cn } from "@/lib/utils/cn";
import type { EventPlaybookNote } from "@/types/event-playbooks";

function formatWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

function formatEdited(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function noteTitle(content: string): string {
  const first = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean);
  if (!first) return "Untitled note";
  return first.length > 72 ? `${first.slice(0, 72)}…` : first;
}

function notePreviewLines(content: string): string[] {
  return content.split(/\r?\n/).filter((line) => line.trim().length > 0);
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
  const [selectedId, setSelectedId] = useState<string | null>(
    () => notes[0]?.id ?? null,
  );
  const [composing, setComposing] = useState(() => notes.length === 0);
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [deletedIds, setDeletedIds] = useState<Set<string>>(() => new Set());

  const visibleNotes = useMemo(
    () => notes.filter((note) => !deletedIds.has(note.id)),
    [deletedIds, notes],
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
    if (composing) return;
    if (selectedId && visibleNotes.some((note) => note.id === selectedId)) {
      return;
    }
    setSelectedId(visibleNotes[0]?.id ?? null);
    if (visibleNotes.length === 0) setComposing(true);
  }, [visibleNotes, selectedId, composing]);

  const selected = useMemo(
    () => visibleNotes.find((note) => note.id === selectedId) ?? null,
    [visibleNotes, selectedId],
  );

  const scratchpads = useMemo(() => {
    if (composing || !selectedId) return visibleNotes;
    return visibleNotes.filter((note) => note.id !== selectedId);
  }, [visibleNotes, selectedId, composing]);

  const startNewNote = () => {
    setComposing(true);
    setSelectedId(null);
    setContent("");
    setError(null);
  };

  const openScratchpad = (noteId: string) => {
    setComposing(false);
    setSelectedId(noteId);
    setContent("");
    setError(null);
  };

  const save = (noteType: "note" | "lesson") => {
    if (!tablesAvailable) {
      setError("Notes aren’t available for this organization yet.");
      return;
    }
    startTransition(async () => {
      setError(null);
      const result = await createEventPlaybookNoteAction(
        eventId,
        content,
        noteType,
      );
      if (!result.success) {
        setError(result.error ?? "Unable to save note.");
        return;
      }
      setContent("");
      setComposing(false);
      await refresh();
    });
  };

  const handleDelete = (note: EventPlaybookNote) => {
    if (!tablesAvailable || pending) return;
    const label = noteTitle(note.content);
    if (!window.confirm(`Delete “${label}”? This can’t be undone.`)) {
      return;
    }
    startTransition(async () => {
      setError(null);
      const result = await deleteEventPlaybookNoteAction(eventId, note.id);
      if (!result.success) {
        setError(result.error ?? "Unable to delete note.");
        return;
      }
      setDeletedIds((current) => new Set(current).add(note.id));
      if (selectedId === note.id) {
        setSelectedId(null);
        setComposing(true);
        setContent("");
      }
      await refresh();
    });
  };

  return (
    <section className="flex flex-col gap-8 xl:flex-row xl:gap-10">
      <div className="min-w-0 flex-1">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-4">
            <h2 className="font-display text-3xl text-[#2f4a3c]">
              Shared Notes
            </h2>
            <button
              type="button"
              onClick={startNewNote}
              className="inline-flex items-center gap-2 rounded-lg bg-[#2f4a3c] px-4 py-2 text-sm font-bold text-[#f6f2eb] shadow-md transition hover:bg-[#243c30]"
            >
              <Plus className="h-4 w-4" aria-hidden />
              New Note
            </button>
          </div>
        </div>

        <div
          className={cn(
            "min-h-[420px] rounded-2xl border border-[#e8e3da] bg-white p-6 shadow-sm sm:p-10",
            "bg-[repeating-linear-gradient(#f6f2eb,#f6f2eb_27px,#e8e3da_28px)] leading-7",
          )}
        >
          {composing ? (
            <div className="space-y-4">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Capture shared logistics, contacts, and lessons for this event…"
                rows={14}
                className="w-full resize-y bg-transparent font-display text-xl text-[#2f4a3c] placeholder:text-[#6b8171]/70 focus:outline-none"
              />
              {error ? (
                <p className="text-sm text-[#a65a3a]" role="alert">
                  {error}
                </p>
              ) : null}
              {!tablesAvailable ? (
                <p className="text-sm text-[#6b8171]">
                  Notes aren’t available for this organization yet.
                </p>
              ) : null}
              <div className="flex flex-wrap gap-2 pt-2">
                <button
                  type="button"
                  disabled={pending || !content.trim() || !tablesAvailable}
                  onClick={() => save("note")}
                  className="rounded-full bg-[#c4922e] px-4 py-2 text-[13px] font-bold text-white transition hover:bg-[#a87a22] disabled:opacity-50"
                >
                  {pending ? "Saving…" : "Save note"}
                </button>
                <button
                  type="button"
                  disabled={pending || !content.trim() || !tablesAvailable}
                  onClick={() => save("lesson")}
                  className="rounded-full border border-[#e8e3da] bg-[#f6f2eb] px-4 py-2 text-[13px] font-bold text-[#2f4a3c] transition hover:bg-white disabled:opacity-50"
                >
                  Mark as lesson
                </button>
              </div>
            </div>
          ) : selected ? (
            <div>
              <div className="mb-6 flex items-start justify-between gap-3">
                <h3 className="font-display text-2xl leading-relaxed text-[#2f4a3c]">
                  {noteTitle(selected.content)}
                </h3>
                <button
                  type="button"
                  onClick={() => handleDelete(selected)}
                  disabled={pending || !tablesAvailable}
                  aria-label={`Delete ${noteTitle(selected.content)}`}
                  title="Delete"
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#6b8171] transition hover:bg-[rgba(166,90,58,0.12)] hover:text-[#a65a3a] disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </button>
              </div>
              <div className="space-y-4 text-[15px] text-[#2f4a3c]">
                {notePreviewLines(selected.content).map((line, index) => (
                  <p key={`${selected.id}-${index}`}>{line}</p>
                ))}
              </div>
              <p className="mt-12 text-sm italic text-[#6b8171]">
                {selected.noteType === "lesson" ? "Lesson" : "Note"} ·{" "}
                {selected.authorName ?? "Team"} ·{" "}
                {formatEdited(selected.createdAt)}
              </p>
              {error ? (
                <p className="mt-4 text-sm text-[#a65a3a]" role="alert">
                  {error}
                </p>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-[#6b8171]">
              No notes yet — start a shared note for this event.
            </p>
          )}
        </div>
      </div>

      <aside className="w-full shrink-0 xl:w-72">
        <h4 className="mb-4 text-xs font-bold tracking-widest text-[#6b8171] uppercase">
          Recent Scratchpads
        </h4>
        {scratchpads.length === 0 ? (
          <p className="text-sm text-[#6b8171]">
            {visibleNotes.length === 0
              ? "Saved notes will show up here."
              : "You’re viewing the only note."}
          </p>
        ) : (
          <div className="space-y-4">
            {scratchpads.map((note) => (
              <div
                key={note.id}
                className="group relative rounded-xl border border-[#e8e3da] bg-white/50 transition hover:border-[#c4922e]"
              >
                <button
                  type="button"
                  onClick={() => openScratchpad(note.id)}
                  className="w-full p-4 pr-10 text-left"
                >
                  <p className="truncate text-sm font-medium text-[#2f4a3c]">
                    {noteTitle(note.content)}
                  </p>
                  <p className="mt-1 text-xs text-[#6b8171]">
                    {formatWhen(note.createdAt)}
                    {note.authorName ? ` · ${note.authorName}` : ""}
                    {note.noteType === "lesson" ? " · Lesson" : ""}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(note)}
                  disabled={pending || !tablesAvailable}
                  aria-label={`Delete ${noteTitle(note.content)}`}
                  title="Delete"
                  className="absolute top-3 right-3 inline-flex h-7 w-7 items-center justify-center rounded-full text-[#6b8171] opacity-0 transition group-hover:opacity-100 hover:bg-[rgba(166,90,58,0.12)] hover:text-[#a65a3a] focus-visible:opacity-100 disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                </button>
              </div>
            ))}
          </div>
        )}
      </aside>
    </section>
  );
}
