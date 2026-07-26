"use client";

import { useState, useTransition } from "react";
import {
  EaseBtnPrimary,
  EaseBtnSecondary,
  EaseBox,
  EaseQueue,
  EaseRow,
  EaseSectionLabel,
  EaseSoftActions,
} from "@/components/events-phase3/EventDetailEaseUi";
import { useEventTabMutationRefresh } from "@/components/events-phase3/EventDetailTabInvalidation";
import { createEventPlaybookNoteAction } from "@/lib/event-playbooks/actions";
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
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

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
      await refresh();
    });
  };

  return (
    <section>
      <EaseSectionLabel>Notes &amp; lessons</EaseSectionLabel>
      <EaseBox>
        <div className="mb-3.5 grid gap-2.5">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Capture a note or lesson for next year…"
            className="min-h-[90px] w-full resize-y rounded-2xl border border-cos-border bg-cos-card px-3.5 py-3 text-sm text-cos-text placeholder:text-cos-muted"
          />
          {error ? (
            <p className="text-sm text-[#a65a3a]">{error}</p>
          ) : null}
          <EaseSoftActions>
            <EaseBtnPrimary
              disabled={pending || !content.trim()}
              onClick={() => save("note")}
            >
              Save note
            </EaseBtnPrimary>
            <EaseBtnSecondary
              disabled={pending || !content.trim()}
              onClick={() => save("lesson")}
            >
              Mark as lesson
            </EaseBtnSecondary>
          </EaseSoftActions>
        </div>

        <EaseQueue>
          {notes.length === 0 ? (
            <p className="text-sm text-cos-muted">
              No notes yet — capture something for next year.
            </p>
          ) : (
            notes.map((note) => (
              <EaseRow
                key={note.id}
                title={note.content}
                meta={`${note.noteType === "lesson" ? "Lesson" : "Note"} · ${note.authorName ?? "Team"} · ${formatWhen(note.createdAt)}`}
                as="div"
              />
            ))
          )}
        </EaseQueue>
      </EaseBox>
    </section>
  );
}
