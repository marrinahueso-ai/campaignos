"use client";

import { displayDraftContent } from "@/lib/ai/content";
import { COMMUNICATION_CHANNELS } from "@/lib/event-workspace/constants";
import { Button } from "@/components/ui/Button";
import type { CommunicationItem } from "@/types/event-workspace";

interface CommunicationPreviewDialogProps {
  item: CommunicationItem;
  onClose: () => void;
}

function getChannelLabel(channel: CommunicationItem["channel"]): string {
  return (
    COMMUNICATION_CHANNELS.find((entry) => entry.channel === channel)?.label ??
    channel
  );
}

export function CommunicationPreviewDialog({
  item,
  onClose,
}: CommunicationPreviewDialogProps) {
  const content = displayDraftContent(item.latestContent);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-cos-text/20 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="communication-preview-title"
        className="w-full max-w-2xl rounded-2xl border border-cos-border bg-cos-card shadow-xl"
      >
        <div className="border-b border-cos-border px-6 py-5">
          <h2
            id="communication-preview-title"
            className="text-lg font-semibold text-cos-text"
          >
            {getChannelLabel(item.channel)} preview
          </h2>
          <p className="mt-1 text-sm text-cos-muted">
            Review how this message will read.
          </p>
        </div>

        <div className="max-h-[50vh] overflow-y-auto px-6 py-5">
          <div className="rounded-xl border border-cos-border bg-cos-bg/60 p-5 text-sm leading-7 text-cos-text whitespace-pre-wrap">
            {content ??
              "Nothing drafted yet. Use Draft on the message card when you're ready."}
          </div>
        </div>

        <div className="flex justify-end border-t border-cos-border px-6 py-4">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
