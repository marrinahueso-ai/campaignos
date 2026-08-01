"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { useEventTabMutationRefresh } from "@/components/events-phase3/EventDetailTabInvalidation";
import { createEventPlaybookNoteAction } from "@/lib/event-playbooks/actions";
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

  useEffect(() => {
    if (composing) return;
    if (selectedId && notes.some((note) => note.id === selectedId)) return;
    setSelectedId(notes[0]?.id ?? null);
    if (notes.length === 0) setComposing(true);
  }, [notes, selectedId, composing]);

  const selected = useMemo(
    () => notes.find((note) => note.id === selectedId) ?? null,
    [notes, selectedId],
  );

  const scratchpads = useMemo(() => {
    if (composing || !selectedId) return notes;
    return notes.filter((note) => note.id !== selectedId);
  }, [notes, selectedId, composing]);

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
              <h3 className="mb-6 font-display text-2xl leading-relaxed text-[#2f4a3c]">
                {noteTitle(selected.content)}
              </h3>
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
            {notes.length === 0
              ? "Saved notes will show up here."
              : "You’re viewing the only note."}
          </p>
        ) : (
          <div className="space-y-4">
            {scratchpads.map((note) => (
              <button
                key={note.id}
                type="button"
                onClick={() => openScratchpad(note.id)}
                className="w-full rounded-xl border border-[#e8e3da] bg-white/50 p-4 text-left transition hover:border-[#c4922e]"
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
            ))}
          </div>
        )}
      </aside>
    </section>
  );
}
