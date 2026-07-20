"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, Mic, MicOff, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { generateEventBriefAction } from "@/lib/ai/actions";
import type { EventBriefInput } from "@/lib/ai/types";
import { COMMUNICATION_STRATEGY_LABELS } from "@/lib/events/communication-strategy";
import { updateEventOverviewAction } from "@/lib/event-workspace/actions";
import { EVENT_TYPE_LABELS } from "@/lib/playbooks/constants";
import { cn } from "@/lib/utils/cn";
import type { Event } from "@/types";

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

const EMPTY_SUMMARY =
  "Add a short event summary so your team understands the purpose and key details.";

interface EventDetailHeroSummaryProps {
  event: Event;
}

export function EventDetailHeroSummary({ event }: EventDetailHeroSummaryProps) {
  const router = useRouter();
  const [draft, setDraft] = useState(event.description?.trim() ?? "");
  const [isEditing, setIsEditing] = useState(false);
  const [suggestedBrief, setSuggestedBrief] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const [summaryOverflows, setSummaryOverflows] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const summaryTextRef = useRef<HTMLParagraphElement | null>(null);

  useEffect(() => {
    setDraft(event.description?.trim() ?? "");
    setSuggestedBrief(null);
    setIsEditing(false);
    setError(null);
    setSummaryExpanded(false);
  }, [event.id, event.description]);

  useEffect(() => {
    setVoiceSupported(Boolean(getSpeechRecognitionConstructor()));
  }, []);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsListening(false);
  }, []);

  useEffect(() => () => stopListening(), [stopListening]);

  function beginEditing(nextDraft?: string) {
    setIsEditing(true);
    setError(null);
    if (typeof nextDraft === "string") {
      setDraft(nextDraft);
    }
  }

  function handleCancel() {
    stopListening();
    setDraft(event.description?.trim() ?? "");
    setSuggestedBrief(null);
    setIsEditing(false);
    setError(null);
  }

  function getBriefInput(): EventBriefInput {
    return {
      title: event.title,
      roughDescription: draft || event.description || "",
      audience: event.audience,
      theme: event.theme,
      category: event.category,
      eventTypeLabel: event.eventType
        ? (EVENT_TYPE_LABELS[event.eventType] ?? null)
        : null,
      communicationStrategyLabel:
        COMMUNICATION_STRATEGY_LABELS[event.communicationStrategy] ?? null,
      location: event.location,
      date: event.date,
      time: event.time,
      volunteerNeeds: event.volunteerNeeds,
    };
  }

  function handleImproveWithAi() {
    setError(null);
    setSuggestedBrief(null);
    beginEditing();
    startTransition(async () => {
      const result = await generateEventBriefAction(getBriefInput(), event.id);
      if (!result.success || !result.brief) {
        setError(result.error ?? "Unable to improve the summary right now.");
        return;
      }
      setSuggestedBrief(result.brief);
    });
  }

  function handleApplySuggested() {
    if (!suggestedBrief) {
      return;
    }
    setDraft(suggestedBrief);
    setSuggestedBrief(null);
    setIsEditing(true);
  }

  function handleSave() {
    stopListening();
    setError(null);
    startTransition(async () => {
      const result = await updateEventOverviewAction(event.id, {
        description: draft.trim(),
        time: event.time,
        location: event.location,
        audience: event.audience,
        theme: event.theme,
        eventOwner: event.eventOwner,
        budget: event.budget,
        volunteerNeeds: event.volunteerNeeds,
      });
      if (!result.success) {
        setError(result.error ?? "Unable to save summary.");
        return;
      }
      setSuggestedBrief(null);
      setIsEditing(false);
      router.refresh();
    });
  }

  function toggleVoice() {
    const SpeechRecognitionCtor = getSpeechRecognitionConstructor();
    if (!SpeechRecognitionCtor) {
      setError("Voice input isn’t supported in this browser.");
      return;
    }

    if (isListening) {
      stopListening();
      return;
    }

    beginEditing();
    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "en-US";
    recognition.onresult = (speechEvent) => {
      const transcript = Array.from(speechEvent.results)
        .map((result) => result?.[0]?.transcript?.trim() ?? "")
        .filter(Boolean)
        .join(" ");
      if (transcript) {
        setDraft((prev) => (prev.trim() ? `${prev.trim()} ${transcript}` : transcript));
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
  }

  const savedDescription = event.description?.trim() ?? "";
  const showEditor = isEditing || Boolean(suggestedBrief);
  const canExpandSummary = Boolean(savedDescription) && !showEditor;

  useEffect(() => {
    if (!canExpandSummary || summaryExpanded) {
      setSummaryOverflows(false);
      return;
    }

    const node = summaryTextRef.current;
    if (!node) {
      setSummaryOverflows(false);
      return;
    }

    const measure = () => {
      setSummaryOverflows(node.scrollHeight > node.clientHeight + 1);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [canExpandSummary, savedDescription, summaryExpanded]);

  return (
    <div className="flex min-w-0 flex-col">
      <p className="text-[10px] font-semibold tracking-[0.14em] text-cos-muted uppercase">
        Event summary
      </p>

      {showEditor ? (
        <div className="mt-3 space-y-3">
          <textarea
            value={draft}
            onChange={(changeEvent) => {
              setDraft(changeEvent.target.value);
              setIsEditing(true);
            }}
            rows={4}
            className="w-full resize-y rounded-lg border border-cos-border bg-cos-bg px-3 py-2 text-sm leading-relaxed text-cos-text placeholder:text-cos-muted focus:border-cos-dark focus:outline-none"
            placeholder={EMPTY_SUMMARY}
          />
          {suggestedBrief ? (
            <div className="rounded-lg border border-cos-border bg-cos-bg/70 p-3">
              <p className="text-[10px] font-semibold tracking-wide text-cos-muted uppercase">
                Suggested summary
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-cos-text">
                {suggestedBrief}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={handleApplySuggested}
                  disabled={pending}
                >
                  Use suggestion
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => setSuggestedBrief(null)}
                  disabled={pending}
                >
                  Dismiss
                </Button>
              </div>
            </div>
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" size="sm" onClick={handleSave} disabled={pending}>
              {pending ? "Saving…" : "Save"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={handleCancel}
              disabled={pending}
            >
              Cancel
            </Button>
            {isListening ? (
              <span className="text-xs text-cos-muted">Listening…</span>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="mt-3">
          <p
            ref={summaryTextRef}
            className={cn(
              "text-sm leading-relaxed text-cos-text",
              !summaryExpanded && "line-clamp-2",
            )}
          >
            {savedDescription || (
              <span className="text-cos-muted">{EMPTY_SUMMARY}</span>
            )}
          </p>
          {savedDescription && (summaryOverflows || summaryExpanded) ? (
            <button
              type="button"
              onClick={() => setSummaryExpanded((open) => !open)}
              className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-cos-muted transition-colors hover:text-cos-text"
              aria-expanded={summaryExpanded}
            >
              {summaryExpanded ? (
                <>
                  Show less
                  <ChevronUp className="h-3.5 w-3.5" strokeWidth={2} />
                </>
              ) : (
                <>
                  Read more
                  <ChevronDown className="h-3.5 w-3.5" strokeWidth={2} />
                </>
              )}
            </button>
          ) : null}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={handleImproveWithAi}
          disabled={pending}
        >
          <Sparkles className="h-3.5 w-3.5" />
          {pending && !isListening ? "Improving…" : "Improve with AI"}
        </Button>
        {voiceSupported ? (
          <button
            type="button"
            onClick={toggleVoice}
            disabled={pending}
            aria-label={isListening ? "Stop voice note" : "Record voice note"}
            aria-pressed={isListening}
            className={cn(
              "inline-flex h-8 w-8 items-center justify-center rounded-lg border transition-colors",
              isListening
                ? "border-cos-dark bg-cos-dark text-[#f6f2eb]"
                : "border-cos-border bg-cos-card text-cos-muted hover:text-cos-text",
            )}
          >
            {isListening ? (
              <MicOff className="h-3.5 w-3.5" strokeWidth={1.75} />
            ) : (
              <Mic className="h-3.5 w-3.5" strokeWidth={1.75} />
            )}
          </button>
        ) : (
          <button
            type="button"
            disabled
            aria-label="Voice input not supported"
            title="Voice input isn’t supported in this browser"
            className="inline-flex h-8 w-8 cursor-not-allowed items-center justify-center rounded-lg border border-cos-border bg-cos-card text-cos-muted opacity-50"
          >
            <Mic className="h-3.5 w-3.5" strokeWidth={1.75} />
          </button>
        )}
        {!showEditor ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => beginEditing(savedDescription)}
          >
            Edit
          </Button>
        ) : null}
      </div>

      {error ? (
        <p className="mt-2 text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      {!voiceSupported ? (
        <p className="mt-2 text-xs text-cos-muted">
          Voice notes aren’t supported in this browser. You can still type or use Improve with AI.
        </p>
      ) : null}
    </div>
  );
}
