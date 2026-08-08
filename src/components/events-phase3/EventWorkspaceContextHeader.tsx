"use client";

import { ArrowLeft } from "lucide-react";
import { ew } from "@/components/events-phase3/event-workspace-tokens";
import { cn } from "@/lib/utils/cn";

type Props = {
  eventTitle: string;
  /** Return to this event's landing/overview. */
  onBackToEvent: () => void;
};

/**
 * Lightweight interior Event page chrome.
 * Event-wide destination rail lives on the landing page only.
 */
export function EventWorkspaceContextHeader({
  eventTitle,
  onBackToEvent,
}: Props) {
  return (
    <button
      type="button"
      onClick={onBackToEvent}
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 text-sm font-medium",
        ew.inksoft,
        "hover:text-[#1c352d]",
      )}
      data-testid="event-workspace-back-to-event"
    >
      <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
      <span className="truncate">Back to {eventTitle}</span>
    </button>
  );
}
