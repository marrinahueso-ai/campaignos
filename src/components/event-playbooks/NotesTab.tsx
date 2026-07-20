"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { BookOpen, Mic, MicOff, StickyNote } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { createEventPlaybookNoteAction } from "@/lib/event-playbooks/actions";
import { cn } from "@/lib/utils/cn";
import type { EventPlaybookNote, EventPlaybookNoteType } from "@/types/event-playbooks";

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult:
    | ((event: {
        results: ArrayLike<ArrayLike<{ transcript: string }>>;
      }) => void)
    | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") {
    return null;
  }
  const win = window as Window & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return win.SpeechRecognition ?? win.webkitSpeechRecognition ?? null;
}

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
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  const lessons = notes.filter((n) => n.noteType === "lesson");
  const generalNotes = notes.filter((n) => n.noteType === "note");

  useEffect(() => {
    setVoiceSupported(Boolean(getSpeechRecognitionConstructor()));
  }, []);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsListening(false);
  }, []);

  useEffect(() => () => stopListening(), [stopListening]);

  const toggleVoice = useCallback(() => {
    const SpeechRecognitionCtor = getSpeechRecognitionConstructor();
    if (!SpeechRecognitionCtor) {
      setError("Voice input isn’t supported in this browser.");
      return;
    }

    if (isListening) {
      stopListening();
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "en-US";
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result?.[0]?.transcript?.trim() ?? "")
        .filter(Boolean)
        .join(" ");
      if (transcript) {
        setContent((prev) =>
          prev.trim() ? `${prev.trim()} ${transcript}` : transcript,
        );
      }
    };
    recognition.onerror = () => {
      setIsListening(false);
      setError("Couldn’t capture voice. Try typing instead.");
    };
    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    setError(null);
    setIsListening(true);
    try {
      recognition.start();
    } catch {
      setIsListening(false);
      setError("Couldn’t start voice input.");
    }
  }, [isListening, stopListening]);

  function handleSubmit() {
    setError(null);
    stopListening();
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
            Capture lessons learned and planning notes for next year. Type or use the
            microphone to dictate.
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

        <div className="mt-4 flex gap-2">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
            placeholder={
              noteType === "lesson"
                ? "What would you do differently next time?"
                : "Planning note…"
            }
            className="min-h-[6rem] w-full resize-y border border-cos-border bg-cos-card px-3 py-2 text-sm text-cos-text placeholder:text-cos-muted focus:border-cos-dark focus:outline-none"
          />
          {voiceSupported ? (
            <button
              type="button"
              aria-label={isListening ? "Stop voice input" : "Start voice input"}
              aria-pressed={isListening}
              onClick={toggleVoice}
              className={cn(
                "inline-flex h-10 w-10 shrink-0 items-center justify-center border transition-colors",
                isListening
                  ? "border-cos-dark bg-cos-dark text-[#f6f2eb]"
                  : "border-cos-border bg-cos-card text-cos-muted hover:text-cos-text",
              )}
            >
              {isListening ? (
                <MicOff className="h-4 w-4" strokeWidth={1.75} />
              ) : (
                <Mic className="h-4 w-4" strokeWidth={1.75} />
              )}
            </button>
          ) : null}
        </div>

        {isListening ? (
          <p className="mt-2 text-xs text-cos-muted">Listening… click the mic again to stop.</p>
        ) : null}

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
