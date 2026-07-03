"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { EventPlaybookTimelineEditor } from "@/components/event-workspace/EventPlaybookTimelineEditor";
import type { EventCommunicationStep } from "@/types/playbooks";

interface CollapsiblePlaybookTimelineEditorProps {
  eventId: string;
  steps: EventCommunicationStep[];
}

export function CollapsiblePlaybookTimelineEditor({
  eventId,
  steps,
}: CollapsiblePlaybookTimelineEditorProps) {
  const [open, setOpen] = useState(true);

  if (steps.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl border border-cos-border bg-cos-bg/40">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2">
          {open ? (
            <ChevronDown className="h-4 w-4 text-cos-muted" />
          ) : (
            <ChevronRight className="h-4 w-4 text-cos-muted" />
          )}
          <span className="text-sm font-medium text-cos-text">
            Customize playbook timing
          </span>
        </span>
        <span className="text-xs text-cos-muted">{steps.length} milestones</span>
      </button>

      {open && (
        <div className="border-t border-cos-border px-4 pb-4 pt-2">
          <EventPlaybookTimelineEditor eventId={eventId} steps={steps} embedded />
        </div>
      )}
    </div>
  );
}
