"use client";

import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface CaptionsPageHeaderProps {
  eventId: string;
  onSaveCaptions?: () => void;
  isSaving?: boolean;
  saveDisabled?: boolean;
}

export function CaptionsPageHeader({
  eventId,
  onSaveCaptions,
  isSaving = false,
  saveDisabled = false,
}: CaptionsPageHeaderProps) {
  return (
    <div className="space-y-5">
      <Link
        href={`/events/${eventId}`}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-cos-muted transition-colors hover:text-cos-text"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        Back to campaign
      </Link>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 max-w-2xl">
          <p className="studio-eyebrow">Social media</p>
          <h1 className="font-display mt-1.5 text-3xl text-cos-text sm:text-4xl">Captions</h1>
          <p className="mt-2 text-sm leading-relaxed text-cos-muted">
            Create custom captions for each milestone. Our AI suggests engaging copy based on
            your artwork, audience, and campaign goals.
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button
            href={`/events/${eventId}`}
            variant="secondary"
            size="sm"
            className="h-9 px-4"
          >
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            View campaign
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-9 px-4"
            onClick={onSaveCaptions}
            disabled={saveDisabled || isSaving}
          >
            {isSaving ? "Saving…" : "Save captions"}
          </Button>
        </div>
      </div>
    </div>
  );
}
