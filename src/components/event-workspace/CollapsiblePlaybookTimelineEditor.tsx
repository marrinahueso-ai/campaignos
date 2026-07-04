"use client";

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
  if (steps.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl border border-cos-border bg-cos-bg/40">
      <div className="flex w-full items-center justify-between gap-3 border-b border-cos-border px-4 py-3">
        <span className="text-sm font-medium text-cos-text">
          Customize playbook timing
        </span>
        <span className="text-xs text-cos-muted">{steps.length} milestones</span>
      </div>

      <div className="px-4 pb-4 pt-2">
        <EventPlaybookTimelineEditor eventId={eventId} steps={steps} embedded />
      </div>
    </div>
  );
}
