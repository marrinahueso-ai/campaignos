"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FormEvent,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { askRalliAssistantAction } from "@/lib/ralli-assistant/actions";
import {
  formatEventOptionChipLabel,
  type AskRalliEventOption,
} from "@/lib/ralli-assistant/event-resolver";
import { prepareAnswerForDisplay } from "@/lib/ralli-assistant/answer-display";
import type { AskRalliSource } from "@/lib/ralli-assistant/ask-types";
import { type ProductHelpLink } from "@/lib/ralli-assistant/product-help-knowledge";
import { cn } from "@/lib/utils/cn";

interface RalliAiAssistantDialogProps {
  onClose: () => void;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  links?: ProductHelpLink[];
  eventOptions?: AskRalliEventOption[];
  source?: AskRalliSource | null;
  /** Original question for regenerating after an event pick. */
  sourceQuestion?: string;
}

function assistantEyebrow(source: AskRalliSource | null): string {
  if (source === "insights") return "Insights";
  if (source === "content") return "Draft helper";
  if (source === "ops" || source === "org") return "Your next steps";
  if (source === "pto") return "PTO tips";
  if (source === "faq" || source === "ai") return "Product how-tos";
  return "Help";
}

/** Starter chips — how-to / Help Center first (ops coach can still be asked freely). */
const ASK_RALLI_SUGGESTIONS = [
  "I'm new. Where do I start?",
  "How do I invite my team?",
  "How do I connect Facebook and Instagram?",
  "How do I create social posts with AI?",
  "Where do approvals live?",
  "How do I bring in our school calendar?",
  "How do plans and AI credits work?",
  "Where do volunteers live?",
] as const;

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function AnswerBody({ text }: { text: string }) {
  const display = prepareAnswerForDisplay(text, { hasLinkChips: true });
  const blocks = display.split(/\n{2,}/);

  return (
    <div className="space-y-2.5">
      {blocks.map((block, blockIndex) => {
        const lines = block.split("\n").filter((line) => line.length > 0);
        const bulletLines = lines.filter((line) => /^[•*-]\s+/.test(line));
        const isBulletBlock =
          bulletLines.length > 0 && bulletLines.length === lines.length;

        if (isBulletBlock) {
          return (
            <ul key={blockIndex} className="list-none space-y-1 pl-0">
              {lines.map((line, lineIndex) => (
                <li key={lineIndex} className="flex gap-2">
                  <span className="mt-0.5 shrink-0 text-cos-muted" aria-hidden>
                    •
                  </span>
                  <span>{line.replace(/^[•*-]\s+/, "")}</span>
                </li>
              ))}
            </ul>
          );
        }

        const looksLikeHeader =
          lines.length === 1 &&
          lines[0]!.length < 48 &&
          !/[.!?]$/.test(lines[0]!) &&
          !/^[•*-]\s+/.test(lines[0]!);

        if (looksLikeHeader && blockIndex > 0) {
          return (
            <p
              key={blockIndex}
              className="text-xs font-semibold tracking-wide text-cos-muted uppercase"
            >
              {lines[0]}
            </p>
          );
        }

        return (
          <div key={blockIndex} className="space-y-1">
            {lines.map((line, lineIndex) => {
              if (/^[•*-]\s+/.test(line)) {
                return (
                  <p key={lineIndex} className="flex gap-2">
                    <span className="mt-0.5 shrink-0 text-cos-muted" aria-hidden>
                      •
                    </span>
                    <span>{line.replace(/^[•*-]\s+/, "")}</span>
                  </p>
                );
              }
              return <p key={lineIndex}>{line}</p>;
            })}
          </div>
        );
      })}
    </div>
  );
}

