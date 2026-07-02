"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";

interface ArtworkV2AdjustModalProps {
  isSubmitting?: boolean;
  onClose: () => void;
  onGenerateUpdated: (feedback: string) => void;
}

export function ArtworkV2AdjustModal({
  isSubmitting = false,
  onClose,
  onGenerateUpdated,
}: ArtworkV2AdjustModalProps) {
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-cos-text/20 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="artwork-adjust-title"
        className="w-full max-w-lg rounded-2xl border border-cos-border bg-cos-card shadow-xl"
      >
        <div className="border-b border-cos-border px-6 py-5">
          <h2 id="artwork-adjust-title" className="text-lg font-semibold text-cos-text">
            What would you like changed?
          </h2>
        </div>

        <div className="px-6 py-5">
          <Textarea
            value={feedback}
            onChange={(event) => setFeedback(event.target.value)}
            placeholder="Describe what you'd like different — colors, layout, text, mood..."
            rows={6}
            className="min-h-[160px] resize-y"
            autoFocus
          />
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-cos-border px-6 py-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" disabled={isSubmitting} onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={isSubmitting || !feedback.trim()}
            onClick={() => onGenerateUpdated(feedback.trim())}
          >
            {isSubmitting ? "Generating…" : "Generate Updated Versions"}
          </Button>
        </div>
      </div>
    </div>
  );
}
