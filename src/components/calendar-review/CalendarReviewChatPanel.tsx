"use client";

import { useState, useTransition } from "react";
import { Loader2, MessageSquare, Send } from "lucide-react";
import { refineCalendarReviewAction } from "@/lib/calendar-import/actions";
import { Button } from "@/components/ui/Button";
import type { CalendarReviewEvent } from "@/types/calendar-review";

interface CalendarReviewChatPanelProps {
  importId: string;
  events: CalendarReviewEvent[];
  onEventsUpdated: (events: CalendarReviewEvent[]) => void;
  disabled?: boolean;
}

export function CalendarReviewChatPanel({
  importId,
  events,
  onEventsUpdated,
  disabled = false,
}: CalendarReviewChatPanelProps) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(submitEvent: React.FormEvent<HTMLFormElement>) {
    submitEvent.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await refineCalendarReviewAction(importId, events, message);
      if (result.error) {
        setError(result.error);
        return;
      }

      onEventsUpdated(result.events);
      setMessage("");
    });
  }

  return (
    <div className="rounded-xl border border-cos-border bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cos-accent-soft">
          <MessageSquare className="h-5 w-5 text-cos-accent" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-cos-text">
            Fix dates with chat
          </p>
          <p className="mt-1 text-sm text-cos-muted">
            Ask to remove duplicates, fix a date, or skip half-days. Example:
            &ldquo;Remove the duplicate Labor Day entry&rdquo; or &ldquo;Move
            picture day to September 15.&rdquo;
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-4 space-y-3">
        <textarea
          value={message}
          onChange={(changeEvent) => setMessage(changeEvent.target.value)}
          disabled={disabled || isPending}
          rows={3}
          placeholder="Describe what to fix in the parsed list..."
          className="w-full rounded-xl border border-cos-border px-3 py-2 text-sm text-cos-text outline-none ring-cos-primary focus:ring-2 disabled:bg-cos-bg"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end">
          <Button type="submit" disabled={disabled || isPending || !message.trim()}>
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Updating list...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Apply changes
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
