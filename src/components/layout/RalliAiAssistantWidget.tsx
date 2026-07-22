"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FormEvent, useEffect, useRef, useState, useTransition } from "react";
import { Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { askRalliAssistantAction } from "@/lib/ralli-assistant/actions";
import {
  formatEventOptionChipLabel,
  type AskRalliEventOption,
} from "@/lib/ralli-assistant/event-resolver";
import { prepareAnswerForDisplay } from "@/lib/ralli-assistant/answer-display";
import type { AskRalliSource } from "@/lib/ralli-assistant/ask";
import { type ProductHelpLink } from "@/lib/ralli-assistant/product-help-knowledge";
import { cn } from "@/lib/utils/cn";

interface RalliAiAssistantWidgetProps {
  compact?: boolean;
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
  if (source === "faq" || source === "ai") return "Product how-tos";
  return "Next steps & how-tos";
}

/** Curated chips across ops/org, volunteers/comms, drafts, insights, how-to. */
const ASK_RALLI_SUGGESTIONS = [
  "What needs my approval?",
  "Give me today's summary",
  "What's my biggest risk?",
  "Is my event healthy?",
  "Do I need more volunteers?",
  "Write tomorrow's reminder",
  "What should I do next for this event?",
  "How do I create a campaign?",
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

export function RalliAiAssistantWidget({
  compact = false,
}: RalliAiAssistantWidgetProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [lastSource, setLastSource] = useState<AskRalliSource | null>(null);
  const [pending, startTransition] = useTransition();
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, open, pending]);

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

  return (
    <>
      {compact ? (
        <button
          type="button"
          title="Hey Ralli Assistant"
          aria-label="Hey Ralli Assistant"
          onClick={() => setOpen(true)}
          className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-cos-accent/25 bg-cos-accent-soft/70 transition-colors hover:bg-cos-accent-soft"
        >
          <Sparkles className="h-4 w-4 text-cos-accent" strokeWidth={1.5} />
        </button>
      ) : (
        <div className="rounded-[12px] border border-cos-border bg-cos-card p-4 shadow-[0_1px_2px_rgba(42,38,34,0.04)]">
          <div className="flex items-center gap-2">
            <Sparkles
              className="h-4 w-4 shrink-0 text-cos-brand-navy"
              strokeWidth={1.5}
            />
            <h3 className="font-display text-base text-cos-brand-navy">
              Hey Ralli Assistant
            </h3>
            <span className="rounded-full bg-cos-accent px-2 py-0.5 text-[10px] font-bold tracking-wide text-[#f6f2eb] uppercase">
              Ask
            </span>
          </div>

          <p className="mt-2.5 text-sm leading-relaxed text-cos-muted">
            Ask for today’s org briefing, what’s next on an event, writing help
            for reminders or captions, or how to navigate Hey Ralli — not AI
            Brain training.
          </p>

          <button
            type="button"
            onClick={() => setOpen(true)}
            className={cn(
              "mt-4 flex w-full items-center justify-center rounded-[10px] border border-cos-accent/20",
              "bg-cos-accent px-4 py-2.5 text-sm font-semibold text-[#f6f2eb] transition-colors hover:bg-cos-accent/90",
            )}
          >
            Ask Ralli →
          </button>
        </div>
      )}

      {open ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-cos-text/20 backdrop-blur-sm">
          <button
            type="button"
            aria-label="Close Hey Ralli Assistant"
            className="flex-1"
            onClick={() => setOpen(false)}
          />
          <aside
            className="flex h-full w-full max-w-md flex-col border-l border-cos-border bg-cos-card shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ralli-ask-title"
          >
            <div className="flex items-start justify-between gap-3 border-b border-cos-border px-5 py-4">
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
                  Org briefings, what’s next for an event, draft reminders &amp;
                  caption rewrites — plus product how-tos.
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setOpen(false)}
                aria-label="Close"
              >
                <X className="h-4 w-4" strokeWidth={1.75} />
              </Button>
            </div>

            <div
              ref={listRef}
              className="flex-1 space-y-3 overflow-y-auto px-5 py-4"
            >
              {messages.length === 0 ? (
                <div className="space-y-3">
                  <p className="text-sm text-cos-muted">
                    Try a question to get started:
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
                            onClick={() => setOpen(false)}
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
              {pending ? (
                <p className="text-sm text-cos-muted">Thinking…</p>
              ) : null}
              {error ? (
                <p className="text-sm text-cos-error-text">{error}</p>
              ) : null}
            </div>

            <form
              onSubmit={handleSubmit}
              className="border-t border-cos-border px-5 py-4"
            >
              <label htmlFor="ralli-ask-input" className="sr-only">
                Ask Ralli a question
              </label>
              <div className="flex gap-2">
                <input
                  id="ralli-ask-input"
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  placeholder="What's next… Write a reminder… or How do I…?"
                  disabled={pending}
                  className="h-10 flex-1 rounded-[10px] border border-cos-border bg-cos-bg px-3 text-sm text-cos-text outline-none placeholder:text-cos-muted focus:border-cos-text disabled:opacity-60"
                />
                <Button type="submit" size="md" disabled={pending || !question.trim()}>
                  Ask
                </Button>
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-cos-muted">
                For brand voice &amp; training content, use{" "}
                <Link
                  href="/settings/ai-brain"
                  onClick={() => setOpen(false)}
                  className="underline underline-offset-2 hover:text-cos-text"
                >
                  Settings → AI Brain
                </Link>
                .
              </p>
            </form>
          </aside>
        </div>
      ) : null}
    </>
  );
}