export function RalliAiAssistantDialog({ onClose }: RalliAiAssistantDialogProps) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [lastSource, setLastSource] = useState<AskRalliSource | null>(null);
  const [pending, startTransition] = useTransition();
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, pending]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  function ask(nextQuestion: string, eventId?: string | null) {
    const trimmed = nextQuestion.trim();
    if (!trimmed || pending) return;

    setError(null);
    setQuestion("");
    setMessages((prev) => [
      ...prev,
      { id: newId(), role: "user", text: trimmed },
    ]);

    startTransition(async () => {
      const result = await askRalliAssistantAction(
        trimmed,
        pathname,
        eventId ?? null,
      );
      if (!result.success || !result.answer) {
        setError(result.error ?? "Something went wrong. Try again.");
        return;
      }
      setLastSource(result.source);
      setMessages((prev) => [
        ...prev,
        {
          id: newId(),
          role: "assistant",
          text: result.answer!,
          links: result.links,
          eventOptions: result.eventOptions,
          source: result.source,
          sourceQuestion: trimmed,
        },
      ]);
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    ask(question);
  }

  function pickEventOption(message: ChatMessage, option: AskRalliEventOption) {
    const sourceQuestion = message.sourceQuestion?.trim();
    if (!sourceQuestion || pending) return;
    ask(sourceQuestion, option.eventId);
  }

  if (!mounted || typeof document === "undefined") return null;

  // Portaled to document.body — sticky header backdrop-filter otherwise traps
  // position:fixed and the drawer collapses into a glitchy strip.
  return createPortal(
    <div
      className="fixed inset-0 z-[200] isolate"
      data-ralli-assistant-root="true"
    >
      <button
        type="button"
        aria-label="Close Hey Ralli Assistant"
        className="absolute inset-0 bg-[rgba(42,38,34,0.35)] backdrop-blur-[2px]"
        onClick={onClose}
      />
      <aside
        className="absolute inset-y-0 right-0 flex h-full w-full max-w-md flex-col border-l border-cos-border bg-[#fffcf7] shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ralli-ask-title"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-cos-border px-5 py-4">
          <div>
            <p className="text-[11px] font-medium tracking-wide text-cos-muted uppercase">
              {assistantEyebrow(lastSource)}
            </p>
            <h2
              id="ralli-ask-title"
              className="font-display mt-1 text-2xl text-cos-text"
            >
              Hey Ralli Assistant
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-cos-muted">
              Ask how to set up your school, create posts, run approvals, or
              find a feature — or browse the Help Center.
            </p>
            <Link
              href="/help"
              onClick={onClose}
              className="mt-2 inline-block text-sm font-medium text-cos-text underline decoration-cos-border underline-offset-2 hover:decoration-cos-text"
            >
              Browse Help Center →
            </Link>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="h-4 w-4" strokeWidth={1.75} />
          </Button>
        </div>

        <div
          ref={listRef}
          className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4"
        >
          {messages.length === 0 ? (
            <div className="space-y-3">
              <p className="text-sm text-cos-muted">
                Try a help question to get started:
              </p>
              <div className="flex flex-col gap-2">
                {ASK_RALLI_SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    disabled={pending}
                    onClick={() => ask(suggestion)}
                    className="rounded-[10px] border border-cos-border bg-cos-bg px-3 py-2.5 text-left text-sm text-cos-text transition-colors hover:bg-cos-bg-alt disabled:opacity-60"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "rounded-[12px] px-3 py-2.5 text-sm leading-relaxed",
                  message.role === "user"
                    ? "ml-8 bg-cos-text text-[#f6f2eb]"
                    : "mr-4 border border-cos-border bg-cos-bg text-cos-text",
                )}
              >
                {message.role === "user" ? (
                  <p className="whitespace-pre-wrap">{message.text}</p>
                ) : (
                  <AnswerBody text={message.text} />
                )}
                {message.eventOptions && message.eventOptions.length > 0 ? (
                  <div className="mt-2.5 flex flex-col gap-1.5">
                    {message.eventOptions.map((option) => (
                      <button
                        key={option.eventId}
                        type="button"
                        disabled={pending}
                        onClick={() => pickEventOption(message, option)}
                        className="rounded-full border border-cos-border bg-cos-card px-2.5 py-1.5 text-left text-xs font-medium text-cos-text hover:bg-cos-bg-alt disabled:opacity-60"
                      >
                        {formatEventOptionChipLabel(option)} →
                      </button>
                    ))}
                  </div>
                ) : null}
                {message.links && message.links.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {message.links.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={onClose}
                        className="rounded-full border border-cos-border bg-cos-card px-2.5 py-1 text-xs font-medium text-cos-text hover:bg-cos-bg-alt"
                      >
                        {link.label} →
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
            ))
          )}
          {pending ? <p className="text-sm text-cos-muted">Thinking…</p> : null}
          {error ? <p className="text-sm text-cos-error-text">{error}</p> : null}
        </div>

        <form
          onSubmit={handleSubmit}
          className="shrink-0 border-t border-cos-border px-5 py-4"
        >
          <label htmlFor="ralli-ask-input" className="sr-only">
            Ask Ralli a question
          </label>
          <div className="flex gap-2">
            <input
              id="ralli-ask-input"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="How do I…?"
              disabled={pending}
              className="h-10 flex-1 rounded-[10px] border border-cos-border bg-cos-bg px-3 text-sm text-cos-text outline-none placeholder:text-cos-muted focus:border-cos-text disabled:opacity-60"
            />
            <Button type="submit" size="md" disabled={pending || !question.trim()}>
              Ask
            </Button>
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-cos-muted">
            Prefer a full page of how-tos?{" "}
            <Link
              href="/help"
              onClick={onClose}
              className="underline underline-offset-2 hover:text-cos-text"
            >
              Browse Help Center
            </Link>
            .
          </p>
        </form>
      </aside>
    </div>,
    document.body,
  );
}
