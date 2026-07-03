"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { BookOpen, StickyNote } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { createEventPlaybookNoteAction } from "@/lib/event-playbooks/actions";
import { cn } from "@/lib/utils/cn";
import type { EventPlaybookNote, EventPlaybookNoteType } from "@/types/event-playbooks";

interface NotesTabProps {
  eventId: string;
  notes: EventPlaybookNote[];
  tablesAvailable: boolean;
}

export function NotesTab({ eventId, notes, tablesAvailable }: NotesTabProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [content, setContent] = useState("");
  const [noteType, setNoteType] = useState<EventPlaybookNoteType>("note");
  const [error, setError] = useState<string | null>(null);

  const lessons = notes.filter((n) => n.noteType === "lesson");
  const generalNotes = notes.filter((n) => n.noteType === "note");

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const result = await createEventPlaybookNoteAction(eventId, content, noteType);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setContent("");
      router.refresh();
    });
  }

  if (!tablesAvailable) {
    return (
      <Card padding="lg">
        <CardHeader>
          <CardTitle>Notes & lessons learned</CardTitle>
          <CardDescription>
            Run migration 031_event_playbook_tables.sql to enable notes.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card padding="lg">
        <CardHeader>
          <CardTitle>Add a note</CardTitle>
          <CardDescription>
            Capture lessons learned and planning notes for next year.
          </CardDescription>
        </CardHeader>

        <div className="mt-4 flex gap-2">
          <TypeToggle
            active={noteType === "note"}
            onClick={() => setNoteType("note")}
            icon={StickyNote}
            label="Note"
          />
          <TypeToggle
            active={noteType === "lesson"}
            onClick={() => setNoteType("lesson")}
            icon={BookOpen}
            label="Lesson learned"
          />
        </div>

        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={4}
          placeholder={
            noteType === "lesson"
              ? "What would you do differently next time?"
              : "Planning note…"
          }
          className="mt-4 w-full border border-cos-border bg-cos-card px-3 py-2 text-sm text-cos-text placeholder:text-cos-muted focus:border-cos-dark focus:outline-none"
        />

        <div className="mt-4 flex items-center gap-3">
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={pending || !content.trim()}
            size="sm"
          >
            Save {noteType === "lesson" ? "lesson" : "note"}
          </Button>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      </Card>

      <NoteSection title="Lessons learned" items={lessons} empty="No lessons captured yet." />
      <NoteSection title="Notes" items={generalNotes} empty="No notes yet." />
    </div>
  );
}

function TypeToggle({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 border px-3 py-2 text-sm transition-colors",
        active
          ? "border-cos-dark bg-cos-dark text-[#f6f2eb]"
          : "border-cos-border bg-cos-card text-cos-muted hover:text-cos-text",
      )}
    >
      <Icon className="h-4 w-4" strokeWidth={1.5} />
      {label}
    </button>
  );
}

function NoteSection({
  title,
  items,
  empty,
}: {
  title: string;
  items: EventPlaybookNote[];
  empty: string;
}) {
  return (
    <Card padding="lg">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      {items.length > 0 ? (
        <ul className="mt-4 space-y-4">
          {items.map((note) => (
            <li key={note.id} className="border-l-2 border-cos-border pl-4">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-cos-text">
                {note.content}
              </p>
              <p className="mt-2 text-xs text-cos-muted">
                {note.authorName ?? "Unknown"} ·{" "}
                {new Date(note.createdAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-cos-muted">{empty}</p>
      )}
    </Card>
  );
}
