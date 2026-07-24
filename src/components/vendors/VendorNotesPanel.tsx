"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Mic, MicOff, StickyNote } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { addVendorNoteAction } from "@/lib/vendors/actions";
import type { VendorNote } from "@/types/vendors";
import { cn } from "@/lib/utils/cn";

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

interface VendorNotesPanelProps {
  vendorId: string;
  notes: VendorNote[];
  summary: string | null;
  canWrite: boolean;
}

export function VendorNotesPanel({
  vendorId,
  notes,
  summary,
  canWrite,
}: VendorNotesPanelProps) {
  const [pending, startTransition] = useTransition();
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [localNotes, setLocalNotes] = useState(notes);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    setVoiceSupported(Boolean(getSpeechRecognitionConstructor()));
  }, []);

  useEffect(() => {
    setLocalNotes(notes);
  }, [notes]);

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
    const trimmed = content.trim();
    if (!trimmed) return;

    const optimistic: VendorNote = {
      id: `optimistic-${Date.now()}`,
      organizationId: "",
      vendorId,
      content: trimmed,
      createdByName: "You",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setLocalNotes((prev) => [optimistic, ...prev]);
    setContent("");

    startTransition(async () => {
      const result = await addVendorNoteAction(vendorId, trimmed);
      if (!result.success) {
        setLocalNotes((prev) => prev.filter((note) => note.id !== optimistic.id));
        setContent(trimmed);
        setError(result.error ?? "Unable to save note.");
      }
      // No full-page refresh — note is already on screen; action revalidates for next visit.
    });
  }

  return (
    <div className="space-y-6">
      {canWrite ? (
        <Card padding="lg">
          <CardHeader>
            <CardTitle>Add a note</CardTitle>
            <CardDescription>
              Capture vendor context, block reasons, and follow-ups. Type or use the
              microphone to dictate.
            </CardDescription>
          </CardHeader>

          <div className="mt-4 flex items-center gap-2">
            <span className="inline-flex items-center gap-2 border border-cos-dark bg-cos-dark px-3 py-2 text-sm text-[#f6f2eb]">
              <StickyNote className="h-4 w-4" strokeWidth={1.5} />
              Note
            </span>
          </div>

          <div className="mt-4 flex gap-2">
            <textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              rows={4}
              placeholder="Vendor note…"
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
            <p className="mt-2 text-xs text-cos-muted">
              Listening… click the mic again to stop.
            </p>
          ) : null}

          <div className="mt-4 flex items-center gap-3">
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={pending || !content.trim()}
              size="sm"
            >
              Save note
            </Button>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
          </div>
        </Card>
      ) : null}

      <Card padding="lg">
        <CardHeader>
          <CardTitle>Notes</CardTitle>
        </CardHeader>
        {localNotes.length > 0 ? (
          <ul className="mt-4 space-y-4">
            {localNotes.map((note) => (
              <li key={note.id} className="border-l-2 border-cos-border pl-4">
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-cos-text">
                  {note.content}
                </p>
                <p className="mt-2 text-xs text-cos-muted">
                  {note.createdByName ?? "Unknown"} ·{" "}
                  {new Date(note.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </li>
            ))}
          </ul>
        ) : summary ? (
          <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-cos-text">
            {summary}
          </p>
        ) : (
          <p className="mt-4 text-sm text-cos-muted">No notes yet.</p>
        )}
      </Card>
    </div>
  );
}
